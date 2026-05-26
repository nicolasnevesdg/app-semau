// ==========================================
// 1. CAPTURANDO OS ELEMENTOS DO HTML
// ==========================================

const viewHome = document.getElementById('view-home');
const viewSchedule = document.getElementById('view-schedule');
const viewDashboard = document.getElementById('view-dashboard');
const viewLogin = document.getElementById('view-login');
const viewQuiz = document.getElementById('view-quiz');
const viewAbout = document.getElementById('view-about');
const viewQuizHub = document.getElementById('view-quiz-hub'); // ✅ NOVO: Captura a Game Zone

const navHome = document.getElementById('nav-home');
const navSchedule = document.getElementById('nav-schedule');
const navProfile = document.getElementById('nav-profile');
const navAbout = document.getElementById('nav-about');
const navQuiz = document.getElementById('nav-quiz'); // ✅ CORRIGIDO O NOME DA VARIÁVEL

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
function showView(viewToShow) {
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    viewToShow.classList.add('active');
    viewToShow.style.display = 'block';
}

// ==========================================
// 3. EVENTOS DE CLIQUE (MENU INFERIOR)
// ==========================================
if(navHome) navHome.addEventListener('click', () => showView(viewHome));
if(navSchedule) navSchedule.addEventListener('click', () => showView(viewSchedule));
if(navAbout) navAbout.addEventListener('click', () => showView(viewAbout));
if(navQuiz) navQuiz.addEventListener('click', () => showView(viewQuizHub)); // ✅ NOVO: Abre a Game Zone

navProfile.addEventListener('click', () => {
    const userId = localStorage.getItem('usuarioLogadoId');
    if (userId) {
        showView(viewDashboard);
    } else {
        showView(viewLogin);
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
    // ✅ CORRIGIDO: Ao voltar do quiz, volta para a Game Zone (e não mais pro perfil)
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
    window.open('https://sua-pagina-de-inscricao.com.br', '_blank'); 
});

document.querySelector('.link-recompensas').addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('#view-recompensas').scrollIntoView({ behavior: 'smooth' });
});