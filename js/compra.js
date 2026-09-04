import { app, db } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import {
    LOTES_INGRESSOS,
    TIPOS_INGRESSOS,
    disponibilidadePrimeiroLote,
    disponibilidadeSegundoLote,
    obterLoteAutomatico,
    obterIngresso
} from "./ingressos-config.js?v=171";

const functions = getFunctions(app, "southamerica-east1");
const criarPreferencia = httpsCallable(functions, "criarPreferencia");
const parametros = new URLSearchParams(window.location.search);
const lotesPagos = ["primeiro", "segundo"];
const loteSelecionado = lotesPagos.includes(parametros.get("lote")) ? parametros.get("lote") : "primeiro";
const tipoInicial = TIPOS_INGRESSOS[parametros.get("tipo")] ? parametros.get("tipo") : "normal";
const radios = document.querySelectorAll('input[name="tipoIngresso"]');
const resumoTitulo = document.getElementById("resumo-titulo");
const resumoNome = document.getElementById("resumo-nome");
const resumoValor = document.getElementById("resumo-valor");
const form = document.getElementById("form-compra");
const email = document.getElementById("compra-email");
const emailConfirmacao = document.getElementById("compra-email-confirmacao");
const telefone = document.getElementById("compra-telefone");
const nome = document.getElementById("compra-nome");
const matricula = document.getElementById("compra-matricula");
const semVinculoAcademico = document.getElementById("compra-sem-vinculo");
const camposAcademicos = document.getElementById("compra-campos-academicos");
const camposNaoAcademicos = document.getElementById("compra-campos-nao-academicos");
const entradasAcademicas = [...camposAcademicos.querySelectorAll("input, select")];
const entradasNaoAcademicas = [...camposNaoAcademicos.querySelectorAll("input, select")];
const status = document.getElementById("compra-status");
const temporizador = document.getElementById("compra-temporizador");
const contagem = document.getElementById("compra-contagem");
const botao = form.querySelector('button[type="submit"]');
const precosOpcoes = document.querySelectorAll("[data-opcao-preco]");
const textoBotaoPadrao = botao.innerHTML;
let loteDisponivel = false;
let loteConfigurado = "social";
let estoqueIngressos = {};
const DURACAO_ETAPA_COMPRA_MS = 7 * 60 * 1000;
const etapaCompraExpiraEm = Date.now() + DURACAO_ETAPA_COMPRA_MS;
let etapaCompraEsgotada = false;
let intervaloContagem = null;

function atualizarTipoParticipante() {
    const semVinculo = semVinculoAcademico.checked;
    camposAcademicos.hidden = semVinculo;
    camposNaoAcademicos.hidden = !semVinculo;
    camposAcademicos.setAttribute("aria-hidden", String(semVinculo));
    camposNaoAcademicos.setAttribute("aria-hidden", String(!semVinculo));

    entradasAcademicas.forEach(entrada => {
        entrada.disabled = semVinculo;
        entrada.required = !semVinculo && ["instituicao", "matricula", "curso"].includes(entrada.name);
        entrada.setCustomValidity("");
    });
    entradasNaoAcademicas.forEach(entrada => {
        entrada.disabled = !semVinculo;
        entrada.required = semVinculo;
        entrada.setCustomValidity("");
    });
}

function formatarValor(valor, semCentavos = false) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: semCentavos ? 0 : 2
    });
}

function atualizarResumo(tipo) {
    const ingresso = obterIngresso(loteSelecionado, tipo);
    resumoTitulo.textContent = ingresso.nomeLote;
    resumoNome.textContent = ingresso.nome;
    resumoValor.textContent = formatarValor(ingresso.valor);
}

