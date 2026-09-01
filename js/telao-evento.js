const patrocinadores = [
    ['logifab.png', 'Logifab'], ['voitto.png', 'Voitto'], ['cura-marca-branco.png', 'Cura'],
    ['peanuts-bakery.png', 'Peanuts Bakery'], ['choco-latte.png', 'Choco Latte'], ['gastrobarr-vo-sacasa-clara.png', 'Gastrobar Vó Sacasa Clara'],
    ['venus-artesa.png', 'Vênus Artesã'], ['studio3-papelaria.png', 'Studio 3 Papelaria'], ['jardim-de-papel.png', 'Jardim de Papel'],
    ['mare-logo.png', 'Maré'], ['belas-artes.png', 'Belas Artes'], ['nut-acessorios.png', 'Nut Acessórios'],
    ['manufatura-atelie.png', 'Manufatura Ateliê'], ['precinho-ruralino.png', 'Ruralino']
];

const roteiro = [
    { id: 'boas-vindas', duracao: 14000 }, { id: 'patrocinadores', duracao: 11000 },
    { id: 'lojinha', duracao: 14000 }, { id: 'patrocinadores', duracao: 11000 },
    { id: 'app', duracao: 16000 }, { id: 'patrocinadores', duracao: 11000 },
    { id: 'jogos', duracao: 14000 }, { id: 'patrocinadores', duracao: 11000 },
    { id: 'sorteios', duracao: 16000 }, { id: 'patrocinadores', duracao: 11000 }
];

const slides = new Map([...document.querySelectorAll('[data-slide]')].map(slide => [slide.dataset.slide, slide]));
const patrocinadoresContainer = document.getElementById('patrocinadores-telao');
const btnPausar = document.getElementById('btn-pausar');
let indice = 0;
let pausado = false;
let temporizador = null;
let bloqueioTela = null;
let temporizadorCursor = null;

function renderizarPatrocinadores(indiceRoteiro) {
    const ocorrencia = roteiro.slice(0, indiceRoteiro + 1).filter(etapa => etapa.id === 'patrocinadores').length - 1;
    const inicio = (ocorrencia % Math.ceil(patrocinadores.length / 3)) * 3;
    const grupo = patrocinadores.slice(inicio, inicio + 3);
    patrocinadoresContainer.classList.toggle('duas-marcas', grupo.length === 2);
    patrocinadoresContainer.replaceChildren(...grupo.map(([arquivo, nome]) => {
        const card = document.createElement('div');
        card.className = 'marca-telao';
        const imagem = document.createElement('img');
        imagem.src = `assets/patrocinadores/${arquivo}`;
        imagem.alt = nome;
        card.appendChild(imagem);
        return card;
    }));
}

function exibirSlide(novoIndice) {
    clearTimeout(temporizador);
    indice = (novoIndice + roteiro.length) % roteiro.length;
    const etapa = roteiro[indice];
    slides.forEach((slide, id) => {
        const ativo = id === etapa.id;
        slide.hidden = !ativo;
        slide.classList.toggle('ativo', ativo);
    });
    if (etapa.id === 'patrocinadores') renderizarPatrocinadores(indice);
    if (!pausado) temporizador = setTimeout(() => exibirSlide(indice + 1), etapa.duracao);
}

function alternarPausa() {
    pausado = !pausado;
    btnPausar.textContent = pausado ? 'Continuar' : 'Pausar';
    document.body.classList.toggle('apresentacao-pausada', pausado);
    exibirSlide(indice);
}

async function manterTelaAcordada() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
        bloqueioTela = await navigator.wakeLock.request('screen');
    } catch (erro) {
        console.info('O navegador não permitiu manter a tela acordada.', erro);
    }
}

function mostrarControles() {
    document.body.classList.remove('sem-cursor');
    clearTimeout(temporizadorCursor);
    temporizadorCursor = setTimeout(() => document.body.classList.add('sem-cursor'), 2600);
}

document.getElementById('btn-anterior').addEventListener('click', () => exibirSlide(indice - 1));
document.getElementById('btn-proximo').addEventListener('click', () => exibirSlide(indice + 1));
btnPausar.addEventListener('click', alternarPausa);
document.getElementById('btn-tela-cheia-evento').addEventListener('click', () => document.documentElement.requestFullscreen?.());
document.addEventListener('dblclick', () => document.documentElement.requestFullscreen?.());
document.addEventListener('mousemove', mostrarControles);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!bloqueioTela || bloqueioTela.released)) manterTelaAcordada();
});
document.addEventListener('keydown', evento => {
    if (evento.key === 'ArrowRight') exibirSlide(indice + 1);
    if (evento.key === 'ArrowLeft') exibirSlide(indice - 1);
    if (evento.key === ' ') {
        evento.preventDefault();
        alternarPausa();
    }
    if (evento.key.toLowerCase() === 'f') document.documentElement.requestFullscreen?.();
});

if (window.QRCode) {
    new QRCode(document.getElementById('qrcode-app-telao'), {
        text: 'https://semau.space', width: 300, height: 300,
        colorDark: '#0d372b', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H
    });
} else {
    document.getElementById('qrcode-app-telao').innerHTML = '<span class="qr-fallback">semau.space</span>';
}

patrocinadores.forEach(([arquivo]) => {
    const imagem = new Image();
    imagem.src = `assets/patrocinadores/${arquivo}`;
});

exibirSlide(0);
manterTelaAcordada();
mostrarControles();

