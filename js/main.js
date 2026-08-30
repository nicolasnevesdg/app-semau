import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    VERSAO_CONTEUDO_CRONOGRAMA,
    PROGRAMACAO_AO_VIVO_PADRAO,
    clonarProgramacao,
    normalizarProgramacao,
    temProgramacaoValida
} from './programacao-ao-vivo-config.js?v=157';
// ==========================================
// STATUS AUTOMÁTICO DA XVI SEMAU
// ==========================================

const INICIO_DIA_EVENTO = new Date(2026, 8, 21, 0, 0, 0);
const INICIO_EVENTO = new Date(2026, 8, 21, 8, 0, 0);
const FIM_EVENTO = new Date(2026, 8, 25, 23, 59, 59);

// PRÉVIA TEMPORÁRIA: após o encerramento definitivo do evento.
// Troque por null para voltar a usar a data e o horário reais do aparelho.
const DATA_DE_TESTE = null;

let PROGRAMACAO_AO_VIVO = clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);

const elDias = document.getElementById('cd-dias');
const elHoras = document.getElementById('cd-horas');
const elMin = document.getElementById('cd-min');
const statusContagem = document.getElementById('evento-status-contagem');
const statusChamada = statusContagem?.querySelector('.evento-status-chamada');
const canvasFogosEvento = document.getElementById('fogos-evento-canvas');
const contextoFogosEvento = canvasFogosEvento?.getContext('2d');
const statusAoVivo = document.getElementById('evento-status-ao-vivo');
const statusEtiqueta = document.getElementById('evento-status-etiqueta');
const statusTitulo = document.getElementById('evento-status-titulo');
const statusTexto = document.getElementById('evento-status-texto');
const statusHorario = document.getElementById('evento-status-horario');
const statusHorarioTexto = statusHorario?.querySelector('span');
const btnProgramacao = document.getElementById('btn-fase-cronograma');

function doisDigitos(valor) {
    return String(valor).padStart(2, '0');
}

