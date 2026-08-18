const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const mercadoPagoAccessToken = defineSecret("MERCADOPAGO_ACCESS_TOKEN");
const REGION = "southamerica-east1";
const SITE_URL = "https://semau.space";
const WEBHOOK_URL = "https://southamerica-east1-app-semau-ufrrj.cloudfunctions.net/mercadoPagoWebhook";

const TIPOS_INGRESSO = Object.freeze({
  normal: {
    nome: "Ingresso normal — XVI SEMAU",
    descricao: "Programação geral da semana e certificado",
    valor: 45,
  },
  kit: {
    nome: "Ingresso com kit — XVI SEMAU",
    descricao: "Ingresso completo com itens oficiais da edição",
    valor: 68,
  },
  kit_camisa: {
    nome: "Ingresso + kit + camisa — XVI SEMAU",
    descricao: "Combo completo da edição com desconto na camisa oficial",
    valor: 99,
  },
});

function texto(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function emailValido(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validarDados(data) {
  const tipo = ["normal", "kit", "kit_camisa"].includes(data.tipoIngresso) ? data.tipoIngresso : null;
  const nome = texto(data.nome, 120);
  const email = texto(data.email, 150).toLowerCase();
  const telefone = texto(data.telefone, 24);
  const instituicao = texto(data.instituicao, 120);
  const matricula = texto(data.matricula, 20).replace(/\D/g, "");
  const curso = texto(data.curso, 100);
  const periodo = texto(data.periodo, 30);

  if (!tipo) throw new HttpsError("invalid-argument", "Tipo de ingresso inválido.");
  const partesNome = nome.split(/\s+/).filter((parte) => parte.length >= 2);
  if (partesNome.length < 2) throw new HttpsError("invalid-argument", "Informe o nome completo, com nome e sobrenome.");
  if (!emailValido(email)) throw new HttpsError("invalid-argument", "Informe um e-mail válido.");
  if (telefone.replace(/\D/g, "").length < 10) throw new HttpsError("invalid-argument", "Informe um telefone válido.");
  if (!instituicao) throw new HttpsError("invalid-argument", "Informe a instituição.");
  if (!/^\d{11}$/.test(matricula)) throw new HttpsError("invalid-argument", "A matrícula deve conter exatamente 11 números.");
  if (!curso) throw new HttpsError("invalid-argument", "Informe o curso.");
  if (data.aceite !== true) throw new HttpsError("failed-precondition", "É necessário aceitar os termos da inscrição.");

  return { tipo, nome, email, telefone, instituicao, matricula, curso, periodo };
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

exports.criarPreferencia = onCall(
  { region: REGION, secrets: [mercadoPagoAccessToken], cors: [SITE_URL] },
  async (request) => {
    const dados = validarDados(request.data || {});
    const ingresso = TIPOS_INGRESSO[dados.tipo];
    const pedidoRef = db.collection("pedidos").doc();

    await pedidoRef.set({
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      instituicao: dados.instituicao,
      matricula: dados.matricula,
      curso: dados.curso,
      periodo: dados.periodo || null,
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
            id: dados.tipo,
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
            tipo_ingresso: dados.tipo,
          },
        }),
      });

      const checkoutUrl = preferencia.sandbox_init_point || preferencia.init_point;
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

exports.mercadoPagoWebhook = onRequest(
  { region: REGION, secrets: [mercadoPagoAccessToken], cors: false },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    const paymentId = String(request.body?.data?.id || request.query["data.id"] || request.query.id || "");
    if (!paymentId) {
      response.status(200).send("ignored");
      return;
    }

    try {
      const payment = await mercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`);
      const pedidoId = texto(payment.external_reference || payment.metadata?.pedido_id, 120);
      if (!pedidoId) {
        response.status(200).send("ignored");
        return;
      }

      const pedidoRef = db.collection("pedidos").doc(pedidoId);
      await db.runTransaction(async (transaction) => {
        const pedidoDoc = await transaction.get(pedidoRef);
        if (!pedidoDoc.exists) return;

        const pedido = pedidoDoc.data();
        const valorRecebido = Number(payment.transaction_amount || 0);
        const valorEsperado = Number(pedido.valor || 0);
        const statusRecebido = texto(payment.status, 40) || "unknown";
        const valorConfere = Math.abs(valorRecebido - valorEsperado) < 0.001;
        const statusSeguro = statusRecebido === "approved" && !valorConfere ? "manual_review" : statusRecebido;

        transaction.update(pedidoRef, {
          status: statusSeguro,
          paymentId: String(payment.id),
          paymentStatus: statusRecebido,
          paymentStatusDetail: texto(payment.status_detail, 100) || null,
          paymentMethod: texto(payment.payment_type_id, 60) || null,
          valorRecebido,
          valorConfere,
          pagoEm: payment.date_approved || null,
          atualizadoEm: FieldValue.serverTimestamp(),
          webhookProcessadoEm: FieldValue.serverTimestamp(),
        });
      });

      response.status(200).send("ok");
    } catch (error) {
      logger.error("Falha ao processar webhook", { paymentId, error: error.message });
      response.status(500).send("retry");
    }
  },
);