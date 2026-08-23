const produtosGaleria = {
    camisa: {
        nome: 'Camisa XVI',
        capa: { src: 'assets/lojinha-xvi/Camisa_01.png', alt: 'Camisa XVI' },
        imagens: [
            { src: 'assets/lojinha-xvi/Camisa_02.png', alt: 'Camisa XVI — foto 1' },
            { src: 'assets/lojinha-xvi/Camisa_03.png', alt: 'Camisa XVI — foto 2' },
            { src: 'assets/lojinha-xvi/Camisa_04.png', alt: 'Camisa XVI — foto 3' },
            { src: 'assets/lojinha-xvi/Camisa_05.png', alt: 'Camisa XVI — foto 4' },
            { src: 'assets/lojinha-xvi/Camisa_06.png', alt: 'Camisa XVI — foto 5' }
        ]
    },
    baralho: {
        nome: 'Baralho XVI',
        capa: { src: 'assets/lojinha-xvi/baralho/baralho-capa.jpg', alt: 'Cartas do Baralho XVI' },
        imagens: [
            { src: 'assets/lojinha-xvi/baralho/baralho-slide-composicao.jpg', alt: 'Baralho XVI com embalagem e cartas' },
            { src: 'assets/lojinha-xvi/baralho/baralho-slide-carta-amor.jpg', alt: 'Carta interna do Baralho XVI com pergunta sobre o amor' },
            { src: 'assets/lojinha-xvi/baralho/baralho-slide-cartas-internas.jpg', alt: 'Seleção de cartas internas do Baralho XVI' },
            { src: 'assets/lojinha-xvi/baralho/baralho-slide-cartas.jpg', alt: 'Cartas do Baralho XVI sobre mesa de madeira' },
            { src: 'assets/lojinha-xvi/baralho/baralho-slide-caixa-frente-xvi.jpg', alt: 'Frente da embalagem do Baralho XVI' },
            { src: 'assets/lojinha-xvi/baralho/baralho-slide-caixa-verso-xvi.jpg', alt: 'Verso da embalagem do Baralho XVI' }
        ]
    },
    ima: {
        nome: 'Imã',
        capa: { src: 'assets/lojinha-xvi/ima/ima-capa.jpg', alt: 'Ímã XVI em formato de selo' },
        imagens: [
            { src: 'assets/lojinha-xvi/ima/ima-slide-01.jpg', alt: 'Ímã XVI em formato de selo sobre geladeira — vista frontal' },
            { src: 'assets/lojinha-xvi/ima/ima-slide-02.jpg', alt: 'Ímã XVI em formato de selo — vista lateral aproximada' },
            { src: 'assets/lojinha-xvi/ima/ima-slide-03.jpg', alt: 'Ímã XVI em formato de selo sobre a porta da geladeira' },
            { src: 'assets/lojinha-xvi/ima/ima-slide-06.jpg', alt: 'Ímã verde e laranja com estrela — vista lateral esquerda' },
            { src: 'assets/lojinha-xvi/ima/ima-slide-08.jpg', alt: 'Ímã inspirado em azulejo sobre geladeira' },
            { src: 'assets/lojinha-xvi/ima/ima-slide-09.jpg', alt: 'Ímã com a frase o lugar que nos habita' }
        ]
    },
    bottons: {
        nome: 'Bottons',
        capa: { src: 'assets/lojinha-xvi/bottons/bottons-capa.jpg', alt: 'Botton inspirado em azulejo preso a uma mochila' },
        imagens: [
            { src: 'assets/lojinha-xvi/bottons/bottons-slide-01.jpg', alt: 'Botton inspirado em azulejo preso a uma mochila preta' },
            { src: 'assets/lojinha-xvi/bottons/bottons-slide-02.jpg', alt: 'Botton verde com estrela laranja preso a uma mochila preta' },
            { src: 'assets/lojinha-xvi/bottons/bottons-slide-03.jpg', alt: 'Botton com desenho arquitetônico preso a uma mochila preta' },
            { src: 'assets/lojinha-xvi/bottons/bottons-slide-04.jpg', alt: 'Botton verde com estrela laranja preso a uma ecobag clara' },
            { src: 'assets/lojinha-xvi/bottons/bottons-slide-05.jpg', alt: 'Botton em formato de selo com o texto XVI preso a uma ecobag clara' }
        ]
    }
};

const modalGaleria = document.getElementById('produto-galeria-modal');
const janelaGaleria = modalGaleria?.querySelector('.produto-galeria-janela');
const trilhaGaleria = document.getElementById('produto-galeria-trilha');
const pontosGaleria = document.getElementById('produto-galeria-pontos');

let produtoAtual = null;
let indiceAtual = 0;
let temporizadorGaleria = null;
let elementoQueAbriu = null;
let scrollAntesDoModal = 0;
let inicioArrasto = 0;
let deslocamentoArrasto = 0;
let arrastando = false;

function atualizarCapaDosProdutos() {
    document.querySelectorAll('.produto-card[data-produto]').forEach(card => {
        const produto = produtosGaleria[card.dataset.produto];
        const capa = card.querySelector('.produto-foto');
        const imagemDeCapa = produto?.capa || produto?.imagens?.[0];
        if (!imagemDeCapa || !capa) return;
        capa.src = imagemDeCapa.src;
        capa.alt = imagemDeCapa.alt;
    });
}

