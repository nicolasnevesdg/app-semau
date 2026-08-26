export const LOTE_ATIVO_PADRAO = "social";

export const LOTES_INGRESSOS = Object.freeze({
    social: Object.freeze({ nome: "Lote Social", normal: 10, kit: 20, fluxo: "formulario" }),
    primeiro: Object.freeze({ nome: "1º Lote", normal: 20, kit: 40, fluxo: "mercado_pago" }),
    segundo: Object.freeze({ nome: "2º Lote", normal: 25, kit: 45, fluxo: "mercado_pago" })
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
