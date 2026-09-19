const patrocinadores = [
    ['logifab.png', 'Logifab'], ['voitto.png', 'Voitto'], ['cura-marca-branco.png', 'Cura'],
    ['peanuts-bakery.png', 'Peanuts Bakery'], ['choco-latte.png', 'Choco Latte'],
    ['venus-artesa.png', 'Vênus Artesã'], ['studio3-papelaria.png', 'Studio 3 Papelaria'], ['jardim-de-papel.png', 'Jardim de Papel'],
    ['manufatura-atelie.png', 'Manufatura Ateliê'], ['precinho-ruralino.png', 'Ruralino'], ['fireprint.png', 'Fireprint Gráfica'],
    ['aura.png', 'Arquitetura Aura'], ['euphoria-atelie.png', 'Euphoria Ateliê'], ['canson.png', 'Canson'],
    ['arqstream.png', 'Arqstream'], ['doce-carol.png', 'Doce Carol'], ['so-fachada.png', 'Só Fachada Podcast'],
    ['jm.png', 'JM Sacolé Gourmet'], ['gastrobarr-vo-sacasa-clara.png', 'Gastrobar Vó Sacasa'],
    ['nut-acessorios.png', 'Nut Acessórios'], ['saborecalor.png', 'Sabor e Calor'],
    ['doce-sensacao.png', 'Doce Sensação'], ['pitoresco.png', 'Pitoresco Eventos']
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
let indiceGrupoPatrocinadores = 0;
let pausado = false;
let temporizador = null;
let bloqueioTela = null;
let temporizadorCursor = null;
let logosNormalizadas = [];

function limitesVisiveisDaLogo(imagem) {
    const maiorLado = Math.max(imagem.naturalWidth, imagem.naturalHeight);
    const escala = Math.min(1, 420 / maiorLado);
    const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
    const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext('2d', { willReadFrequently: true });
    if (!contexto) return { esquerda: 0, topo: 0, largura: 1, altura: 1 };
    contexto.drawImage(imagem, 0, 0, largura, altura);

    try {
        const pixels = contexto.getImageData(0, 0, largura, altura).data;
        let esquerda = largura;
        let direita = -1;
        let topo = altura;
        let base = -1;
        for (let y = 0; y < altura; y += 1) {
            for (let x = 0; x < largura; x += 1) {
                if (pixels[((y * largura + x) * 4) + 3] < 18) continue;
                esquerda = Math.min(esquerda, x);
                direita = Math.max(direita, x);
                topo = Math.min(topo, y);
                base = Math.max(base, y);
            }
        }
        if (direita < esquerda || base < topo) throw new Error('Logo sem pixels visíveis.');
        return {
            esquerda: esquerda / largura,
            topo: topo / altura,
            largura: (direita - esquerda + 1) / largura,
            altura: (base - topo + 1) / altura
        };
    } catch (_) {
        return { esquerda: 0, topo: 0, largura: 1, altura: 1 };
    }
}

function aplicarEscalaVisualLogo(item) {
    const { imagem, frame, limites } = item;
    const proporcaoVisivel = (imagem.naturalWidth * limites.largura) / (imagem.naturalHeight * limites.altura);
    const larguraMaxima = Math.min(430, innerWidth * .235);
    const alturaMaxima = Math.min(310, innerHeight * .29);
    const areaAlvo = larguraMaxima * alturaMaxima * .62;
    let larguraVisivel = Math.sqrt(areaAlvo * proporcaoVisivel);
    let alturaVisivel = larguraVisivel / proporcaoVisivel;
    const reducao = Math.min(1, larguraMaxima / larguraVisivel, alturaMaxima / alturaVisivel);
    larguraVisivel *= reducao;
    alturaVisivel *= reducao;

    const larguraImagem = larguraVisivel / limites.largura;
    const alturaImagem = alturaVisivel / limites.altura;
    frame.style.width = `${larguraVisivel}px`;
    frame.style.height = `${alturaVisivel}px`;
    imagem.style.width = `${larguraImagem}px`;
    imagem.style.height = `${alturaImagem}px`;
    imagem.style.left = `${-(limites.esquerda * larguraImagem)}px`;
    imagem.style.top = `${-(limites.topo * alturaImagem)}px`;
}

function prepararEscalaLogo(imagem, frame) {
    if (!frame.isConnected) return;
    const item = { imagem, frame, limites: limitesVisiveisDaLogo(imagem) };
    logosNormalizadas.push(item);
    aplicarEscalaVisualLogo(item);
}

function renderizarPatrocinadores() {
    const totalGrupos = Math.ceil(patrocinadores.length / 3);
    const inicio = (indiceGrupoPatrocinadores % totalGrupos) * 3;
    const grupo = patrocinadores.slice(inicio, inicio + 3);
    indiceGrupoPatrocinadores = (indiceGrupoPatrocinadores + 1) % totalGrupos;
    logosNormalizadas = [];
    patrocinadoresContainer.classList.toggle('duas-marcas', grupo.length === 2);
    patrocinadoresContainer.replaceChildren(...grupo.map(([arquivo, nome]) => {
        const card = document.createElement('div');
        card.className = 'marca-telao';
        const frame = document.createElement('div');
        frame.className = 'logo-telao-frame';
        const imagem = document.createElement('img');
        imagem.alt = nome;
        imagem.addEventListener('load', () => prepararEscalaLogo(imagem, frame), { once: true });
        imagem.src = `assets/patrocinadores/${arquivo}`;
        frame.appendChild(imagem);
        card.appendChild(frame);
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
    if (etapa.id === 'patrocinadores') renderizarPatrocinadores();
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
window.addEventListener('resize', () => logosNormalizadas.forEach(aplicarEscalaVisualLogo));
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

