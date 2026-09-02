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
    // Só Fachada Podcast
    "so-fachada.png": "https://www.instagram.com/sofachadapodcast/",
    // JM Sacolé Gourmet
    "jm.png": "https://www.instagram.com/jmsacolegourmet21/",
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

function iniciarCarrosselPatrocinadores() {
    const carrossel = document.querySelector(".marquee-patrocinadores");
    const faixa = carrossel?.querySelector(".marquee-patrocinadores-faixa");
    const primeiroItem = faixa?.firstElementChild;
    const primeiroDuplicado = faixa?.querySelector('[aria-hidden="true"]');
    if (!carrossel || !faixa || !primeiroItem || !primeiroDuplicado) return;

    const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    const velocidadeAutomatica = 30 / 1000;
    let larguraCiclo = 0;
    let posicao = 0;
    let ultimoQuadro = performance.now();
    let ponteiroId = null;
    let inicioX = 0;
    let inicioY = 0;
    let ultimoX = 0;
    let ultimoMovimento = 0;
    let direcaoGesto = null;
    let interagindo = false;
    let mouseSobre = false;
    let focoDentro = false;
    let velocidadeInercial = 0;
    let retomarEm = 0;
    let bloquearClique = false;

    function normalizarPosicao() {
        if (!larguraCiclo) return;
        posicao = ((posicao % larguraCiclo) + larguraCiclo) % larguraCiclo;
    }

    function aplicarPosicao() {
        faixa.style.transform = `translate3d(${-posicao}px, 0, 0)`;
    }

    function medirCiclo() {
        const larguraAnterior = larguraCiclo;
        const novaLargura = primeiroDuplicado.offsetLeft - primeiroItem.offsetLeft;
        if (novaLargura <= 0) return;
        larguraCiclo = novaLargura;
        if (larguraAnterior > 0) posicao = (posicao / larguraAnterior) * larguraCiclo;
        normalizarPosicao();
        aplicarPosicao();
    }

    function animar(agora) {
        const intervalo = Math.min(40, Math.max(0, agora - ultimoQuadro));
        ultimoQuadro = agora;
        const pausado = interagindo || mouseSobre || focoDentro || document.hidden;

        if (!pausado && larguraCiclo) {
            if (Math.abs(velocidadeInercial) > 0.01) {
                posicao += velocidadeInercial * intervalo;
                velocidadeInercial *= Math.exp(-intervalo / 420);
                if (Math.abs(velocidadeInercial) <= 0.01) {
                    velocidadeInercial = 0;
                    retomarEm = agora + 650;
                }
            } else if (!movimentoReduzido.matches && agora >= retomarEm) {
                posicao += velocidadeAutomatica * intervalo;
            }
            normalizarPosicao();
            aplicarPosicao();
        }
        requestAnimationFrame(animar);
    }

    function iniciarGesto(evento) {
        if (evento.pointerType === "mouse" && evento.button !== 0) return;
        ponteiroId = evento.pointerId;
        inicioX = ultimoX = evento.clientX;
        inicioY = evento.clientY;
        ultimoMovimento = performance.now();
        direcaoGesto = null;
        interagindo = true;
        velocidadeInercial = 0;
        carrossel.classList.add("arrastando");
    }

    function moverGesto(evento) {
        if (!interagindo || evento.pointerId !== ponteiroId) return;
        const totalX = evento.clientX - inicioX;
        const totalY = evento.clientY - inicioY;

        if (!direcaoGesto && Math.max(Math.abs(totalX), Math.abs(totalY)) >= 6) {
            direcaoGesto = Math.abs(totalX) > Math.abs(totalY) ? "horizontal" : "vertical";
            if (direcaoGesto === "horizontal") carrossel.setPointerCapture?.(evento.pointerId);
        }
        if (direcaoGesto !== "horizontal") return;

        evento.preventDefault();
        const agora = performance.now();
        const deslocamento = evento.clientX - ultimoX;
        const intervalo = Math.max(8, agora - ultimoMovimento);
        const velocidadeAtual = -deslocamento / intervalo;
        velocidadeInercial = velocidadeInercial * 0.58 + velocidadeAtual * 0.42;
        posicao -= deslocamento;
        ultimoX = evento.clientX;
        ultimoMovimento = agora;
        normalizarPosicao();
        aplicarPosicao();
    }

    function encerrarGesto(evento) {
        if (!interagindo || evento.pointerId !== ponteiroId) return;
        const arrastou = direcaoGesto === "horizontal" && Math.abs(evento.clientX - inicioX) >= 6;
        if (carrossel.hasPointerCapture?.(evento.pointerId)) carrossel.releasePointerCapture(evento.pointerId);
        interagindo = false;
        ponteiroId = null;
        carrossel.classList.remove("arrastando");
        velocidadeInercial = arrastou ? Math.max(-1.35, Math.min(1.35, velocidadeInercial)) : 0;
        retomarEm = performance.now() + 900;
        if (arrastou) {
            bloquearClique = true;
            window.setTimeout(() => { bloquearClique = false; }, 400);
        }
    }

    carrossel.addEventListener("pointerdown", iniciarGesto);
    carrossel.addEventListener("pointermove", moverGesto, { passive: false });
    carrossel.addEventListener("pointerup", encerrarGesto);
    carrossel.addEventListener("pointercancel", encerrarGesto);
    carrossel.addEventListener("pointerenter", evento => {
        if (evento.pointerType === "mouse") mouseSobre = true;
    });
    carrossel.addEventListener("pointerleave", evento => {
        if (evento.pointerType === "mouse") mouseSobre = false;
    });
    carrossel.addEventListener("focusin", evento => {
        focoDentro = evento.target.matches?.(":focus-visible") === true;
    });
    carrossel.addEventListener("focusout", () => { focoDentro = false; });
    carrossel.addEventListener("dragstart", evento => evento.preventDefault());
    carrossel.addEventListener("click", evento => {
        if (!bloquearClique) return;
        evento.preventDefault();
        evento.stopImmediatePropagation();
        bloquearClique = false;
    }, true);
    carrossel.addEventListener("keydown", evento => {
        if (evento.target !== carrossel || !["ArrowLeft", "ArrowRight"].includes(evento.key)) return;
        evento.preventDefault();
        posicao += evento.key === "ArrowRight" ? 110 : -110;
        velocidadeInercial = 0;
        retomarEm = performance.now() + 1200;
        normalizarPosicao();
        aplicarPosicao();
    });

    carrossel.classList.add("carrossel-interativo");
    medirCiclo();
    window.addEventListener("load", medirCiclo, { once: true });
    if ("ResizeObserver" in window) {
        new ResizeObserver(medirCiclo).observe(carrossel);
    } else {
        window.addEventListener("resize", medirCiclo);
    }
    requestAnimationFrame(animar);
}

iniciarCarrosselPatrocinadores();
