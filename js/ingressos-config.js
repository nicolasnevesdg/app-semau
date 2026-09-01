export const LOTE_ATIVO_PADRAO = "social";
export const FORMULARIO_LOTE_SOCIAL = "https://docs.google.com/forms/d/e/1FAIpQLSdkiRquBCk0dKTqJTZsCi2EzDCho3N2kuYUU9unm8LOmzRxPw/viewform";
export const ABERTURA_LOTE_SOCIAL = Date.parse("2026-09-01T12:00:00-03:00");
export const ENCERRAMENTO_LOTE_SOCIAL = Date.parse("2026-09-01T15:00:00-03:00");
export const LIMITE_PRIMEIRO_LOTE = Object.freeze({ normal: 10, kit: 10 });
const DURACAO_RESERVA_ANTIGA_MS = 60 * 60 * 1000;
const DURACAO_RESERVA_MS = 15 * 60 * 1000;

export const LOTES_INGRESSOS = Object.freeze({
    social: Object.freeze({ nome: "Lote Social", normal: 15, kit: 30, fluxo: "formulario" }),
    primeiro: Object.freeze({ nome: "1º Lote", normal: 25, kit: 40, fluxo: "mercado_pago" }),
    segundo: Object.freeze({ nome: "2º Lote", normal: 30, kit: 45, fluxo: "mercado_pago" })
});

export const TIPOS_INGRESSOS = Object.freeze({
    normal: Object.freeze({ nome: "Ingresso normal", descricao: "Programação geral e certificado" }),
    kit: Object.freeze({ nome: "Ingresso com kit", descricao: "Ingresso + itens oficiais" })
});

export function normalizarLoteAtivo(valor) {
    const lote = String(valor || "").trim().toLowerCase();
    return LOTES_INGRESSOS[lote] ? lote : LOTE_ATIVO_PADRAO;
}

export function obterIngresso(lote, tipo) {
    const loteSeguro = normalizarLoteAtivo(lote);
    const tipoSeguro = TIPOS_INGRESSOS[tipo] ? tipo : "normal";
    return {
        lote: loteSeguro,
        tipo: tipoSeguro,
        nomeLote: LOTES_INGRESSOS[loteSeguro].nome,
        nome: TIPOS_INGRESSOS[tipoSeguro].nome,
        descricao: TIPOS_INGRESSOS[tipoSeguro].descricao,
        valor: LOTES_INGRESSOS[loteSeguro][tipoSeguro],
        fluxo: LOTES_INGRESSOS[loteSeguro].fluxo
    };
}

export function normalizarUrlFormulario(valor) {
    try {
        const url = new URL(String(valor || "").trim());
        const hostPermitido = url.hostname === "forms.gle" || url.hostname === "docs.google.com";
        return url.protocol === "https:" && hostPermitido ? url.href : "";
    } catch {
        return "";
    }
}

function numeroSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : 0;
}

function reservasAtivas(estoque, tipo, agora) {
    return Object.values(estoque?.primeiro?.reservas || {}).filter(reserva =>
        reserva?.tipo === tipo && expiracaoEfetivaDaReserva(reserva) > agora
    ).length;
}

function expiracaoEfetivaDaReserva(reserva = {}) {
    const expiraEmOriginal = Number(reserva.expiraEm || 0);
    const criadaEm = Number(reserva.criadaEm || 0) || expiraEmOriginal - DURACAO_RESERVA_ANTIGA_MS;
    return Math.min(expiraEmOriginal, criadaEm + DURACAO_RESERVA_MS);
}

export function disponibilidadePrimeiroLote(estoque = {}, agora = Date.now()) {
    const primeiro = estoque?.primeiro || {};
    const normalVendidos = numeroSeguro(primeiro.normalVendidos);
    const kitVendidos = numeroSeguro(primeiro.kitVendidos);
    return {
        normal: normalVendidos + reservasAtivas(estoque, "normal", agora) < LIMITE_PRIMEIRO_LOTE.normal,
        kit: kitVendidos + reservasAtivas(estoque, "kit", agora) < LIMITE_PRIMEIRO_LOTE.kit,
        normalVendidos,
        kitVendidos,
        esgotado: normalVendidos >= LIMITE_PRIMEIRO_LOTE.normal && kitVendidos >= LIMITE_PRIMEIRO_LOTE.kit
    };
}

export function obterLoteAutomatico(loteConfigurado, estoque = {}, agora = Date.now()) {
    if (agora < ABERTURA_LOTE_SOCIAL) return null;
    if (agora < ENCERRAMENTO_LOTE_SOCIAL) return "social";
    const disponibilidade = disponibilidadePrimeiroLote(estoque, agora);
    if (disponibilidade.esgotado || normalizarLoteAtivo(loteConfigurado) === "segundo") return "segundo";
    return "primeiro";
}