function desenharGaleria() {
    if (!produtoAtual || !trilhaGaleria || !pontosGaleria) return;

    trilhaGaleria.innerHTML = produtoAtual.imagens.map(imagem => `
        <figure class="produto-galeria-slide">
            <img src="${imagem.src}" alt="${imagem.alt}" draggable="false">
        </figure>
    `).join('');

    pontosGaleria.innerHTML = produtoAtual.imagens.map((_, indice) => `
        <span class="produto-galeria-ponto${indice === 0 ? ' ativo' : ''}" aria-hidden="true"></span>
    `).join('');

    indiceAtual = 0;
    atualizarPosicaoGaleria(false);
}

function atualizarPosicaoGaleria(animar = true) {
    if (!trilhaGaleria) return;
    trilhaGaleria.classList.toggle('sem-animacao', !animar);
    trilhaGaleria.style.transform = `translate3d(-${indiceAtual * 100}%, 0, 0)`;
    pontosGaleria?.querySelectorAll('.produto-galeria-ponto').forEach((ponto, indice) => {
        ponto.classList.toggle('ativo', indice === indiceAtual);
    });
}

function irParaSlide(indice) {
    if (!produtoAtual?.imagens?.length) return;
    const total = produtoAtual.imagens.length;
    indiceAtual = (indice + total) % total;
    atualizarPosicaoGaleria(true);
}

function iniciarTrocaAutomatica() {
    clearInterval(temporizadorGaleria);
    if (
        !produtoAtual ||
        produtoAtual.imagens.length < 2 ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    temporizadorGaleria = window.setInterval(() => irParaSlide(indiceAtual + 1), 3000);
}

function bloquearRolagem() {
    scrollAntesDoModal = window.scrollY;
    document.body.classList.add('produto-galeria-aberta');
    document.body.style.top = `-${scrollAntesDoModal}px`;
}

function liberarRolagem() {
    document.body.classList.remove('produto-galeria-aberta');
    document.body.style.top = '';
    window.scrollTo(0, scrollAntesDoModal);
}

function abrirGaleria(chaveProduto, acionador) {
    produtoAtual = produtosGaleria[chaveProduto];
    if (!produtoAtual || !modalGaleria) return;

    elementoQueAbriu = acionador;
    desenharGaleria();
    modalGaleria.hidden = false;
    modalGaleria.setAttribute('aria-label', `Galeria de fotos: ${produtoAtual.nome}`);
    bloquearRolagem();
    requestAnimationFrame(() => {
        modalGaleria.classList.add('aberto');
        modalGaleria.focus({ preventScroll: true });
    });
    iniciarTrocaAutomatica();
}

function fecharGaleria() {
    if (!modalGaleria || modalGaleria.hidden) return;
    clearInterval(temporizadorGaleria);
    modalGaleria.classList.remove('aberto');
    liberarRolagem();
    window.setTimeout(() => {
        modalGaleria.hidden = true;
        trilhaGaleria.innerHTML = '';
        pontosGaleria.innerHTML = '';
        elementoQueAbriu?.focus({ preventScroll: true });
        elementoQueAbriu = null;
        produtoAtual = null;
    }, 220);
}

document.querySelectorAll('.produto-card[data-produto]').forEach(card => {
    card.addEventListener('click', () => abrirGaleria(card.dataset.produto, card));
});

modalGaleria?.addEventListener('click', evento => {
    if (evento.target === modalGaleria) fecharGaleria();
});

janelaGaleria?.addEventListener('click', evento => evento.stopPropagation());

janelaGaleria?.addEventListener('pointerdown', evento => {
    if (!produtoAtual || produtoAtual.imagens.length < 2) return;
    arrastando = true;
    inicioArrasto = evento.clientX;
    deslocamentoArrasto = 0;
    clearInterval(temporizadorGaleria);
    trilhaGaleria.classList.add('sem-animacao');
    janelaGaleria.setPointerCapture(evento.pointerId);
});

janelaGaleria?.addEventListener('pointermove', evento => {
    if (!arrastando || !trilhaGaleria) return;
    deslocamentoArrasto = evento.clientX - inicioArrasto;
    const largura = janelaGaleria.clientWidth || 1;
    const percentual = (deslocamentoArrasto / largura) * 100;
    trilhaGaleria.style.transform = `translate3d(calc(-${indiceAtual * 100}% + ${percentual}%), 0, 0)`;
});

function concluirArrasto(evento) {
    if (!arrastando) return;
    arrastando = false;
    if (janelaGaleria?.hasPointerCapture(evento.pointerId)) {
        janelaGaleria.releasePointerCapture(evento.pointerId);
    }
    const limite = Math.max(38, janelaGaleria.clientWidth * 0.16);
    if (Math.abs(deslocamentoArrasto) >= limite) {
        irParaSlide(indiceAtual + (deslocamentoArrasto < 0 ? 1 : -1));
    } else {
        atualizarPosicaoGaleria(true);
    }
    iniciarTrocaAutomatica();
}

janelaGaleria?.addEventListener('pointerup', concluirArrasto);
janelaGaleria?.addEventListener('pointercancel', concluirArrasto);

document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !modalGaleria?.hidden) fecharGaleria();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(temporizadorGaleria);
    else if (!modalGaleria?.hidden) iniciarTrocaAutomatica();
});

atualizarCapaDosProdutos();
