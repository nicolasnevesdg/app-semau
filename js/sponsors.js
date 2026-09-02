// LINKS DOS PATROCINADORES
// Cole o endereço entre as aspas. Deixe vazio para manter a logo sem link.
const linksPatrocinadores = {
    // Logifab
    "logifab.png": "https://www.instagram.com/logifab_ufrrj/",
    // Voitto
    "voitto.png": "https://www.instagram.com/grupovoitto/",
    // Cura
    "cura-marca-branco.png": "https://www.instagram.com/cursocura/",
    // Peanuts Bakery
    "peanuts-bakery.png": "https://www.instagram.com/peanuts.bak/",
    // Choco Latte
    "choco-latte.png": "https://www.instagram.com/choco.chocolatie/",
    // Vênus Artesã
    "venus-artesa.png": "https://www.instagram.com/venusartesa/",
    // Studio 3 Papelaria
    "studio3-papelaria.png": "https://www.instagram.com/studio3.papelaria/",
    // Jardim de Papel
    "jardim-de-papel.png": "https://www.instagram.com/jardim_d_papel/",
    // Nut Acessórios
    "nut-acessorios.png": "https://www.instagram.com/nutacessorios_/",
    // Manufatura Ateliê
    "manufatura-atelie.png": "https://www.instagram.com/manufatur.a/",
    // Ruralino
    "precinho-ruralino.png": "https://www.instagram.com/ruralino.rj/",
    // Fireprint Gráfica
    "fireprint.png": "https://www.instagram.com/fireprintgrafica/",
    // Arquitetura Aura
    "aura.png": "https://www.instagram.com/arquitetura_aura/",
    // Euphoria Ateliê
    "euphoria-atelie.png": "https://www.instagram.com/euphoriaatelie_/",
    // Canson
    "canson.png": "https://www.instagram.com/cansonbr/",
    // Arqstream
    "arqstream.png": "https://www.instagram.com/arqstream/",
    // Doce Carol
    "doce-carol.png": "https://www.instagram.com/_doce_carol/",
};

document.querySelectorAll("[data-patrocinador]").forEach(link => {
    const arquivo = link.dataset.patrocinador;
    const url = linksPatrocinadores[arquivo]?.trim();

    if (!url) {
        link.removeAttribute("href");
        return;
    }

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${link.querySelector("img")?.alt || "Patrocinador"} — abrir perfil`);
});
