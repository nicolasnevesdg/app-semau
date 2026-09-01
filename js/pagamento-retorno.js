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
const retornoEtiqueta = document.querySelector(".retorno-etiqueta");
const retornoTitulo = document.querySelector(".retorno-corpo h1");
const retornoMensagem = document.querySelector(".retorno-mensagem");
const retornoIcone = document.querySelector(".retorno-status-icone");
const retornoPassos = document.querySelectorAll(".retorno-passos article");
const paginaSucesso = document.body.classList.contains("pagamento-sucesso");
const paginaPendente = document.body.classList.contains("pagamento-pendente");
const paginaFalhou = document.body.classList.contains("pagamento-falhou");
const STATUS_FALHA = new Set(["rejected", "cancelled", "refunded", "charged_back", "refunded_stock_limit"]);

if (paymentId && referencia && referenciaValor) {
    referenciaValor.textContent = paymentId;
    referencia.hidden = false;
}

function redirecionarPara(arquivo) {
    const consulta = parametros.toString();
    window.location.replace(`${arquivo}${consulta ? `?${consulta}` : ""}`);
}

function mostrarVerificacao() {
    if (paginaSucesso) {
        if (credencialStatus) credencialStatus.textContent = "Confirmando seu pagamento e emitindo a credencial...";
        return;
    }
    if (retornoEtiqueta) retornoEtiqueta.textContent = "Verificando pagamento";
    if (retornoTitulo) retornoTitulo.textContent = "Só um instante.";
    if (retornoMensagem) retornoMensagem.textContent = "Estamos consultando o Mercado Pago para mostrar o estado mais recente da sua compra.";
}

function mostrarFalhaConfirmada() {
    if (retornoIcone) retornoIcone.innerHTML = '<i class="ph-bold ph-x"></i>';
    if (retornoEtiqueta) retornoEtiqueta.textContent = "Pagamento não concluído";
    if (retornoTitulo) retornoTitulo.textContent = "Não deu certo desta vez.";
    if (retornoMensagem) retornoMensagem.textContent = "O pagamento não foi aprovado. Você pode tentar novamente ou escolher outro meio de pagamento.";
    if (retornoPassos[0]) retornoPassos[0].querySelector("div").innerHTML = "<h2>Confira os dados</h2><p>Revise as informações utilizadas e tente novamente quando estiver pronto.</p>";
    if (retornoPassos[1]) retornoPassos[1].querySelector("div").innerHTML = "<h2>Sua vaga não foi emitida</h2><p>Nenhum ingresso ou token foi criado a partir desta tentativa.</p>";
}

function mostrarPendenteConfirmado() {
    if (retornoEtiqueta) retornoEtiqueta.textContent = "Pagamento pendente";
    if (retornoTitulo) retornoTitulo.textContent = "Estamos aguardando.";
    if (retornoMensagem) retornoMensagem.textContent = "Seu pagamento ainda está em processamento. Assim que houver aprovação, o ingresso será emitido automaticamente.";
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
    if (!paymentId || !pedidoId) return;
    const consultarPedido = httpsCallable(getFunctions(app, "southamerica-east1"), "consultarPedido");
    mostrarVerificacao();

    try {
        const resposta = await consultarPedido({ pedidoId, paymentId });
        const statusPagamento = String(resposta.data?.status || "").toLowerCase();

        if (resposta.data?.aprovado && resposta.data?.token) {
            if (!paginaSucesso) {
                redirecionarPara("pagamento-sucesso.html");
                return;
            }

            if (credencialToken) credencialToken.textContent = resposta.data.token;
            if (credencialEmail) credencialEmail.textContent = resposta.data.email;
            if (credencial) credencial.hidden = false;
            if (credencialStatus) credencialStatus.textContent = "Pagamento confirmado. Sua credencial já está liberada no app.";
            await garantirEmailDoIngresso(resposta.data);
            return;
        }

        if (STATUS_FALHA.has(statusPagamento)) {
            if (!paginaFalhou) {
                redirecionarPara("pagamento-falhou.html");
                return;
            }
            mostrarFalhaConfirmada();
            return;
        }

        if (!paginaPendente) {
            redirecionarPara("pagamento-pendente.html");
            return;
        }
        mostrarPendenteConfirmado();
    } catch (error) {
        console.error("Falha ao confirmar pagamento", error);
        if (credencialStatus) credencialStatus.textContent = "A confirmação ainda está em processamento. Atualize esta página em alguns instantes.";
        if (!paginaSucesso) {
            if (retornoEtiqueta) retornoEtiqueta.textContent = "Confirmação indisponível";
            if (retornoTitulo) retornoTitulo.textContent = "Ainda estamos conferindo.";
            if (retornoMensagem) retornoMensagem.textContent = "Não foi possível consultar o pagamento agora. Aguarde alguns instantes e atualize esta página; seu cadastro não será perdido.";
        }
    }
}

confirmarPagamento();
