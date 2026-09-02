const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHmac, randomInt, timingSafeEqual } = require("node:crypto");

initializeApp();

const db = getFirestore();
const mercadoPagoAccessToken = defineSecret("MERCADOPAGO_ACCESS_TOKEN");
const mercadoPagoWebhookSecret = defineSecret("MERCADOPAGO_WEBHOOK_SECRET");
const emailJsPrivateKey = defineSecret("EMAILJS_PRIVATE_KEY");
const SITE_ORIGINS = ["https://semau.space", "https://www.semau.space"];
const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REGION = "southamerica-east1";
const SITE_URL = "https://semau.space";
const WEBHOOK_URL = "https://southamerica-east1-app-semau-ufrrj.cloudfunctions.net/mercadoPagoWebhook";
const FORMULARIO_LOTE_SOCIAL = "https://docs.google.com/forms/d/e/1FAIpQLSdkiRquBCk0dKTqJTZsCi2EzDCho3N2kuYUU9unm8LOmzRxPw/viewform";
const ABERTURA_LOTE_SOCIAL = Date.parse("2026-09-01T12:00:00-03:00");
const ENCERRAMENTO_LOTE_SOCIAL = Date.parse("2026-09-01T15:00:00-03:00");
const LIMITE_PRIMEIRO_LOTE = Object.freeze({ normal: 10, kit: 10 });
const LIMITE_KIT_SEGUNDO_LOTE = 60;
const DURACAO_CHECKOUT_MS = 7 * 60 * 1000;
const DURACAO_RESERVA_ANTIGA_MS = 60 * 60 * 1000;
const DURACAO_RESERVA_MS = DURACAO_CHECKOUT_MS;
const STATUS_FINAIS_SEM_PAGAMENTO = new Set(["rejected", "cancelled", "refunded", "charged_back"]);
const configuracaoGeralRef = db.collection("configuracoes").doc("geral");
const estoqueIngressosRef = db.collection("configuracoes").doc("estoqueIngressos");

const TIPOS_INGRESSO = Object.freeze({
  normal: Object.freeze({
    nome: "Ingresso normal",
    descricao: "Programação geral da semana e certificado",
  }),
  kit: Object.freeze({
    nome: "Ingresso com kit",
    descricao: "Ingresso completo com itens oficiais da edição",
  }),
});
const LOTES_PAGOS = Object.freeze({
  primeiro: Object.freeze({ nome: "1º Lote", normal: 25, kit: 40 }),
  segundo: Object.freeze({ nome: "2º Lote", normal: 30, kit: 45 }),
});
const LOTE_ATIVO_PADRAO = "social";