function mostrarStatus(mensagem, tipo = "erro") {
    status.hidden = false;
    status.dataset.tipo = tipo;
    status.textContent = mensagem;
    status.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function bloquearLote(mensagem = "Este lote não está disponível no momento. Volte à página de ingressos para consultar o lote ativo.", textoBotao = "Lote indisponível") {
    loteDisponivel = false;
    botao.disabled = true;
    botao.textContent = textoBotao;
    mostrarStatus(mensagem);
}

function verificarLoteAtivo() {
    if (etapaCompraEsgotada) {
        bloquearLote("O tempo desta etapa terminou. Volte aos ingressos e abra a compra novamente para conferir a disponibilidade atual.", "Tempo esgotado");
        return;
    }
    const loteAtivo = obterLoteAutomatico(loteConfigurado, estoqueIngressos);
    const disponibilidadePrimeiro = disponibilidadePrimeiroLote(estoqueIngressos);
    const disponibilidadeSegundo = disponibilidadeSegundoLote(estoqueIngressos);
    radios.forEach(radio => {
        radio.disabled = (loteSelecionado === "primeiro" && !disponibilidadePrimeiro[radio.value]) ||
            (loteSelecionado === "segundo" && !disponibilidadeSegundo[radio.value]);
    });
    if (loteAtivo !== loteSelecionado || !lotesPagos.includes(loteAtivo)) {
        bloquearLote();
        return;
    }

    const tipo = document.querySelector('input[name="tipoIngresso"]:checked')?.value || tipoInicial;
    if (loteSelecionado === "primeiro" && !disponibilidadePrimeiro[tipo]) {
        bloquearLote(`Os ingressos ${tipo === "kit" ? "com kit" : "sem kit"} do 1º lote estão esgotados. Escolha a outra modalidade, se ainda estiver disponível.`);
        return;
    }
    if (loteSelecionado === "segundo" && !disponibilidadeSegundo[tipo]) {
        bloquearLote("Os ingressos com kit do 2º lote estão esgotados. Escolha o ingresso sem kit.");
        return;
    }

    loteDisponivel = true;
    status.hidden = true;
    botao.disabled = false;
    botao.innerHTML = textoBotaoPadrao;
}

function atualizarContagem() {
    const restante = Math.max(0, etapaCompraExpiraEm - Date.now());
    const minutos = Math.floor(restante / 60000);
    const segundos = Math.floor((restante % 60000) / 1000);
    if (contagem) contagem.textContent = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

    if (restante > 0) return;
    etapaCompraEsgotada = true;
    if (temporizador) temporizador.dataset.esgotado = "true";
    if (intervaloContagem) window.clearInterval(intervaloContagem);
    verificarLoteAtivo();
}

precosOpcoes.forEach(preco => {
    preco.textContent = formatarValor(LOTES_INGRESSOS[loteSelecionado][preco.dataset.opcaoPreco], true);
});

radios.forEach(radio => {
    radio.checked = radio.value === tipoInicial;
    radio.addEventListener("change", () => {
        if (radio.checked) {
            atualizarResumo(radio.value);
            verificarLoteAtivo();
        }
    });
});

telefone.addEventListener("input", () => {
    const numeros = telefone.value.replace(/\D/g, "").slice(0, 11);
    let formatado = numeros;
    if (numeros.length > 2) formatado = `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length > 7) formatado = `${formatado.slice(0, -4)}-${formatado.slice(-4)}`;
    telefone.value = formatado;
});

matricula.addEventListener("input", () => {
    matricula.value = matricula.value.replace(/\D/g, "").slice(0, 11);
    matricula.setCustomValidity("");
});

semVinculoAcademico.addEventListener("change", atualizarTipoParticipante);
atualizarTipoParticipante();

nome.addEventListener("input", () => nome.setCustomValidity(""));
emailConfirmacao.addEventListener("input", () => emailConfirmacao.setCustomValidity(""));

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!loteDisponivel) {
        bloquearLote();
        return;
    }

    emailConfirmacao.setCustomValidity("");
    status.hidden = true;

    if (email.value.trim().toLowerCase() !== emailConfirmacao.value.trim().toLowerCase()) {
        emailConfirmacao.setCustomValidity("Os e-mails precisam ser iguais.");
    }
    const partesNome = nome.value.trim().split(/\s+/).filter(parte => parte.length >= 2);
    if (partesNome.length < 2) nome.setCustomValidity("Informe seu nome completo, com nome e sobrenome.");
    if (!semVinculoAcademico.checked && !/^\d{11}$/.test(matricula.value)) matricula.setCustomValidity("A matrícula deve conter exatamente 11 números.");
    if (!form.reportValidity()) return;

    const dados = new FormData(form);
    const dadosCompra = {
        nome: dados.get("nome"),
        email: dados.get("email"),
        telefone: dados.get("telefone"),
        instituicao: dados.get("instituicao"),
        matricula: dados.get("matricula"),
        curso: dados.get("curso"),
        periodo: dados.get("periodo"),
        semVinculoAcademico: semVinculoAcademico.checked,
        escolaridade: dados.get("escolaridade"),
        profissao: dados.get("profissao"),
        comoConheceu: dados.get("comoConheceu"),
        loteIngresso: loteSelecionado,
        tipoIngresso: dados.get("tipoIngresso"),
        aceite: dados.get("aceite") === "on"
    };
    botao.disabled = true;
    botao.textContent = "Preparando pagamento...";

    try {
        const resposta = await criarPreferencia(dadosCompra);

        if (!resposta.data?.checkoutUrl) throw new Error("URL de pagamento ausente.");
        window.location.assign(resposta.data.checkoutUrl);
    } catch (error) {
        console.error("Falha ao iniciar pagamento", error);
        if (error?.details?.motivo === "ingresso-ativo") {
            const comprarOutro = window.confirm("Já existe um ingresso pago e ativo para este e-mail. Deseja realmente comprar outro ingresso usando o mesmo endereço?");
            if (comprarOutro) {
                try {
                    botao.textContent = "Preparando compra adicional...";
                    const respostaAdicional = await criarPreferencia({ ...dadosCompra, permitirCompraAdicional: true });
                    if (!respostaAdicional.data?.checkoutUrl) throw new Error("URL de pagamento ausente.");
                    window.location.assign(respostaAdicional.data.checkoutUrl);
                    return;
                } catch (erroAdicional) {
                    console.error("Falha ao iniciar compra adicional", erroAdicional);
                    mostrarStatus("Não foi possível iniciar a compra adicional agora. Tente novamente.");
                    botao.disabled = false;
                    botao.innerHTML = textoBotaoPadrao;
                    return;
                }
            }
        }
        const mensagemRecebida = String(error?.message || "");
        const mensagem = /lote|já existe um ingresso|credencial/i.test(mensagemRecebida)
            ? mensagemRecebida
            : "Não foi possível iniciar o pagamento agora. Tente novamente.";
        mostrarStatus(mensagem);
        botao.disabled = false;
        botao.innerHTML = textoBotaoPadrao;
    }
});

atualizarResumo(tipoInicial);
atualizarContagem();
intervaloContagem = window.setInterval(atualizarContagem, 1000);
verificarLoteAtivo();

onSnapshot(doc(db, "configuracoes", "geral"), snapshot => {
    const configuracao = snapshot.data() || {};
    const loteLegado = ({ 1: "primeiro", 2: "segundo" })[Number(configuracao.loteAtivo)];
    loteConfigurado = configuracao.loteIngressosAtivo || loteLegado || "social";
    verificarLoteAtivo();
}, () => bloquearLote());

onSnapshot(doc(db, "configuracoes", "estoqueIngressos"), snapshot => {
    estoqueIngressos = snapshot.data() || {};
    verificarLoteAtivo();
}, () => bloquearLote());

setInterval(verificarLoteAtivo, 30000);
