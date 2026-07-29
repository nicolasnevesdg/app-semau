const canal = 'BroadcastChannel' in window ? new BroadcastChannel('semau-sorteio') : null;
const estadoEspera = document.getElementById('estado-espera');
const estadoSorteando = document.getElementById('estado-sorteando');
const estadoResultado = document.getElementById('estado-resultado');
const nomeRodando = document.getElementById('nome-rodando');
const contagem = document.getElementById('contagem-sorteio');
const nomeGanhador = document.getElementById('nome-ganhador');
const turnoGanhador = document.getElementById('turno-ganhador');
const canvas = document.getElementById('confetes');
const contexto = canvas.getContext('2d');
let animacaoNomes = null;
let timers = [];
let particulas = [];
let quadroConfetes = null;

function publicar(mensagem) {
    canal?.postMessage(mensagem);
    localStorage.setItem('semau-sorteio-mensagem', JSON.stringify({ ...mensagem, enviadoEm: Date.now() }));
}

function mostrar(apenas) {
    [estadoEspera, estadoSorteando, estadoResultado].forEach(estado => estado.hidden = estado !== apenas);
}

function limparAnimacoes() {
    if (animacaoNomes) clearInterval(animacaoNomes);
    timers.forEach(clearTimeout);
    timers = [];
    if (quadroConfetes) cancelAnimationFrame(quadroConfetes);
    quadroConfetes = null;
    particulas = [];
    contexto.clearRect(0, 0, canvas.width, canvas.height);
}

function ajustarCanvas() {
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * escala);
    canvas.height = Math.round(innerHeight * escala);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    contexto.setTransform(escala, 0, 0, escala, 0, 0);
}

function mostrarNumero(numero) {
    contagem.textContent = numero;
    contagem.classList.remove('ativa');
    void contagem.offsetWidth;
    contagem.classList.add('ativa');
}

function iniciarConfetes() {
    ajustarCanvas();
    const cores = ['#f0782c', '#809acd', '#b1beaa', '#ffffff', '#f2c94c'];
    particulas = Array.from({ length: 230 }, (_, indice) => ({
        x: innerWidth * (.15 + Math.random() * .7),
        y: innerHeight * (.35 + Math.random() * .12),
        vx: (Math.random() - .5) * 16,
        vy: -5 - Math.random() * 12,
        gravidade: .18 + Math.random() * .16,
        rotacao: Math.random() * Math.PI,
        giro: (Math.random() - .5) * .24,
        largura: 5 + Math.random() * 9,
        altura: 3 + Math.random() * 6,
        cor: cores[indice % cores.length],
        vida: 150 + Math.random() * 90
    }));

    function desenhar() {
        contexto.clearRect(0, 0, innerWidth, innerHeight);
        particulas.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravidade;
            p.vx *= .992;
            p.rotacao += p.giro;
            p.vida -= 1;
            contexto.save();
            contexto.translate(p.x, p.y);
            contexto.rotate(p.rotacao);
            contexto.fillStyle = p.cor;
            contexto.fillRect(-p.largura / 2, -p.altura / 2, p.largura, p.altura);
            contexto.restore();
        });
        particulas = particulas.filter(p => p.vida > 0 && p.y < innerHeight + 80);
        if (particulas.length) quadroConfetes = requestAnimationFrame(desenhar);
        else contexto.clearRect(0, 0, innerWidth, innerHeight);
    }
    desenhar();
}

function iniciarSorteio(dados) {
    limparAnimacoes();
    const nomes = Array.isArray(dados.nomes) && dados.nomes.length ? dados.nomes : ['XVI SEMAU'];
    mostrar(estadoSorteando);
    contagem.textContent = '';
    nomeRodando.style.opacity = '1';
    nomeRodando.style.visibility = 'visible';

    let indice = 0;
    nomeRodando.textContent = nomes[0];
    animacaoNomes = setInterval(() => {
        indice = (indice + 1) % nomes.length;
        nomeRodando.textContent = nomes[indice];
    }, 90);

    timers.push(setTimeout(() => {
        clearInterval(animacaoNomes);
        nomeRodando.style.opacity = '0';
        nomeRodando.style.visibility = 'hidden';
        mostrarNumero('3');
    }, 3000));
    timers.push(setTimeout(() => mostrarNumero('2'), 4000));
    timers.push(setTimeout(() => mostrarNumero('1'), 5000));
    timers.push(setTimeout(() => {
        nomeGanhador.textContent = dados.ganhador;
        turnoGanhador.textContent = dados.turno || '';
        mostrar(estadoResultado);
        iniciarConfetes();
        publicar({ tipo: 'revelado', ganhador: dados.ganhador });
    }, 6100));
}

function receber(dados) {
    if (!dados || dados.tipo !== 'sortear') return;
    iniciarSorteio(dados);
}

if (canal) canal.onmessage = evento => receber(evento.data);
window.addEventListener('storage', evento => {
    if (evento.key !== 'semau-sorteio-mensagem' || !evento.newValue) return;
    try { receber(JSON.parse(evento.newValue)); } catch (error) { console.error(error); }
});

window.addEventListener('resize', ajustarCanvas);
document.getElementById('btn-tela-cheia').addEventListener('click', async () => {
    try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
    } catch (error) { console.error('Não foi possível ativar a tela cheia:', error); }
});

publicar({ tipo: 'tela-pronta' });
const pulsoConexao = setInterval(() => publicar({ tipo: 'tela-pronta' }), 2500);
window.addEventListener('beforeunload', () => clearInterval(pulsoConexao));
window.addEventListener('beforeunload', () => publicar({ tipo: 'tela-fechada' }));