function texto(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function emailValido(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizarLoteAtivo(value) {
  const lote = texto(value, 20).toLowerCase();
  return lote === "social" || LOTES_PAGOS[lote] ? lote : LOTE_ATIVO_PADRAO;
}

function numeroSeguro(value) {
  const numero = Number(value);
  return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 0;
}

function normalizarEstoque(dados = {}, agora = Date.now(), lote = "primeiro") {
  const estoqueLote = dados[lote] || {};
  const reservas = {};
  Object.entries(estoqueLote.reservas || {}).forEach(([pedidoId, reserva]) => {
    const expiraEmOriginal = Number(reserva?.expiraEm || 0);
    const criadaEm = Number(reserva?.criadaEm || 0) || expiraEmOriginal - DURACAO_RESERVA_ANTIGA_MS;
    const expiraEm = Math.min(expiraEmOriginal, criadaEm + DURACAO_RESERVA_MS);
    if (
      (reserva?.tipo === "normal" || reserva?.tipo === "kit") &&
      expiraEm > agora
    ) {
      reservas[pedidoId] = { tipo: reserva.tipo, criadaEm, expiraEm };
    }
  });
  const limites = lote === "primeiro"
    ? LIMITE_PRIMEIRO_LOTE
    : { normal: null, kit: LIMITE_KIT_SEGUNDO_LOTE };
  return {
    normalVendidos: numeroSeguro(estoqueLote.normalVendidos),
    kitVendidos: numeroSeguro(estoqueLote.kitVendidos),
    normalLimite: limites.normal,
    kitLimite: limites.kit,
    reservas,
  };
}

function quantidadeReservada(estoque, tipo) {
  return Object.values(estoque.reservas).filter((reserva) => reserva.tipo === tipo).length;
}

function primeiroLoteEsgotado(estoque) {
  return estoque.normalVendidos >= LIMITE_PRIMEIRO_LOTE.normal &&
    estoque.kitVendidos >= LIMITE_PRIMEIRO_LOTE.kit;
}

function calcularLoteAtivo(configuracao = {}, estoque = {}, agora = Date.now()) {
  if (agora < ABERTURA_LOTE_SOCIAL) return null;
  if (agora < ENCERRAMENTO_LOTE_SOCIAL) return "social";
  const loteLegado = ({ 1: "primeiro", 2: "segundo" })[Number(configuracao.loteAtivo)];
  const loteConfigurado = normalizarLoteAtivo(configuracao.loteIngressosAtivo || loteLegado);
  if (primeiroLoteEsgotado(estoque) || loteConfigurado === "segundo") return "segundo";
  return "primeiro";
}

function obterIngresso(lote, tipo) {
  const loteConfigurado = LOTES_PAGOS[lote];
  const tipoConfigurado = TIPOS_INGRESSO[tipo];
  if (!loteConfigurado || !tipoConfigurado) return null;
  return {
    nome: `${tipoConfigurado.nome} — ${loteConfigurado.nome} — XVI SEMAU`,
    descricao: tipoConfigurado.descricao,
    valor: loteConfigurado[tipo],
    nomeLote: loteConfigurado.nome,
  };
}

function validarDados(data) {
  const lote = LOTES_PAGOS[data.loteIngresso] ? data.loteIngresso : null;
  const tipo = TIPOS_INGRESSO[data.tipoIngresso] ? data.tipoIngresso : null;
  const nome = texto(data.nome, 120);
  const email = texto(data.email, 150).toLowerCase();
  const telefone = texto(data.telefone, 24);
  const instituicao = texto(data.instituicao, 120);
  const matricula = texto(data.matricula, 20).replace(/\D/g, "");
  const curso = texto(data.curso, 100);
  const periodo = texto(data.periodo, 30);

  if (!lote) throw new HttpsError("invalid-argument", "Lote de ingresso inválido.");
  if (!tipo) throw new HttpsError("invalid-argument", "Tipo de ingresso inválido.");
  const partesNome = nome.split(/\s+/).filter((parte) => parte.length >= 2);
  if (partesNome.length < 2) throw new HttpsError("invalid-argument", "Informe o nome completo, com nome e sobrenome.");
  if (!emailValido(email)) throw new HttpsError("invalid-argument", "Informe um e-mail válido.");
  if (telefone.replace(/\D/g, "").length < 10) throw new HttpsError("invalid-argument", "Informe um telefone válido.");
  if (!instituicao) throw new HttpsError("invalid-argument", "Informe a instituição.");
  if (!/^\d{11}$/.test(matricula)) throw new HttpsError("invalid-argument", "A matrícula deve conter exatamente 11 números.");
  if (!curso) throw new HttpsError("invalid-argument", "Informe o curso.");
  if (data.aceite !== true) throw new HttpsError("failed-precondition", "É necessário aceitar os termos da inscrição.");

  return { lote, tipo, nome, email, telefone, instituicao, matricula, curso, periodo };
}

function dadosPedido(dados, ingresso, expiraEm) {
  const reservaEstoque = dados.lote === "primeiro" || (dados.lote === "segundo" && dados.tipo === "kit");
  return {
    nome: dados.nome,
    email: dados.email,
    telefone: dados.telefone,
    instituicao: dados.instituicao,
    matricula: dados.matricula,
    curso: dados.curso,
    periodo: dados.periodo || null,
    loteIngresso: dados.lote,
    nomeLote: ingresso.nomeLote,
    tipoIngresso: dados.tipo,
    nomeIngresso: ingresso.nome,
    valor: ingresso.valor,
    moeda: "BRL",
    status: "creating_preference",
    origem: "site",
    reservaEstoque,
    reservaExpiraEm: reservaEstoque ? expiraEm : null,
    checkoutExpiraEm: expiraEm,
    estoqueContabilizado: false,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  };
}

async function localizarCompraExistente(dados, permitirCompraAdicional = false) {
  const [inscritosSnapshot, pedidosSnapshot] = await Promise.all([
    db.collection("inscritos").where("email", "==", dados.email).limit(10).get(),
    db.collection("pedidos").where("email", "==", dados.email).limit(20).get(),
  ]);

  const ingressoPagoAtivo = inscritosSnapshot.docs.some((documento) => {
    const inscrito = documento.data();
    return Boolean(inscrito.pedidoId) &&
      inscrito.statusPagamento === "approved" &&
      inscrito.ingressoAtivo !== false;
  }) || pedidosSnapshot.docs.some((documento) => documento.data().status === "approved");
  if (ingressoPagoAtivo && !permitirCompraAdicional) {
    throw new HttpsError(
      "failed-precondition",
      "Já existe um ingresso pago e ativo para este e-mail.",
      { motivo: "ingresso-ativo" },
    );
  }

  const agora = Date.now();
  const pedidoPendente = pedidosSnapshot.docs
    .map((documento) => ({ id: documento.id, ...documento.data() }))
    .filter((pedido) => pedido.status === "pending" || pedido.status === "creating_preference")
    .filter((pedido) => pedido.loteIngresso === dados.lote && pedido.tipoIngresso === dados.tipo)
    .filter((pedido) => Number(pedido.checkoutExpiraEm || pedido.reservaExpiraEm || 0) > agora && pedido.preferenceId)
    .sort((a, b) => Number(b.checkoutExpiraEm || b.reservaExpiraEm || 0) - Number(a.checkoutExpiraEm || a.reservaExpiraEm || 0))[0];

  if (!pedidoPendente) return null;
  try {
    const preferencia = await mercadoPago(`/checkout/preferences/${encodeURIComponent(pedidoPendente.preferenceId)}`);
    const tokenDeTeste = mercadoPagoAccessToken.value().startsWith("TEST-");
    const checkoutUrl = tokenDeTeste ? preferencia.sandbox_init_point : preferencia.init_point;
    if (!checkoutUrl) return null;
    return {
      pedidoId: pedidoPendente.id,
      checkoutUrl,
      reservaExpiraEm: Number(pedidoPendente.checkoutExpiraEm || pedidoPendente.reservaExpiraEm),
      reutilizado: true,
    };
  } catch (error) {
    logger.warn("Não foi possível reutilizar o checkout pendente", { pedidoId: pedidoPendente.id, error: error.message });
    return null;
  }
}

async function criarPedidoComReserva(pedidoRef, dados, ingresso) {
  const agora = Date.now();
  const expiraEm = agora + DURACAO_RESERVA_MS;

  await db.runTransaction(async (transaction) => {
    const [configuracaoDoc, estoqueDoc] = await Promise.all([
      transaction.get(configuracaoGeralRef),
      transaction.get(estoqueIngressosRef),
    ]);
    const dadosEstoque = estoqueDoc.data() || {};
    const estoquePrimeiro = normalizarEstoque(dadosEstoque, agora, "primeiro");
    const estoqueSegundo = normalizarEstoque(dadosEstoque, agora, "segundo");
    const loteAtivo = calcularLoteAtivo(configuracaoDoc.data() || {}, estoquePrimeiro, agora);

    if (loteAtivo === null) {
      throw new HttpsError("failed-precondition", "As inscrições abrem em 01/09, ao meio-dia.");
    }
    if (loteAtivo === "social") {
      throw new HttpsError("failed-precondition", "O Lote Social é realizado pelo formulário de comprovação.");
    }
    if (dados.lote !== loteAtivo) {
      throw new HttpsError("failed-precondition", "Este lote não está disponível no momento.");
    }

    if (dados.lote === "primeiro") {
      const vendidos = dados.tipo === "kit" ? estoquePrimeiro.kitVendidos : estoquePrimeiro.normalVendidos;
      const ocupados = vendidos + quantidadeReservada(estoquePrimeiro, dados.tipo);
      if (ocupados >= LIMITE_PRIMEIRO_LOTE[dados.tipo]) {
        throw new HttpsError("resource-exhausted", `Os ingressos ${dados.tipo === "kit" ? "com kit" : "sem kit"} do 1º lote estão esgotados.`);
      }
      estoquePrimeiro.reservas[pedidoRef.id] = { tipo: dados.tipo, criadaEm: agora, expiraEm };
      transaction.set(estoqueIngressosRef, { primeiro: estoquePrimeiro, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    }

    if (dados.lote === "segundo" && dados.tipo === "kit") {
      const ocupados = estoqueSegundo.kitVendidos + quantidadeReservada(estoqueSegundo, "kit");
      if (ocupados >= LIMITE_KIT_SEGUNDO_LOTE) {
        throw new HttpsError("resource-exhausted", "Os ingressos com kit do 2º lote estão esgotados.");
      }
      estoqueSegundo.reservas[pedidoRef.id] = { tipo: "kit", criadaEm: agora, expiraEm };
      transaction.set(estoqueIngressosRef, { segundo: estoqueSegundo, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    }

    transaction.set(pedidoRef, dadosPedido(dados, ingresso, expiraEm));
  });

  return expiraEm;
}

async function liberarReserva(pedidoId) {
  await db.runTransaction(async (transaction) => {
    const estoqueDoc = await transaction.get(estoqueIngressosRef);
    const dadosEstoque = estoqueDoc.data() || {};
    const estoquePrimeiro = normalizarEstoque(dadosEstoque, Date.now(), "primeiro");
    const estoqueSegundo = normalizarEstoque(dadosEstoque, Date.now(), "segundo");
    let mudou = false;
    if (estoquePrimeiro.reservas[pedidoId]) {
      delete estoquePrimeiro.reservas[pedidoId];
      mudou = true;
    }
    if (estoqueSegundo.reservas[pedidoId]) {
      delete estoqueSegundo.reservas[pedidoId];
      mudou = true;
    }
    if (!mudou) return;
    transaction.set(estoqueIngressosRef, {
      primeiro: estoquePrimeiro,
      segundo: estoqueSegundo,
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function mercadoPago(path, options = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${mercadoPagoAccessToken.value()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("Erro do Mercado Pago", { status: response.status, body });
    throw new Error(`Mercado Pago respondeu com status ${response.status}`);
  }
  return body;
}

async function gerarTokenIngresso() {
  for (let tentativa = 0; tentativa < 12; tentativa += 1) {
    let token = "";
    for (let indice = 0; indice < 5; indice += 1) {
      token += TOKEN_CHARS[randomInt(TOKEN_CHARS.length)];
    }
    const existente = await db.collection("inscritos").where("token", "==", token).limit(1).get();
    if (existente.empty) return token;
  }
  throw new Error("Não foi possível gerar um token único para o ingresso.");
}

function statusMantemIngressoAtivo(status) {
  return status === "approved";
}

function assinaturaWebhookValida(xSignature, xRequestId, dataId, secret) {
  const partes = String(xSignature || "").split(",");
  const valores = {};
  partes.forEach((parte) => {
    const [chave, valor] = parte.split("=", 2).map((item) => item?.trim());
    if (chave && valor) valores[chave] = valor;
  });

  if (!valores.ts || !/^[a-f0-9]{64}$/i.test(valores.v1 || "") || !dataId || !xRequestId || !secret) {
    return false;
  }

  const idNormalizado = String(dataId).toLowerCase();
  const manifesto = `id:${idNormalizado};request-id:${xRequestId};ts:${valores.ts};`;
  const calculada = Buffer.from(createHmac("sha256", secret).update(manifesto).digest("hex"), "hex");
  const recebida = Buffer.from(valores.v1, "hex");
  return calculada.length === recebida.length && timingSafeEqual(calculada, recebida);
}

async function enviarEmailIngressoSeNecessario({ pedidoId, nome, email, token }) {
  const configuracaoDoc = await db.collection("configuracoes").doc("emailIngresso").get();
  const configuracao = configuracaoDoc.data() || {};
  const publicKey = texto(configuracao.publicKey, 160);
  const serviceId = texto(configuracao.serviceId, 120);
  const templateId = texto(configuracao.templateId, 120);
  if (configuracao.ativo !== true || !publicKey || !serviceId || !templateId) {
    return { status: "desativado" };
  }

  const inscritoRef = db.collection("inscritos").doc(pedidoId);
  const reservado = await db.runTransaction(async (transaction) => {
    const inscritoDoc = await transaction.get(inscritoRef);
    if (!inscritoDoc.exists) return false;
    const dados = inscritoDoc.data();
    if (dados.emailIngressoStatus === "enviado") return false;
    const tentativaAnterior = dados.emailIngressoTentativaEm?.toMillis?.() || 0;
    if (dados.emailIngressoStatus === "enviando" && Date.now() - tentativaAnterior < 5 * 60 * 1000) return false;
    transaction.update(inscritoRef, {
      emailIngressoStatus: "enviando",
      emailIngressoTentativaEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!reservado) return { status: "ignorado" };

  try {
    const resposta = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: emailJsPrivateKey.value(),
        template_params: {
          to_name: nome,
          to_email: email,
          user_token: token,
          site_url: SITE_URL,
          instagram_url: "https://www.instagram.com/semauufrrj/",
        },
      }),
    });
    if (!resposta.ok) {
      const detalhe = texto(await resposta.text(), 240);
      throw new Error("EmailJS respondeu com status " + resposta.status + ": " + detalhe);
    }
    await inscritoRef.update({
      emailIngressoStatus: "enviado",
      emailIngressoEnviadoEm: FieldValue.serverTimestamp(),
      emailIngressoErro: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return { status: "enviado" };
  } catch (error) {
    await inscritoRef.update({
      emailIngressoStatus: "falhou",
      emailIngressoErro: texto(error.message, 240),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    throw error;
  }
}
async function processarPagamento(paymentId, pedidoEsperado = "") {
  const payment = await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`);
  const pedidoId = texto(payment.external_reference || payment.metadata?.pedido_id, 120);
  if (!pedidoId || (pedidoEsperado && pedidoId !== pedidoEsperado)) {
    throw new Error("O pagamento não pertence ao pedido informado.");
  }

  const pedidoRef = db.collection("pedidos").doc(pedidoId);
  const inscritoRef = db.collection("inscritos").doc(pedidoId);
  const tokenNovo = await gerarTokenIngresso();

  const resultado = await db.runTransaction(async (transaction) => {
    const [pedidoDoc, inscritoDoc, estoqueDoc] = await Promise.all([
      transaction.get(pedidoRef),
      transaction.get(inscritoRef),
      transaction.get(estoqueIngressosRef),
    ]);
    if (!pedidoDoc.exists) throw new Error("Pedido não encontrado.");

    const pedido = pedidoDoc.data();
    const dadosEstoque = estoqueDoc.data() || {};
    const estoquePrimeiro = normalizarEstoque(dadosEstoque, Date.now(), "primeiro");
    const estoqueSegundo = normalizarEstoque(dadosEstoque, Date.now(), "segundo");
    const valorRecebido = Number(payment.transaction_amount || 0);
    const valorEsperado = Number(pedido.valor || 0);
    const moedaRecebida = texto(payment.currency_id, 8).toUpperCase();
    const statusRecebido = texto(payment.status, 40) || "unknown";
    const valorConfere = Math.abs(valorRecebido - valorEsperado) < 0.001;
    const moedaConfere = moedaRecebida === "BRL";
    const aprovadoPeloPagamento = statusRecebido === "approved" && valorConfere && moedaConfere;
    let pagamentoAprovado = aprovadoPeloPagamento;
    let estornoNecessario = false;
    let estoqueMudou = false;
    let estoqueContabilizado = pedido.estoqueContabilizado === true;
    let statusSeguro = statusRecebido === "approved" && !aprovadoPeloPagamento
      ? "manual_review"
      : statusRecebido;
    const token = inscritoDoc.exists ? inscritoDoc.data().token : tokenNovo;
    const tipoEstoque = pedido.tipoIngresso === "kit" ? "kit" : "normal";
    const chaveVendidos = tipoEstoque === "kit" ? "kitVendidos" : "normalVendidos";
    const loteEstoque = pedido.loteIngresso === "primeiro"
      ? "primeiro"
      : pedido.loteIngresso === "segundo" && tipoEstoque === "kit"
        ? "segundo"
        : null;
    const estoquePedido = loteEstoque === "primeiro"
      ? estoquePrimeiro
      : loteEstoque === "segundo"
        ? estoqueSegundo
        : null;
    const limiteEstoque = loteEstoque === "primeiro"
      ? LIMITE_PRIMEIRO_LOTE[tipoEstoque]
      : loteEstoque === "segundo"
        ? LIMITE_KIT_SEGUNDO_LOTE
        : null;

    if (pagamentoAprovado && !inscritoDoc.exists && estoquePedido && !estoqueContabilizado) {
      const temReserva = Boolean(estoquePedido.reservas[pedidoId]);
      const reservasAtivas = quantidadeReservada(estoquePedido, tipoEstoque);
      const limiteOcupado = estoquePedido[chaveVendidos] >= limiteEstoque ||
        (!temReserva && estoquePedido[chaveVendidos] + reservasAtivas >= limiteEstoque);
      if (limiteOcupado) {
        pagamentoAprovado = false;
        estornoNecessario = true;
        statusSeguro = "refund_required_stock_limit";
        if (estoquePedido.reservas[pedidoId]) {
          delete estoquePedido.reservas[pedidoId];
          estoqueMudou = true;
        }
      } else {
        estoquePedido[chaveVendidos] += 1;
        estoqueContabilizado = true;
        estoqueMudou = true;
      }
    }

    if (STATUS_FINAIS_SEM_PAGAMENTO.has(statusRecebido) && estoquePedido) {
      if (estoquePedido.reservas[pedidoId]) {
        delete estoquePedido.reservas[pedidoId];
        estoqueMudou = true;
      }
      if (estoqueContabilizado && inscritoDoc.exists) {
        estoquePedido[chaveVendidos] = Math.max(0, estoquePedido[chaveVendidos] - 1);
        estoqueContabilizado = false;
        estoqueMudou = true;
      }
    } else if (pagamentoAprovado && estoquePedido?.reservas[pedidoId]) {
      delete estoquePedido.reservas[pedidoId];
      estoqueMudou = true;
    }

    transaction.update(pedidoRef, {
      status: statusSeguro,
      paymentId: String(payment.id),
      paymentStatus: statusRecebido,
      paymentStatusDetail: texto(payment.status_detail, 100) || null,
      paymentMethod: texto(payment.payment_type_id, 60) || null,
      valorRecebido,
      valorConfere,
      moedaRecebida: moedaRecebida || null,
      moedaConfere,
      credencialEmitida: pagamentoAprovado,
      token: pagamentoAprovado ? token : pedido.token || null,
      estoqueContabilizado,
      pagoEm: payment.date_approved || null,
      atualizadoEm: FieldValue.serverTimestamp(),
      webhookProcessadoEm: FieldValue.serverTimestamp(),
    });

    if (pagamentoAprovado && !inscritoDoc.exists) {
      transaction.set(inscritoRef, {
        nome: pedido.nome,
        email: pedido.email,
        telefone: pedido.telefone || null,
        instituicao: pedido.instituicao || null,
        matricula: pedido.matricula || null,
        curso: pedido.curso || null,
        periodo: pedido.periodo || null,
        loteIngresso: pedido.loteIngresso || null,
        nomeLote: pedido.nomeLote || null,
        tipoIngresso: pedido.tipoIngresso,
        nomeIngresso: pedido.nomeIngresso,
        pedidoId,
        paymentId: String(payment.id),
        token,
        pontos: 0,
        oficinas: [],
        ingressoAtivo: true,
        statusPagamento: statusRecebido,
        d21_m: false, d21_t: false,
        d22_m: false, d22_t: false,
        d23_m: false, d23_t: false,
        d24_m: false, d24_t: false,
        d25_m: false, d25_t: false,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    } else if (inscritoDoc.exists) {
      transaction.update(inscritoRef, {
        ingressoAtivo: statusMantemIngressoAtivo(statusSeguro) && valorConfere && moedaConfere,
        statusPagamento: statusRecebido,
        paymentId: String(payment.id),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    if (estoqueMudou) {
      transaction.set(estoqueIngressosRef, {
        primeiro: estoquePrimeiro,
        segundo: estoqueSegundo,
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      if (primeiroLoteEsgotado(estoquePrimeiro)) {
        transaction.set(configuracaoGeralRef, {
          loteIngressosAtivo: "segundo",
          loteAtivo: 2,
          faseAtual: "inscricao",
          atualizadoEm: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    return {
      pedidoId,
      status: statusSeguro,
      aprovado: pagamentoAprovado,
      token: pagamentoAprovado ? token : null,
      nome: pagamentoAprovado ? pedido.nome : null,
      email: pagamentoAprovado ? pedido.email : null,
      estornoNecessario,
    };
  });

  if (resultado.estornoNecessario) {
    try {
      await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
        method: "POST",
        headers: { "X-Idempotency-Key": `estoque-${pedidoId}` },
        body: "{}",
      });
      await pedidoRef.update({
        status: "refunded_stock_limit",
        credencialEmitida: false,
        estornadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      resultado.status = "refunded_stock_limit";
    } catch (error) {
      logger.error("Falha ao estornar pagamento acima do estoque", { pedidoId, paymentId, error: error.message });
      await pedidoRef.update({
        status: "manual_refund_required",
        credencialEmitida: false,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      resultado.status = "manual_refund_required";
    }
  }

  if (resultado.aprovado) {
    try {
      await enviarEmailIngressoSeNecessario(resultado);
    } catch (error) {
      logger.error("Falha ao enviar e-mail do ingresso", { pedidoId, error: error.message });
    }
  }

  delete resultado.estornoNecessario;
  return resultado;
}

exports.criarPreferencia = onCall(
  {
    region: REGION,
    maxInstances: 2,
    secrets: [mercadoPagoAccessToken],
    cors: SITE_ORIGINS,
  },
  async (request) => {
    const dados = validarDados(request.data || {});
    const ingresso = obterIngresso(dados.lote, dados.tipo);
    const compraExistente = await localizarCompraExistente(
      dados,
      request.data?.permitirCompraAdicional === true,
    );
    if (compraExistente) return compraExistente;
    const pedidoRef = db.collection("pedidos").doc();
    const reservaExpiraEm = await criarPedidoComReserva(pedidoRef, dados, ingresso);

    try {
      const agora = Date.now();
      const preferencia = await mercadoPago("/checkout/preferences", {
        method: "POST",
        body: JSON.stringify({
          items: [{
            id: `${dados.lote}_${dados.tipo}`,
            title: ingresso.nome,
            description: ingresso.descricao,
            quantity: 1,
            currency_id: "BRL",
            unit_price: ingresso.valor,
          }],
          payer: {
            name: dados.nome,
            email: dados.email,
            phone: { number: dados.telefone.replace(/\D/g, "") },
          },
          back_urls: {
            success: `${SITE_URL}/pagamento-sucesso.html`,
            pending: `${SITE_URL}/pagamento-pendente.html`,
            failure: `${SITE_URL}/pagamento-falhou.html`,
          },
          auto_return: "approved",
          expires: true,
          expiration_date_from: new Date(agora).toISOString(),
          expiration_date_to: new Date(reservaExpiraEm).toISOString(),
          notification_url: WEBHOOK_URL,
          external_reference: pedidoRef.id,
          statement_descriptor: "SEMAU 2026",
          metadata: {
            pedido_id: pedidoRef.id,
            lote_ingresso: dados.lote,
            tipo_ingresso: dados.tipo,
          },
        }),
      });

      const tokenDeTeste = mercadoPagoAccessToken.value().startsWith("TEST-");
      const checkoutUrl = tokenDeTeste ? preferencia.sandbox_init_point : preferencia.init_point;
      if (!checkoutUrl) throw new Error("Preferência criada sem URL de checkout.");

      await pedidoRef.update({
        status: "pending",
        preferenceId: preferencia.id,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      return { pedidoId: pedidoRef.id, checkoutUrl, reservaExpiraEm };
    } catch (error) {
      await liberarReserva(pedidoRef.id).catch((erroReserva) => {
        logger.error("Falha ao liberar reserva de estoque", { pedidoId: pedidoRef.id, error: erroReserva.message });
      });
      await pedidoRef.update({
        status: "preference_error",
        erro: texto(error.message, 240),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      throw new HttpsError("internal", "Não foi possível iniciar o pagamento. Tente novamente.");
    }
  },
);

exports.consultarPedido = onCall(
  {
    region: REGION,
    maxInstances: 2,
    secrets: [mercadoPagoAccessToken, emailJsPrivateKey],
    cors: SITE_ORIGINS,
  },
  async (request) => {
    const pedidoId = texto(request.data?.pedidoId, 120);
    const paymentId = texto(request.data?.paymentId, 80);
    if (!pedidoId || !paymentId) {
      throw new HttpsError("invalid-argument", "Referência de pagamento incompleta.");
    }

    try {
      return await processarPagamento(paymentId, pedidoId);
    } catch (error) {
      logger.error("Falha ao consultar pedido", { pedidoId, paymentId, error: error.message });
      throw new HttpsError("failed-precondition", "O pagamento ainda não pôde ser confirmado.");
    }
  },
);

exports.mercadoPagoWebhook = onRequest(
  {
    region: REGION,
    maxInstances: 2,
    secrets: [mercadoPagoAccessToken, mercadoPagoWebhookSecret, emailJsPrivateKey],
    cors: false,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    if (request.body?.type && request.body.type !== "payment") {
      response.status(200).send("ignored");
      return;
    }

    const paymentId = String(request.query["data.id"] || request.body?.data?.id || request.query.id || "");
    if (!paymentId) {
      response.status(200).send("ignored");
      return;
    }

    const assinaturaValida = assinaturaWebhookValida(
      request.get("x-signature"),
      request.get("x-request-id"),
      paymentId,
      mercadoPagoWebhookSecret.value(),
    );
    if (!assinaturaValida) {
      logger.warn("Webhook do Mercado Pago com assinatura inválida", { paymentId });
      response.status(401).send("invalid signature");
      return;
    }

    try {
      await processarPagamento(paymentId);
      response.status(200).send("ok");
    } catch (error) {
      logger.error("Falha ao processar webhook", { paymentId, error: error.message });
      response.status(500).send("retry");
    }
  },
);

async function prepararAbertura(loteIngressosAtivo) {
  await db.runTransaction(async (transaction) => {
    const estoqueDoc = await transaction.get(estoqueIngressosRef);
    const estoque = normalizarEstoque(estoqueDoc.data() || {});
    transaction.set(estoqueIngressosRef, { primeiro: estoque, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(configuracaoGeralRef, {
      faseAtual: "inscricao",
      loteIngressosAtivo,
      loteAtivo: loteIngressosAtivo === "social" ? 0 : 1,
      formularioLoteSocial: FORMULARIO_LOTE_SOCIAL,
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

function eventoDe2026() {
  const ano = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());
  return ano === "2026";
}

exports.abrirLoteSocial = onSchedule(
  {
    region: REGION,
    schedule: "0 12 1 9 *",
    timeZone: "America/Sao_Paulo",
    maxInstances: 1,
  },
  async () => {
    if (!eventoDe2026()) return;
    await prepararAbertura("social");
    logger.info("Lote Social aberto automaticamente.");
  },
);

exports.abrirPrimeiroLote = onSchedule(
  {
    region: REGION,
    schedule: "0 15 1 9 *",
    timeZone: "America/Sao_Paulo",
    maxInstances: 1,
  },
  async () => {
    if (!eventoDe2026()) return;
    await prepararAbertura("primeiro");
    logger.info("1º lote aberto automaticamente.");
  },
);
