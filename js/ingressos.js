import { db } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    ABERTURA_LOTE_SOCIAL,
    ENCERRAMENTO_LOTE_SOCIAL,
    FORMULARIO_LOTE_SOCIAL,
    LOTES_INGRESSOS,
    disponibilidadePrimeiroLote,
    disponibilidadeSegundoLote,
    obterLoteAutomatico,
    normalizarUrlFormulario
} from "./ingressos-config.js?v=20260905-1";

const lotes = document.querySelectorAll(".lote-card");
const botoes = document.querySelectorAll(".plano-botao");
const precos = document.querySelectorAll("[data-preco-tipo]");
const faixaPalestrantes = document.getElementById("palestrantes-faixa");
const VERSAO_IMAGENS_PALESTRANTES = "20260902-1";

function versionarImagemLocal(caminho) {
    const valor = String(caminho || "").trim();
    if (!valor || /^(?:https?:)?\/\//i.test(valor) || /^(?:data|blob):/i.test(valor)) return valor;
    return `${valor}${valor.includes("?") ? "&" : "?"}imgv=${VERSAO_IMAGENS_PALESTRANTES}`;
}

const PALESTRANTES = {
    "palestrante-01": { nome: "Ethel Pinheiro", descricao: "Arquiteta, urbanista e professora da UFRJ", imagem: "assets/palestrantes/ethel-pinheiro.png" },
    "palestrante-02": { nome: "Ester Carro", descricao: "Arquiteta, urbanista social, professora e ativista", imagem: "assets/palestrantes/esther-carro.png" },
    "palestrante-03": { nome: "Casé Arquitetura", descricao: "Hamilton Casé e Marcela Casé", imagem: "assets/palestrantes/case-arquitetura.png" },
    "palestrante-04": { nome: "Thaysa Malaquias", descricao: "Arquiteta, urbanista e pesquisadora do LabLugares", imagem: "assets/palestrantes/thaysa-malaquias.png" },
    "palestrante-05": { nome: "Rafael Zamorano", descricao: "Historiador e diretor substituto do Sítio Roberto Burle Marx", imagem: "assets/palestrantes/rafael-zamorano.png" },
    "palestrante-06": { nome: "Beatriz Fraga", descricao: "Palestrante da quarta-feira, às 09h10", imagem: "assets/palestrantes/beatriz-fraga.png" },
    "palestrante-07": { nome: "Roberto Cruz Saavedra", descricao: "Arquiteto e urbanista", imagem: "assets/palestrantes/roberto-cruz.png" },
    "palestrante-08": { nome: "Urb.Anas", descricao: "Coletivo de arquitetas e urbanistas", imagem: "assets/palestrantes/urbanas.png" },
    "palestrante-09": { nome: "Daniel Disitzer · Mestres da Obra", descricao: "Palestra de quinta-feira, às 09h10", imagem: "assets/img/palestrante-teste.png" },
    "palestrante-10": { nome: "Pedro Rajão · Negromuro", descricao: "Integrante do coletivo Negromuro", imagem: "assets/palestrantes/pedro-rajao.png" },
    "palestrante-11": { nome: "Verônica Natividade", descricao: "Arquiteta, pesquisadora e professora da PUC-Rio", imagem: "assets/palestrantes/veronica-natividade.png" }
};

let loteAtivo = null;
let loteConfigurado = "social";
let estoqueIngressos = {};
let formularioLoteSocial = FORMULARIO_LOTE_SOCIAL;

function escaparHtml(valor) {
    return String(valor || "").replace(/[&<>'"]/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    })[caractere]);
}

function cardPalestrante(palestrante, repetido = false) {
    const acessibilidade = repetido ? ' aria-hidden="true"' : "";
    const alt = repetido ? "" : `Foto de ${palestrante.nome}`;
    return `<article class="palestrante-mini"${acessibilidade}>
        <img src="${escaparHtml(versionarImagemLocal(palestrante.imagem))}" alt="${escaparHtml(alt)}">
        <h3>${escaparHtml(palestrante.nome)}</h3>
        <p>${escaparHtml(palestrante.descricao)}</p>
    </article>`;
}

function renderizarPalestrantes(ativos) {
    if (!faixaPalestrantes) return;
    const divulgados = ativos
        .filter(id => id.startsWith("palestrante-"))
        .map(id => PALESTRANTES[id])
        .filter(Boolean);

    if (!divulgados.length) {
        faixaPalestrantes.classList.add("sem-palestrantes");
        faixaPalestrantes.innerHTML = `<div class="palestrantes-em-breve">
            <img src="${versionarImagemLocal('assets/svg/em-breve.svg')}" alt="Em breve">
        </div>`;
        return;
    }

    faixaPalestrantes.classList.remove("sem-palestrantes");
    const quantidadeMinima = 4;
    const grupo = Array.from(
        { length: Math.max(quantidadeMinima, divulgados.length) },
        (_, indice) => divulgados[indice % divulgados.length]
    );
    faixaPalestrantes.innerHTML = [false, true]
        .flatMap(repetido => grupo.map(palestrante => cardPalestrante(palestrante, repetido)))
        .join("");
}

function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function atualizarLotes() {
    const agora = Date.now();
    loteAtivo = obterLoteAutomatico(loteConfigurado, estoqueIngressos, agora);
    const lote = LOTES_INGRESSOS[loteAtivo || "social"];
    const vendasAbertas = Boolean(loteAtivo);
    const fluxoSocial = lote.fluxo === "formulario";
    const disponibilidadePrimeiro = disponibilidadePrimeiroLote(estoqueIngressos, agora);
    const disponibilidadeSegundo = disponibilidadeSegundoLote(estoqueIngressos, agora);

    lotes.forEach(card => {
        const chave = card.dataset.lote;
        const chaves = Object.keys(LOTES_INGRESSOS);
        const ativo = vendasAbertas && chave === loteAtivo;
        const encerrado = vendasAbertas && chaves.indexOf(chave) < chaves.indexOf(loteAtivo);
        card.classList.toggle("lote-ativo", ativo);
        card.classList.toggle("lote-inativo", !ativo);
        const status = card.querySelector("b");
        if (!status) return;
        if (!vendasAbertas && chave === "social") status.textContent = "Abre às 12h";
        else status.textContent = ativo ? "Ativo" : encerrado ? "Encerrado" : "Em breve";
    });

    precos.forEach(preco => {
        preco.textContent = formatarValor(lote[preco.dataset.precoTipo]);
    });

    botoes.forEach(botao => {
        const tipo = botao.dataset.tipo === "kit" ? "kit" : "normal";
        if (fluxoSocial && tipo === "kit") {
            botao.disabled = true;
            botao.textContent = "Esgotado";
            return;
        }
        if (!vendasAbertas) {
            botao.disabled = true;
            botao.textContent = "Inscrições abrem às 12h";
            return;
        }
        if (fluxoSocial) {
            botao.disabled = !formularioLoteSocial;
            botao.textContent = formularioLoteSocial ? "Solicitar ingresso social" : "Formulário em breve";
        } else if (loteAtivo === "primeiro" && !disponibilidadePrimeiro[tipo]) {
            botao.disabled = true;
            botao.textContent = "Esgotado no 1º lote";
        } else if (loteAtivo === "segundo" && !disponibilidadeSegundo[tipo]) {
            botao.disabled = true;
            botao.textContent = "Esgotado no 2º lote";
        } else {
            botao.disabled = false;
            botao.textContent = botao.dataset.tipo === "kit" ? "Quero o ingresso com kit" : "Escolher ingresso";
        }
    });

}

botoes.forEach(botao => {
    botao.addEventListener("click", () => {
        const tipo = botao.dataset.tipo === "kit" ? "kit" : "normal";
        if (!loteAtivo) return;
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
    const loteLegado = ({ 1: "primeiro", 2: "segundo" })[Number(configuracao.loteAtivo)];
    loteConfigurado = configuracao.loteIngressosAtivo || loteLegado || "social";
    formularioLoteSocial = normalizarUrlFormulario(configuracao.formularioLoteSocial) || FORMULARIO_LOTE_SOCIAL;
    atualizarLotes();
}, atualizarLotes);

onSnapshot(doc(db, "configuracoes", "estoqueIngressos"), snapshot => {
    estoqueIngressos = snapshot.data() || {};
    atualizarLotes();
}, atualizarLotes);

onSnapshot(doc(db, "configuracoes", "anuncios"), snapshot => {
    const configuracao = snapshot.data() || {};
    renderizarPalestrantes(Array.isArray(configuracao.ativos) ? configuracao.ativos : []);
}, () => renderizarPalestrantes([]));

atualizarLotes();
setInterval(atualizarLotes, 30000);
[ABERTURA_LOTE_SOCIAL, ENCERRAMENTO_LOTE_SOCIAL].forEach(limite => {
    const espera = limite - Date.now();
    if (espera > 0 && espera < 2147483647) setTimeout(atualizarLotes, espera + 250);
});
