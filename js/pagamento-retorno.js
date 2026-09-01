import { app, db } from "./firebase-config.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import { deleteField, doc, getDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

async function garantirEmailDoIngresso(dadosPagamento) {
    if (!pedidoId || !dadosPagamento?.nome || !dadosPagamento?.email || !dadosPagamento?.token || !window.emailjs) return;

    const inscritoRef = doc(db, "inscritos", pedidoId);
    const [inscritoSnap, configuracaoSnap] = await Promise.all([
        getDoc(inscritoRef),
        getDoc(doc(db, "configuracoes", "emailIngresso"))
    ]);
    const inscrito = inscritoSnap.data() || {};
    const configuracao = configuracaoSnap.data() || {};
    if (inscrito.emailIngressoStatus === "enviado" || inscrito.emailIngressoEnviadoEm || configuracao.ativo !== true) return;

    const publicKey = String(configuracao.publicKey || "").trim();
    const serviceId = String(configuracao.serviceId || "").trim();
    const templateId = String(configuracao.templateId || "").trim();
    if (!publicKey || !serviceId || !templateId) return;

    try {
        await updateDoc(inscritoRef, {
            emailIngressoStatus: "enviando",
            emailIngressoTentativaEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
        });
        window.emailjs.init(publicKey);
        await window.emailjs.send(serviceId, templateId, {
            to_name: dadosPagamento.nome,
            to_email: dadosPagamento.email,
            user_token: dadosPagamento.token,
            site_url: "https://semau.space",
            instagram_url: "https://www.instagram.com/semauufrrj/"
        });
        await updateDoc(inscritoRef, {
            emailIngressoStatus: "enviado",
            emailIngressoEnviadoEm: serverTimestamp(),
            emailIngressoErro: deleteField(),
            atualizadoEm: serverTimestamp()
        });
    } catch (error) {
        await updateDoc(inscritoRef, {
            emailIngressoStatus: "falhou",
            emailIngressoErro: String(error?.text || error?.message || "Falha no envio pelo navegador").slice(0, 240),
            atualizadoEm: serverTimestamp()
        }).catch(() => {});
        console.error("Falha no envio alternativo do ingresso", error);
    }
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
        await garantirEmailDoIngresso(resposta.data);
    } catch (error) {
        console.error("Falha ao confirmar pagamento", error);
        credencialStatus.textContent = "A confirmação ainda está em processamento. Atualize esta página em alguns instantes.";
    }
}

confirmarPagamento();