function chaveLocal(data) {
    return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function horarioEmMinutos(horario) {
    const [hora, minuto] = horario.split(':').map(Number);
    return hora * 60 + minuto;
}

function minutosDeAgora(data) {
    return data.getHours() * 60 + data.getMinutes();
}

let quadroFogosEvento = null;
let particulasFogosEvento = [];
let proximoFogoEvento = 0;

function ajustarCanvasFogosEvento() {
    if (!canvasFogosEvento || !contextoFogosEvento) return;
    const area = canvasFogosEvento.parentElement.getBoundingClientRect();
    const escala = Math.min(window.devicePixelRatio || 1, 2);
    canvasFogosEvento.width = Math.round(area.width * escala);
    canvasFogosEvento.height = Math.round(area.height * escala);
    canvasFogosEvento.style.left = area.left + 'px';
    canvasFogosEvento.style.top = area.top + 'px';
    canvasFogosEvento.style.width = `${area.width}px`;
    canvasFogosEvento.style.height = `${area.height}px`;
    contextoFogosEvento.setTransform(escala, 0, 0, escala, 0, 0);
}

function criarFogoEvento(largura, altura) {
    const cores = ['#f0782c', '#809acd', '#b1beaa', '#ffffff'];
    const x = largura * (.12 + Math.random() * .76);
    const y = altura * (.12 + Math.random() * .52);
    const quantidade = 34 + Math.floor(Math.random() * 16);
    const cor = cores[Math.floor(Math.random() * cores.length)];

    for (let indice = 0; indice < quantidade; indice += 1) {
        const angulo = (Math.PI * 2 * indice / quantidade) + (Math.random() - .5) * .16;
        const velocidade = 1.4 + Math.random() * 3.2;
        particulasFogosEvento.push({
            x,
            y,
            vx: Math.cos(angulo) * velocidade,
            vy: Math.sin(angulo) * velocidade,
            gravidade: .022 + Math.random() * .018,
            atrito: .985,
            alfa: 1,
            perda: .012 + Math.random() * .009,
            tamanho: 1.7 + Math.random() * 2.4,
            cor
        });
    }
}

function desenharFogosEvento(tempo) {
    if (!canvasFogosEvento || !contextoFogosEvento) return;
    const largura = canvasFogosEvento.clientWidth;
    const altura = canvasFogosEvento.clientHeight;
    contextoFogosEvento.clearRect(0, 0, largura, altura);

    if (tempo >= proximoFogoEvento) {
        criarFogoEvento(largura, altura);
        if (Math.random() > .55) criarFogoEvento(largura, altura);
        proximoFogoEvento = tempo + 620 + Math.random() * 520;
    }

    particulasFogosEvento.forEach(particula => {
        particula.x += particula.vx;
        particula.y += particula.vy;
        particula.vx *= particula.atrito;
        particula.vy = particula.vy * particula.atrito + particula.gravidade;
        particula.alfa -= particula.perda;
        contextoFogosEvento.globalAlpha = Math.max(0, particula.alfa);
        contextoFogosEvento.fillStyle = particula.cor;
        contextoFogosEvento.beginPath();
        contextoFogosEvento.arc(particula.x, particula.y, particula.tamanho, 0, Math.PI * 2);
        contextoFogosEvento.fill();
    });

    contextoFogosEvento.globalAlpha = 1;
    particulasFogosEvento = particulasFogosEvento.filter(particula => particula.alfa > 0);
    quadroFogosEvento = requestAnimationFrame(desenharFogosEvento);
}

function iniciarFogosEvento() {
    if (!canvasFogosEvento || !contextoFogosEvento || quadroFogosEvento) return;
    canvasFogosEvento.style.display = 'block';
    ajustarCanvasFogosEvento();
    proximoFogoEvento = 0;
    quadroFogosEvento = requestAnimationFrame(desenharFogosEvento);
}

function pararFogosEvento() {
    if (quadroFogosEvento) cancelAnimationFrame(quadroFogosEvento);
    quadroFogosEvento = null;
    particulasFogosEvento = [];
    if (contextoFogosEvento && canvasFogosEvento) {
        contextoFogosEvento.clearRect(0, 0, canvasFogosEvento.clientWidth, canvasFogosEvento.clientHeight);
        canvasFogosEvento.style.display = 'none';
    }
}

window.addEventListener('resize', () => {
    if (quadroFogosEvento) ajustarCanvasFogosEvento();
});
function mostrarContagem(agora) {
    const celebrandoInicio = agora >= INICIO_DIA_EVENTO && agora < INICIO_EVENTO;
    const distancia = Math.max(0, INICIO_DIA_EVENTO.getTime() - agora.getTime());
    const dias = Math.floor(distancia / 86400000);
    const horas = Math.floor((distancia % 86400000) / 3600000);
    const minutos = Math.floor((distancia % 3600000) / 60000);

    statusContagem.hidden = false;
    statusAoVivo.hidden = true;
    statusContagem.classList.toggle('evento-comecou', celebrandoInicio);
    if (celebrandoInicio) iniciarFogosEvento();
    else pararFogosEvento();
    if (statusChamada) statusChamada.textContent = celebrandoInicio ? 'É hoje!' : 'Faltam apenas';
    elDias.textContent = doisDigitos(dias);
    elHoras.textContent = doisDigitos(horas);
    elMin.textContent = doisDigitos(minutos);
    if (btnProgramacao) btnProgramacao.textContent = 'Ver Programação';
}

function mostrarStatus({ etiqueta, titulo, texto, horario = '' }) {
    pararFogosEvento();
    statusContagem.hidden = true;
    statusAoVivo.hidden = false;
    statusEtiqueta.textContent = etiqueta;
    statusTitulo.textContent = titulo;
    statusTexto.textContent = texto;
    statusHorario.hidden = !horario;
    if (statusHorarioTexto) statusHorarioTexto.textContent = horario;
}

function proximoDiaComProgramacao(dataAtual) {
    const cursor = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate() + 1);
    while (cursor <= FIM_EVENTO) {
        const atividades = PROGRAMACAO_AO_VIVO[chaveLocal(cursor)];
        if (atividades?.length) return { data: cursor, atividades };
        cursor.setDate(cursor.getDate() + 1);
    }
    return null;
}

function formatarDia(data) {
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).format(data);
}

function mostrarDepoisDoEvento() {
    mostrarStatus({
        etiqueta: 'Até a próxima',
        titulo: 'A SEMAU fica com a gente.',
        texto: 'Cinco dias que agora viram mem\u00f3ria.'
    });
    if (btnProgramacao) btnProgramacao.textContent = 'Rever programação';
}

