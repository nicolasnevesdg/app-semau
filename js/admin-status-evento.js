import { db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    DIAS_EVENTO,
    VERSAO_CONTEUDO_CRONOGRAMA,
    PROGRAMACAO_AO_VIVO_PADRAO,
    clonarProgramacao,
    horarioEmMinutos,
    normalizarProgramacao,
    temProgramacaoValida
} from './programacao-ao-vivo-config.js?v=20260915-4';

const EMAIL_CONTA_ADMINISTRATIVA = 'admin@semauufrrj.com';
const CHAVE_SIMULACAO_STATUS = 'semauStatusEventoSimuladoV1';
const CANAL_SIMULACAO_STATUS = 'semau-status-evento';
const DURACAO_SIMULACAO_MS = 30 * 60 * 1000;
const INICIO_LINHA = new Date(2026, 8, 21, 0, 0, 0, 0);
const FIM_LINHA = new Date(2026, 8, 25, 23, 59, 0, 0);
const TOTAL_MINUTOS = Math.round((FIM_LINHA - INICIO_LINHA) / 60000);

const overlayLogin = document.getElementById('admin-login-overlay');
const formLogin = document.getElementById('form-admin-login');
const inputSenha = document.getElementById('admin-senha-input');
const btnLogin = document.getElementById('btn-admin-login');
const diasContainer = document.getElementById('simulador-dias');
const linhaTempo = document.getElementById('simulador-linha-tempo');
const dataHoraInput = document.getElementById('simulador-data-hora');
const dataExibida = document.getElementById('simulador-data-exibida');
const atividadeAtual = document.getElementById('simulador-atividade-atual');
const estado = document.getElementById('simulador-estado');
const btnAtivar = document.getElementById('btn-ativar-simulacao');
const btnHorarioReal = document.getElementById('btn-horario-real');
const btnAbrirPrincipal = document.getElementById('btn-abrir-principal');
const mensagem = document.getElementById('simulador-mensagem');
const tituloAtalhos = document.getElementById('simulador-dia-atalhos');
const atividadesContainer = document.getElementById('simulador-atividades');
const iframe = document.getElementById('simulador-iframe');

let programacaoAtual = clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
let dataSelecionada = new Date(2026, 8, 21, 8, 0, 0, 0);
let simulacaoAtiva = false;
let simuladorInicializado = false;
let temporizadorPublicacao = null;
const canal = 'BroadcastChannel' in window ? new BroadcastChannel(CANAL_SIMULACAO_STATUS) : null;

function doisDigitos(valor) {
    return String(valor).padStart(2, '0');
}

function escaparHtml(valor) {
    return String(valor || '').replace(/[&<>'"]/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[caractere]);
}

function chaveLocal(data) {
    return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function valorDataHoraLocal(data) {
    return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}T${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

function limitarData(data) {
    const valor = data instanceof Date ? data.getTime() : Number.NaN;
    if (!Number.isFinite(valor)) return new Date(dataSelecionada);
    return new Date(Math.min(FIM_LINHA.getTime(), Math.max(INICIO_LINHA.getTime(), valor)));
}

function posicaoDaData(data) {
    return Math.round((limitarData(data) - INICIO_LINHA) / 60000);
}

function dataDaPosicao(posicao) {
    return new Date(INICIO_LINHA.getTime() + Number(posicao) * 60000);
}

function dadosSimulacaoSalvos() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_SIMULACAO_STATUS) || 'null');
        const dataHora = new Date(dados?.dataHora || '');
        if (dados?.ativa !== true || !Number.isFinite(dataHora.getTime()) || Number(dados.expiraEm || 0) <= Date.now()) return null;
        return dados;
    } catch {
        return null;
    }
}

function anunciarMudanca() {
    canal?.postMessage({ tipo: 'horario-simulado' });
}

function salvarSimulacao() {
    const dados = {
        ativa: true,
        dataHora: dataSelecionada.toISOString(),
        expiraEm: Date.now() + DURACAO_SIMULACAO_MS
    };
    localStorage.setItem(CHAVE_SIMULACAO_STATUS, JSON.stringify(dados));
    anunciarMudanca();
    simulacaoAtiva = true;
    atualizarEstado();
    mensagem.textContent = 'Tela principal sincronizada neste navegador.';
}

