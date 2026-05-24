import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// 1. Importa o banco de perguntas separado
import { bancoDePerguntas } from './questions.js';

let perguntasEmbaralhadas = [];
let perguntaAtualIndex = 0;
let pontosDaPartida = 0;
let errosNaPartida = 0;

const LIMITE_ERROS = 3; // Quantos erros bloqueiam o usuário
const TEMPO_BLOQUEIO_MINUTOS = 5; // Tempo de penalidade

// Elementos da tela
const perguntaTexto = document.getElementById('pergunta-texto');
const opcoesContainer = document.getElementById('opcoes-container');
const pontosDisplay = document.getElementById('pontos-atuais');
const btnJogarQuiz = document.getElementById('btn-jogar-quiz');
const btnVoltarDashboardQuiz = document.getElementById('btn-voltar-dashboard');

// ==========================================
// LÓGICA DE BLOQUEIO POR TEMPO (COOLDOWN)
// ==========================================
function verificarBloqueio() {
    const lockUntil = localStorage.getItem('quiz_lock_until');
    
    if (lockUntil) {
        const agora = Date.now();
        if (agora < parseInt(lockUntil)) {
            // Ainda está bloqueado! Calcula quanto tempo falta
            const milissegundosRestantes = parseInt(lockUntil) - agora;
            const minutos = Math.floor(milissegundosRestantes / 1000 / 60);
            const segundos = Math.floor((milissegundosRestantes % (1000 * 60)) / 1000);
            
            perguntaTexto.innerHTML = `
                <div style="text-align: center;">
                    <span style="font-size: 40px;">☕</span><br><br>
                    <strong style="font-size: 20px; color: var(--cor-primaria);">Pausa pro café!</strong><br><br>
                    <span style="font-size: 16px; color: var(--cor-texto);">Você errou 3 questões. Vamos descansar um pouco.<br><br>
                    Aproveite para dar uma volta pelo evento, trocar uma ideia e logo você poderá jogar de novo em:</span><br><br>
                    <span style="font-size:24px; color: var(--cor-secundaria); font-weight:800;">${minutos}m ${segundos}s</span>
                </div>
            `;
            opcoesContainer.innerHTML = '';
            
            // Fica atualizando o cronômetro na tela a cada segundo
            setTimeout(verificarBloqueio, 1000);
            return true;
        } else {
            // O tempo já passou! Libera o bloqueio
            localStorage.removeItem('quiz_lock_until');
        }
    }
    return false;
}

// ==========================================
// INICIAR E ALEATORIZAR O JOGO
// ==========================================
function iniciarJogo() {
    // Se estiver bloqueado, nem deixa jogar
    if (verificarBloqueio()) return;

    perguntaAtualIndex = 0;
    pontosDaPartida = 0;
    errosNaPartida = 0;
    pontosDisplay.textContent = "0";

    // Mágica para clonar e embaralhar a ordem das perguntas aleatoriamente
    perguntasEmbaralhadas = [...bancoDePerguntas].sort(() => Math.random() - 0.5);

    carregarPergunta();
}

function carregarPergunta() {
    if (verificarBloqueio()) return;

    const perguntaAtual = perguntasEmbaralhadas[perguntaAtualIndex];
    perguntaTexto.innerHTML = `<small style="color:var(--cor-primaria)">[Dificuldade: ${perguntaAtual.dificuldade.toUpperCase()}]</small><br>${perguntaAtual.texto}`;
    opcoesContainer.innerHTML = ''; 

    perguntaAtual.opcoes.forEach((opcao, index) => {
        const button = document.createElement('button');
        button.textContent = opcao;
        button.classList.add('btn-opcao');
        button.addEventListener('click', () => verificarResposta(index, button));
        opcoesContainer.appendChild(button);
    });
}

