import { app } from "./firebase-config.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const parametros = new URLSearchParams(window.location.search);
const paymentId = parametros.get("payment_id") || parametros.get("collection_id");
const pedidoId = parametros.get("external_reference");
const referencia = document.getElementById("retorno-referencia");
const referenciaValor = document.getElementById("retorno-payment-id");
const credencial = document.getElementById("retorno-credencial");
const credencialToken = document.getElementById("retorno-token");
const credencialEmail = document.getElementById("retorno-email");
const credencialStatus = document.getElementById("retorno-confirmacao-status");

if (paymentId && referencia && referenciaValor) {
    referenciaValor.textContent = paymentId;
    referencia.hidden = false;
}

async function confirmarPagamento() {
    if (!paymentId || !pedidoId || !credencialStatus) return;
    const consultarPedido = httpsCallable(getFunctions(app, "southamerica-east1"), "consultarPedido");
    credencialStatus.textContent = "Confirmando seu pagamento e emitindo a credencial...";

    try {
        const resposta = await consultarPedido({ pedidoId, paymentId });
        if (!resposta.data?.aprovado || !resposta.data?.token) {
            credencialStatus.textContent = "O pagamento ainda está sendo processado. Você pode atualizar esta página em alguns instantes.";
            return;
        }

        if (credencialToken) credencialToken.textContent = resposta.data.token;
        if (credencialEmail) credencialEmail.textContent = resposta.data.email;
        if (credencial) credencial.hidden = false;
        credencialStatus.textContent = "Pagamento confirmado. Sua credencial já está liberada no app.";
    } catch (error) {
        console.error("Falha ao confirmar pagamento", error);
        credencialStatus.textContent = "A confirmação ainda está em processamento. Atualize esta página em alguns instantes.";
    }
}

confirmarPagamento();
