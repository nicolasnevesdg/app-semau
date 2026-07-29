// ==========================================
// 1. CAPTURANDO OS ELEMENTOS DO HTML
// ==========================================

const viewHome = document.getElementById('view-home');
const viewSchedule = document.getElementById('view-schedule');
const viewDashboard = document.getElementById('view-dashboard');
const viewLogin = document.getElementById('view-login');
const viewQuiz = document.getElementById('view-quiz');
const viewAbout = document.getElementById('view-about');
const viewStore = document.getElementById('view-store');
const viewQuizHub = document.getElementById('view-quiz-hub'); // âœ… NOVO: Captura a Game Zone

const navHome = document.getElementById('nav-home');
const navSchedule = document.getElementById('nav-schedule');
const navProfile = document.getElementById('nav-profile');
const navAbout = document.getElementById('nav-about');
const navStore = document.getElementById('nav-store');
const navQuiz = document.getElementById('nav-quiz'); // âœ… CORRIGIDO O NOME DA VARIÁVEL

const btnLoginArea = document.getElementById('btn-login-area');

// Lá no topo do navigation.js, onde ficam as consts
const viewRunnerGame = document.getElementById('view-runner-game');
const btnAbrirRunner = document.getElementById('btn-abrir-runner');
const btnRunnerQuit = document.getElementById('btn-runner-quit');

// Importe a função de Start
import { startRunner } from './runner.js';

// Adicione os eventos
if (btnAbrirRunner) {
    btnAbrirRunner.addEventListener('click', () => {
        showView(viewRunnerGame);
        startRunner(); // Inicia o jogo!
    });
}

if (btnRunnerQuit) {
    btnRunnerQuit.addEventListener('click', () => {
        showView(viewQuizHub); // Volta pra área de jogos
    });
}

// ==========================================
// 2. FUNÇÃO PRINCIPAL DE NAVEGAÇÃO
// ==========================================
function showView(viewToShow, navItem = null) {
    if (!viewToShow) return;

    const allViews = document.querySelectorAll('.view');
    allViews.forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    viewToShow.classList.add('active');
    viewToShow.style.display = 'block';


    if (navItem) {
        document.querySelectorAll('#bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
        navItem.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 3. EVENTOS DE CLIQUE (MENU INFERIOR)
// ==========================================
if(navHome) navHome.addEventListener('click', () => showView(viewHome, navHome));
if(navSchedule) navSchedule.addEventListener('click', () => showView(viewSchedule, navSchedule));
if(navAbout) navAbout.addEventListener('click', () => showView(viewAbout, navAbout));
if(navStore) navStore.addEventListener('click', () => showView(viewStore, navStore));
if(navQuiz) navQuiz.addEventListener('click', () => showView(viewQuizHub, navQuiz)); // âœ… NOVO: Abre a Game Zone

navProfile.addEventListener('click', () => {
    const userId = localStorage.getItem('usuarioLogadoId');
    if (userId) {
        showView(viewDashboard, navProfile);
    } else {
        showView(viewLogin, navProfile);
    }
});

// ==========================================
// 4. EVENTOS DE CLIQUE (BOTÕES EXTRAS)
// ==========================================
if (btnLoginArea) {
    btnLoginArea.addEventListener('click', () => {
        const userId = localStorage.getItem('usuarioLogadoId');
        if (userId) showView(viewDashboard);
        else showView(viewLogin);
    });
}

const btnJogarQuiz = document.getElementById('btn-jogar-quiz');
const btnVoltarDashboard = document.getElementById('btn-voltar-dashboard');

if(btnJogarQuiz) {
    // Ao clicar em jogar, vai pra tela do Quiz
    btnJogarQuiz.addEventListener('click', () => showView(viewQuiz));
}

if(btnVoltarDashboard) {
    // âœ… CORRIGIDO: Ao voltar do quiz, volta para a Game Zone (e não mais pro perfil)
    btnVoltarDashboard.addEventListener('click', () => showView(viewQuizHub)); 
}

// ==========================================
// 5. BOTÕES DA TELA INICIAL (FASES DO EVENTO)
// ==========================================
const btnFaseCronograma = document.getElementById('btn-fase-cronograma');
const btnFaseInscricao = document.getElementById('btn-fase-inscricao');
const btnFaseCredencial = document.getElementById('btn-fase-credencial');

if (btnFaseCronograma) btnFaseCronograma.addEventListener('click', () => navSchedule.click());
if (btnFaseCredencial) btnFaseCredencial.addEventListener('click', () => navProfile.click());
if (btnFaseInscricao) btnFaseInscricao.addEventListener('click', () => {
    window.location.href = 'ingressos.html';
});

const linkRecompensas = document.querySelector('.link-recompensas');
if (linkRecompensas) {
    linkRecompensas.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#view-recompensas')?.scrollIntoView({ behavior: 'smooth' });
    });
}

function atualizarAreasProtegidasDosJogos() {
    const logado = Boolean(localStorage.getItem('usuarioLogadoId'));
    document.querySelectorAll('[data-game-protected]').forEach(area => {
        area.classList.toggle('game-area-liberada', logado);
    });
}

document.querySelectorAll('[data-game-login]').forEach(botao => {
    botao.addEventListener('click', () => showView(viewLogin, navProfile));
});

window.addEventListener('usuarioLoginAlterado', atualizarAreasProtegidasDosJogos);
atualizarAreasProtegidasDosJogos();