function verificarResposta(indiceEscolhido, botaoClicado) {
    const perguntaAtual = perguntasEmbaralhadas[perguntaAtualIndex];
    const todosBotoes = document.querySelectorAll('.btn-opcao');
    todosBotoes.forEach(btn => btn.disabled = true);

    if (indiceEscolhido === perguntaAtual.respostaCorreta) {
        botaoClicado.classList.add('correta');
        pontosDaPartida += 10; 
        pontosDisplay.textContent = pontosDaPartida;
        
        // Vai para a próxima pergunta
        setTimeout(() => {
            perguntaAtualIndex++;
            if (perguntaAtualIndex < perguntasEmbaralhadas.length) {
                carregarPergunta();
            } else {
                finalizarQuiz();
            }
        }, 1500);

    } else {
        botaoClicado.classList.add('errada');
        todosBotoes[perguntaAtual.respostaCorreta].classList.add('correta');
        errosNaPartida++;

        // Se atingiu o limite de erros na mesma rodada, BLOQUEIA IMEDIATAMENTE
        if (errosNaPartida >= LIMITE_ERROS) {
            setTimeout(() => {
                const tempoFuturo = Date.now() + (TEMPO_BLOQUEIO_MINUTOS * 60 * 1000);
                localStorage.setItem('quiz_lock_until', tempoFuturo);
                verificarBloqueio();
            }, 1500);
        } else {
            // Se errou mas ainda tem "vidas", passa para a próxima pergunta
            setTimeout(() => {
                perguntaAtualIndex++;
                if (perguntaAtualIndex < perguntasEmbaralhadas.length) {
                    carregarPergunta();
                } else {
                    finalizarQuiz();
                }
            }, 1500);
        }
    }
}

async function finalizarQuiz() {
    perguntaTexto.textContent = "Excelente! Você chegou ao fim da rodada.";
    opcoesContainer.innerHTML = 'Salvando sua pontuação na nuvem... ⏳';

    const userId = localStorage.getItem('usuarioLogadoId');

    if (userId) {
        try {
            const userRef = doc(db, "inscritos", userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const dados = userSnap.data();
                // Garante que o ponto seja numérico, mesmo que no banco esteja zuado
                const pontosAntigos = parseInt(dados.pontos) || 0; 
                const novosPontosTotais = pontosAntigos + pontosDaPartida;

                // Salva no banco de dados
                await updateDoc(userRef, { pontos: novosPontosTotais });

                // Salva na memória do celular e atualiza o número no topo do ingresso imediatamente
                localStorage.setItem('usuarioPontos', novosPontosTotais);
                const pointsDisplay = document.getElementById('user-points-display');
                if(pointsDisplay) pointsDisplay.textContent = novosPontosTotais;

                opcoesContainer.innerHTML = `
                    <div style="text-align: center;">
                        <p style="color: #28a745; font-weight: 800; font-size: 22px; margin-bottom: 10px;">
                            Pontuação Salva! 🌟
                        </p>
                        <p style="color: var(--cor-texto); font-size: 16px;">
                            Você ganhou <strong style="color:var(--cor-secundaria);">+${pontosDaPartida} pontos</strong>.<br>
                            Seu novo total é: <strong>${novosPontosTotais} pts</strong>
                        </p>
                    </div>
                `;
            }
        } catch (erro) {
            console.error("Erro fatal ao salvar pontos:", erro);
            opcoesContainer.innerHTML = '<p style="color: #dc3545; font-weight:bold; text-align:center;">Erro ao salvar pontos. Verifique sua conexão.</p>';
        }
    } else {
        opcoesContainer.innerHTML = '<p style="color: #dc3545; text-align:center;">Erro: Usuário não identificado.</p>';
    }
}

// Aciona o início/embaralhamento sempre que o usuário clica no botão para entrar no jogo
if (btnJogarQuiz) {
    btnJogarQuiz.addEventListener('click', iniciarJogo);
}

// NOVO: Salva o progresso se o usuário abortar o quiz no meio
if (btnVoltarDashboardQuiz) {
    btnVoltarDashboardQuiz.addEventListener('click', salvarSaidaAntecipada);
}

// ==========================================
// SALVAR PONTOS AO SAIR NO MEIO DA PARTIDA
// ==========================================
async function salvarSaidaAntecipada() {
    // Só salva se ele ganhou algum ponto e a partida ainda não tinha acabado
    if (pontosDaPartida > 0 && perguntaAtualIndex < perguntasEmbaralhadas.length) {
        const userId = localStorage.getItem('usuarioLogadoId');
        if (userId) {
            try {
                const userRef = doc(db, "inscritos", userId);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const dados = userSnap.data();
                    const pontosAntigos = parseInt(dados.pontos) || 0;
                    const novosPontosTotais = pontosAntigos + pontosDaPartida;

                    await updateDoc(userRef, { pontos: novosPontosTotais });
                    localStorage.setItem('usuarioPontos', novosPontosTotais);
                    
                    const pointsDisplay = document.getElementById('user-points-display');
                    if(pointsDisplay) pointsDisplay.textContent = novosPontosTotais;
                }
            } catch (erro) {
                console.error("Erro ao salvar pontos parciais:", erro);
            }
        }
        // Zera os pontos para não correr o risco de salvar duplicado no banco
        pontosDaPartida = 0; 
    }
}