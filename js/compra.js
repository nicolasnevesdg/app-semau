import { app } from "./firebase-config.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const ingressos = {
    normal: { nome: "Ingresso normal", valor: 45 },
    kit: { nome: "Ingresso com kit", valor: 68 },
    kit_camisa: { nome: "Ingresso + kit + camisa", valor: 99 }
};

const functions = getFunctions(app, "southamerica-east1");
const criarPreferencia = httpsCallable(functions, "criarPreferencia");
const parametros = new URLSearchParams(window.location.search);
const tipoInicial = ingressos[parametros.get("tipo")] ? parametros.get("tipo") : "normal";
const radios = document.querySelectorAll('input[name="tipoIngresso"]');
const resumoNome = document.getElementById("resumo-nome");
const resumoValor = document.getElementById("resumo-valor");
const form = document.getElementById("form-compra");
const email = document.getElementById("compra-email");
const emailConfirmacao = document.getElementById("compra-email-confirmacao");
const telefone = document.getElementById("compra-telefone");
const nome = document.getElementById("compra-nome");
const matricula = document.getElementById("compra-matricula");
const status = document.getElementById("compra-status");
const botao = form.querySelector('button[type="submit"]');

function formatarValor(valor) {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function atualizarResumo(tipo) {
    const ingresso = ingressos[tipo] || ingressos.normal;
    resumoNome.textContent = ingresso.nome;
    resumoValor.textContent = formatarValor(ingresso.valor);
}

function mostrarStatus(mensagem, tipo = "erro") {
    status.hidden = false;
    status.dataset.tipo = tipo;
    status.textContent = mensagem;
    status.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

radios.forEach(radio => {
    radio.checked = radio.value === tipoInicial;
    radio.addEventListener("change", () => {
        if (radio.checked) atualizarResumo(radio.value);
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

nome.addEventListener("input", () => nome.setCustomValidity(""));
emailConfirmacao.addEventListener("input", () => emailConfirmacao.setCustomValidity(""));

form.addEventListener("submit", async event => {
    event.preventDefault();
    emailConfirmacao.setCustomValidity("");
    status.hidden = true;

    if (email.value.trim().toLowerCase() !== emailConfirmacao.value.trim().toLowerCase()) {
        emailConfirmacao.setCustomValidity("Os e-mails precisam ser iguais.");
    }
    const partesNome = nome.value.trim().split(/\s+/).filter(parte => parte.length >= 2);
    if (partesNome.length < 2) nome.setCustomValidity("Informe seu nome completo, com nome e sobrenome.");
    if (!/^\d{11}$/.test(matricula.value)) matricula.setCustomValidity("A matrícula deve conter exatamente 11 números.");
    if (!form.reportValidity()) return;

    const dados = new FormData(form);
    const textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.textContent = "Preparando pagamento...";

    try {
        const resposta = await criarPreferencia({
            nome: dados.get("nome"),
            email: dados.get("email"),
            telefone: dados.get("telefone"),
            instituicao: dados.get("instituicao"),
            matricula: dados.get("matricula"),
            curso: dados.get("curso"),
            periodo: dados.get("periodo"),
            tipoIngresso: dados.get("tipoIngresso"),
            aceite: dados.get("aceite") === "on"
        });

        if (!resposta.data?.checkoutUrl) throw new Error("URL de pagamento ausente.");
        window.location.assign(resposta.data.checkoutUrl);
    } catch (error) {
        console.error("Falha ao iniciar pagamento", error);
        mostrarStatus("Não foi possível iniciar o pagamento agora. Verifique sua conexão e tente novamente.");
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
});

atualizarResumo(tipoInicial);