function agendarSimulacao() {
    if (!simulacaoAtiva) return;
    window.clearTimeout(temporizadorPublicacao);
    temporizadorPublicacao = window.setTimeout(salvarSimulacao, 180);
}

function desativarSimulacao() {
    window.clearTimeout(temporizadorPublicacao);
    localStorage.removeItem(CHAVE_SIMULACAO_STATUS);
    anunciarMudanca();
    simulacaoAtiva = false;
    atualizarEstado();
    mensagem.textContent = 'A tela principal voltou a usar o relógio verdadeiro.';
}

function atividadesDoDia(data) {
    return programacaoAtual[chaveLocal(data)] || [];
}

function atividadeNoMomento(data) {
    const minuto = data.getHours() * 60 + data.getMinutes();
    const atividades = atividadesDoDia(data);
    const ocorrendo = atividades.filter(item => minuto >= horarioEmMinutos(item.inicio) && minuto < horarioEmMinutos(item.fim));
    if (ocorrendo.length) return ocorrendo.map(item => item.titulo).join(' + ');
    const proxima = atividades.find(item => horarioEmMinutos(item.inicio) > minuto);
    if (proxima) return `Próxima: ${proxima.inicio} · ${proxima.titulo}`;
    return atividades.length ? 'Programação deste dia encerrada.' : 'Sem atividades neste dia.';
}

function renderizarDias() {
    const chaveAtiva = chaveLocal(dataSelecionada);
    diasContainer.innerHTML = DIAS_EVENTO.map(dia => `
        <button type="button" class="simulador-dia${dia.chave === chaveAtiva ? ' ativo' : ''}" data-dia="${dia.chave}">
            <strong>${dia.dataCurta}</strong><span>${dia.nome.replace('-feira', '')}</span>
        </button>`).join('');
}

function renderizarAtalhos() {
    const chave = chaveLocal(dataSelecionada);
    const dia = DIAS_EVENTO.find(item => item.chave === chave);
    const atividades = atividadesDoDia(dataSelecionada);
    const minuto = dataSelecionada.getHours() * 60 + dataSelecionada.getMinutes();
    tituloAtalhos.textContent = dia ? `${dia.nome} · ${dia.dataCurta}` : 'Atividades do dia';
    atividadesContainer.innerHTML = atividades.length ? atividades.map(item => {
        const acontecendo = minuto >= horarioEmMinutos(item.inicio) && minuto < horarioEmMinutos(item.fim);
        return `<button type="button" class="simulador-atividade${acontecendo ? ' acontecendo' : ''}" data-horario="${escaparHtml(item.inicio)}"><strong>${escaparHtml(item.inicio)}–${escaparHtml(item.fim)}</strong><span>${escaparHtml(item.titulo)}</span></button>`;
    }).join('') : '<p class="simulador-mensagem">Nenhuma atividade publicada para este dia.</p>';
}

function atualizarSelecao(data, publicar = true) {
    dataSelecionada = limitarData(data);
    linhaTempo.max = String(TOTAL_MINUTOS);
    linhaTempo.value = String(posicaoDaData(dataSelecionada));
    dataHoraInput.value = valorDataHoraLocal(dataSelecionada);
    dataExibida.textContent = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(dataSelecionada);
    atividadeAtual.textContent = atividadeNoMomento(dataSelecionada);
    renderizarDias();
    renderizarAtalhos();
    if (publicar) agendarSimulacao();
}

function atualizarEstado() {
    estado.dataset.ativo = String(simulacaoAtiva);
    estado.innerHTML = `<i></i>${simulacaoAtiva ? 'Simulação ativa' : 'Horário real'}`;
    btnHorarioReal.hidden = !simulacaoAtiva;
    btnAtivar.innerHTML = simulacaoAtiva
        ? '<i class="ph-bold ph-broadcast"></i> Atualizar simulação'
        : '<i class="ph-bold ph-play"></i> Ativar simulação';
}

function sincronizarEstadoSalvo() {
    const salvo = dadosSimulacaoSalvos();
    simulacaoAtiva = Boolean(salvo);
    if (salvo) atualizarSelecao(new Date(salvo.dataHora), false);
    atualizarEstado();
}

