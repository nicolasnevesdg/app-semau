import { db } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    LOTE_ATIVO_PADRAO,
    LOTES_INGRESSOS,
    normalizarLoteAtivo,
    normalizarUrlFormulario
} from "./ingressos-config.js";

const lotes = document.querySelectorAll(".lote-card");
const introLotes = document.querySelector(".planos-intro");
const aviso = document.getElementById("compra-aviso");
const botoes = document.querySelectorAll(".plano-botao");
const precos = document.querySelectorAll("[data-preco-tipo]");

let loteAtivo = LOTE_ATIVO_PADRAO;
let formularioLoteSocial = "";

function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function atualizarLotes() {
    const lote = LOTES_INGRESSOS[loteAtivo];
    const fluxoSocial = lote.fluxo === "formulario";

    lotes.forEach(card => {
        const chave = card.dataset.lote;
        const chaves = Object.keys(LOTES_INGRESSOS);
        const ativo = chave === loteAtivo;
        const encerrado = chaves.indexOf(chave) < chaves.indexOf(loteAtivo);
        card.classList.toggle("lote-ativo", ativo);
        card.classList.toggle("lote-inativo", !ativo);
        const status = card.querySelector("b");
        if (status) status.textContent = ativo ? "Ativo" : encerrado ? "Encerrado" : "Em breve";
    });

    precos.forEach(preco => {
        preco.textContent = formatarValor(lote[preco.dataset.precoTipo]);
    });

    botoes.forEach(botao => {
        if (fluxoSocial) {
            botao.disabled = !formularioLoteSocial;
            botao.textContent = formularioLoteSocial ? "Solicitar ingresso social" : "Formulário em breve";
        } else {
            botao.disabled = false;
            botao.textContent = botao.dataset.tipo === "kit" ? "Quero o ingresso com kit" : "Escolher ingresso";
        }
    });

    if (fluxoSocial) {
        introLotes.textContent = "O Lote Social é destinado a estudantes cotistas e exige o envio do comprovante de matrícula pelo formulário.";
        aviso.textContent = formularioLoteSocial
            ? "Você será direcionado ao formulário de comprovação do Lote Social."
            : "Assim que o formulário do Lote Social for publicado, os botões serão liberados aqui.";
    } else {
        introLotes.textContent = `${lote.nome} disponível. Escolha seu ingresso abaixo.`;
        aviso.textContent = "Pagamento seguro pelo Mercado Pago. A credencial é emitida após a aprovação.";
    }
}

botoes.forEach(botao => {
    botao.addEventListener("click", () => {
        const tipo = botao.dataset.tipo === "kit" ? "kit" : "normal";
        const lote = LOTES_INGRESSOS[loteAtivo];
        if (lote.fluxo === "formulario") {
            if (formularioLoteSocial) window.location.assign(formularioLoteSocial);
            return;
        }
        window.location.href = `compra.html?lote=${encodeURIComponent(loteAtivo)}&tipo=${encodeURIComponent(tipo)}`;
    });
});

onSnapshot(doc(db, "configuracoes", "geral"), snapshot => {
    const configuracao = snapshot.data() || {};
    loteAtivo = normalizarLoteAtivo(configuracao.loteIngressosAtivo);
    formularioLoteSocial = normalizarUrlFormulario(configuracao.formularioLoteSocial);
    atualizarLotes();
}, atualizarLotes);

atualizarLotes();