function atualizarStatusDoEvento() {
    const agora = DATA_DE_TESTE ? new Date(DATA_DE_TESTE) : new Date();

    if (agora < INICIO_EVENTO) {
        mostrarContagem(agora);
        return;
    }

    if (agora >= FIM_EVENTO) {
        mostrarDepoisDoEvento();
        return;
    }

    const programacaoHoje = PROGRAMACAO_AO_VIVO[chaveLocal(agora)];

    if (!programacaoHoje?.length) {
        const proximoDia = proximoDiaComProgramacao(agora);
        if (proximoDia) {
            mostrarStatus({
                etiqueta: 'A semana continua',
                titulo: 'Por hoje, \u00e9 isso.',
                texto: `Continuamos ${formatarDia(proximoDia.data)}, \u00e0s ${proximoDia.atividades[0].inicio}.`
            });
        } else {
            mostrarDepoisDoEvento();
        }
        return;
    }

    const agoraEmMinutos = minutosDeAgora(agora);
    const primeira = programacaoHoje[0];
    const ultima = programacaoHoje[programacaoHoje.length - 1];

    if (agoraEmMinutos < horarioEmMinutos(primeira.inicio)) {
        mostrarStatus({
            etiqueta: 'Hoje na SEMAU',
            titulo: 'Come\u00e7a j\u00e1 j\u00e1.',
            texto: `Primeira atividade \u00e0s ${primeira.inicio}.`,
            horario: `${primeira.inicio} · ${primeira.titulo}`
        });
        return;
    }

    const momentos = programacaoHoje.filter(item =>
        agoraEmMinutos >= horarioEmMinutos(item.inicio) && agoraEmMinutos < horarioEmMinutos(item.fim)
    );

    if (momentos.length) {
        const momento = momentos[0];
        const proxima = programacaoHoje.find(item => horarioEmMinutos(item.inicio) >= horarioEmMinutos(momento.fim));
        const tituloMomento = momentos.length > 1 ? momentos.map(item => item.titulo).join(' + ') : momento.titulo;
        const textoMomento = momentos.map(item => item.texto).filter(Boolean).join(' · ');

        if (momento.tipo === 'almoco') {
            mostrarStatus({
                etiqueta: 'Pausa',
                titulo: momento.titulo || 'Pausa pro almo\u00e7o.',
                texto: momento.texto || (proxima ? `Voltamos \u00e0s ${proxima.inicio}.` : 'Voltamos em breve.'),
                horario: `${momento.inicio}–${momento.fim}`
            });
        } else if (momento.tipo === 'intervalo') {
            mostrarStatus({
                etiqueta: 'Intervalo',
                titulo: momento.titulo || 'Um respiro.',
                texto: momento.texto || (proxima ? `Pr\u00f3xima atividade \u00e0s ${proxima.inicio}.` : 'Continuamos em breve.'),
                horario: `${momento.inicio}–${momento.fim}`
            });
        } else {
            mostrarStatus({
                etiqueta: 'Acontecendo agora',
                titulo: tituloMomento,
                texto: textoMomento || (proxima ? `Depois, ${proxima.inicio}: ${proxima.titulo}.` : '\u00daltima atividade de hoje.'),
                horario: `${momento.inicio}–${momento.fim}`
            });
        }

        if (btnProgramacao) btnProgramacao.textContent = 'Ver programação de hoje';
        return;
    }

    if (agoraEmMinutos >= horarioEmMinutos(ultima.fim)) {
        const proximoDia = proximoDiaComProgramacao(agora);
        if (proximoDia) {
            mostrarStatus({
                etiqueta: 'Até amanhã',
                titulo: 'Por hoje, \u00e9 isso.',
                texto: `A SEMAU continua ${formatarDia(proximoDia.data)}, \u00e0s ${proximoDia.atividades[0].inicio}.`
            });
        } else {
            mostrarDepoisDoEvento();
        }
        return;
    }

    const proxima = programacaoHoje.find(item => horarioEmMinutos(item.inicio) > agoraEmMinutos);
    mostrarStatus({
        etiqueta: 'Próxima atividade',
        titulo: proxima?.titulo || 'A programação continua em breve.',
        texto: proxima ? `Come\u00e7a \u00e0s ${proxima.inicio}.` : '',
        horario: proxima ? `${proxima.inicio}–${proxima.fim}` : ''
    });
}

onSnapshot(doc(db, 'configuracoes', 'cronogramaAoVivo'), snapshot => {
    const dados = snapshot.data();
    const programacaoRemota = normalizarProgramacao(dados?.programacao);
    PROGRAMACAO_AO_VIVO = dados?.versaoConteudo === VERSAO_CONTEUDO_CRONOGRAMA && temProgramacaoValida(programacaoRemota)
        ? programacaoRemota
        : clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
    atualizarStatusDoEvento();
}, error => {
    console.warn('Não foi possível sincronizar o cronograma ao vivo.', error);
});

atualizarStatusDoEvento();
setInterval(atualizarStatusDoEvento, 1000);
