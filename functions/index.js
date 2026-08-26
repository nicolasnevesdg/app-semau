const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHmac, randomInt, timingSafeEqual } = require("node:crypto");

initializeApp();

const db = getFirestore();
const mercadoPagoAccessToken = defineSecret("MERCADOPAGO_ACCESS_TOKEN");
const mercadoPagoWebhookSecret = defineSecret("MERCADOPAGO_WEBHOOK_SECRET");
const SITE_ORIGINS = ["https://semau.space", "https://www.semau.space"];
const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REGION = "southamerica-east1";
const SITE_URL = "https://semau.space";
const WEBHOOK_URL = "https://southamerica-east1-app-semau-ufrrj.cloudfunctions.net/mercadoPagoWebhook";

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
  primeiro: Object.freeze({ nome: "1º Lote", normal: 20, kit: 40 }),
  segundo: Object.freeze({ nome: "2º Lote", normal: 25, kit: 45 }),
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

async function obterLoteAtivo() {
  const configuracao = await db.collection("configuracoes").doc("geral").get();
  return normalizarLoteAtivo(configuracao.data()?.loteIngressosAtivo);
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

async function processarPagamento(paymentId, pedidoEsperado = "") {
  const payment = await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`);
  const pedidoId = texto(payment.external_reference || payment.metadata?.pedido_id, 120);
  if (!pedidoId || (pedidoEsperado && pedidoId !== pedidoEsperado)) {
    throw new Error("O pagamento não pertence ao pedido informado.");
  }

  const pedidoRef = db.collection("pedidos").doc(pedidoId);
  const inscritoRef = db.collection("inscritos").doc(pedidoId);
  const tokenNovo = await gerarTokenIngresso();

  return db.runTransaction(async (transaction) => {
    const [pedidoDoc, inscritoDoc] = await Promise.all([
      transaction.get(pedidoRef),
      transaction.get(inscritoRef),
    ]);
    if (!pedidoDoc.exists) throw new Error("Pedido não encontrado.");

    const pedido = pedidoDoc.data();
    const valorRecebido = Number(payment.transaction_amount || 0);
    const valorEsperado = Number(pedido.valor || 0);
    const moedaRecebida = texto(payment.currency_id, 8).toUpperCase();
    const statusRecebido = texto(payment.status, 40) || "unknown";
    const valorConfere = Math.abs(valorRecebido - valorEsperado) < 0.001;
    const moedaConfere = moedaRecebida === "BRL";
    const pagamentoAprovado = statusRecebido === "approved" && valorConfere && moedaConfere;
    const statusSeguro = statusRecebido === "approved" && !pagamentoAprovado
      ? "manual_review"
      : statusRecebido;
    const token = inscritoDoc.exists ? inscritoDoc.data().token : tokenNovo;

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

    return {
      pedidoId,
      status: statusSeguro,
      aprovado: pagamentoAprovado,
      token: pagamentoAprovado ? token : null,
      nome: pagamentoAprovado ? pedido.nome : null,
      email: pagamentoAprovado ? pedido.email : null,
    };
  });
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
    const loteAtivo = await obterLoteAtivo();
    if (loteAtivo === "social") {
      throw new HttpsError("failed-precondition", "O Lote Social é realizado pelo formulário de comprovação.");
    }
    if (dados.lote !== loteAtivo) {
      throw new HttpsError("failed-precondition", "Este lote não está disponível no momento.");
    }
    const ingresso = obterIngresso(dados.lote, dados.tipo);
    const pedidoRef = db.collection("pedidos").doc();

    await pedidoRef.set({
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
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    try {
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

      return { pedidoId: pedidoRef.id, checkoutUrl };
    } catch (error) {
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
    secrets: [mercadoPagoAccessToken],
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
    secrets: [mercadoPagoAccessToken, mercadoPagoWebhookSecret],
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