function horarioInicialDoDia(chave) {
    const atividade = (programacaoAtual[chave] || [])[0];
    const [hora, minuto] = (atividade?.inicio || '08:00').split(':').map(Number);
    const [ano, mes, dia] = chave.split('-').map(Number);
    return new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
}

async function credencialAdministrativaValida(credencial) {
    const seguranca = await getDoc(doc(db, 'configuracoes', 'seguranca'));
    if (seguranca.exists() && credencial === String(seguranca.data().senhaAdmin || '')) return true;
    const token = credencial.toUpperCase();
    const consulta = query(collection(db, 'inscritos'), where('email', '==', EMAIL_CONTA_ADMINISTRATIVA), where('token', '==', token));
    const resultado = await getDocs(consulta);
    return resultado.docs.some(documento => documento.data().ingressoAtivo !== false);
}

function inicializarSimulador() {
    if (simuladorInicializado) return;
    simuladorInicializado = true;
    sincronizarEstadoSalvo();
    atualizarSelecao(dataSelecionada, false);

    onSnapshot(doc(db, 'configuracoes', 'cronogramaAoVivo'), snapshot => {
        const dados = snapshot.data();
        const remota = normalizarProgramacao(dados?.programacao);
        programacaoAtual = dados?.versaoConteudo === VERSAO_CONTEUDO_CRONOGRAMA && temProgramacaoValida(remota)
            ? remota
            : clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
        atualizarSelecao(dataSelecionada, false);
    }, () => atualizarSelecao(dataSelecionada, false));
}

function liberarSimulador() {
    overlayLogin.style.display = 'none';
    inicializarSimulador();
}

formLogin.addEventListener('submit', async evento => {
    evento.preventDefault();
    const credencial = inputSenha.value.trim();
    if (!credencial) return;
    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando…';
    try {
        if (!await credencialAdministrativaValida(credencial)) {
            window.alert('Senha ou token administrativo incorreto.');
            inputSenha.value = '';
            inputSenha.focus();
            return;
        }
        sessionStorage.setItem('adminLogado', 'true');
        liberarSimulador();
    } catch (error) {
        console.error(error);
        window.alert('Não foi possível verificar o acesso. Confira sua conexão.');
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Acessar simulador';
    }
});

diasContainer.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-dia]');
    if (botao) atualizarSelecao(horarioInicialDoDia(botao.dataset.dia));
});

atividadesContainer.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-horario]');
    if (!botao) return;
    const [hora, minuto] = botao.dataset.horario.split(':').map(Number);
    const novaData = new Date(dataSelecionada);
    novaData.setHours(hora, minuto, 0, 0);
    atualizarSelecao(novaData);
});

linhaTempo.addEventListener('input', () => atualizarSelecao(dataDaPosicao(linhaTempo.value)));
dataHoraInput.addEventListener('input', () => {
    const novaData = new Date(dataHoraInput.value);
    if (Number.isFinite(novaData.getTime())) atualizarSelecao(novaData);
});

document.querySelectorAll('[data-minutos]').forEach(botao => {
    botao.addEventListener('click', () => atualizarSelecao(new Date(dataSelecionada.getTime() + Number(botao.dataset.minutos) * 60000)));
});

btnAtivar.addEventListener('click', salvarSimulacao);
btnHorarioReal.addEventListener('click', desativarSimulacao);
btnAbrirPrincipal.addEventListener('click', () => window.open('index.html?simulacao-status=1', 'semau-status-principal'));

window.addEventListener('storage', evento => {
    if (evento.key === CHAVE_SIMULACAO_STATUS) sincronizarEstadoSalvo();
});
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sincronizarEstadoSalvo();
});

window.setInterval(() => {
    if (simulacaoAtiva && !dadosSimulacaoSalvos()) {
        simulacaoAtiva = false;
        atualizarEstado();
        anunciarMudanca();
        mensagem.textContent = 'A simulação expirou e o horário real foi restaurado.';
    }
}, 5000);

if (sessionStorage.getItem('adminLogado') === 'true') liberarSimulador();
