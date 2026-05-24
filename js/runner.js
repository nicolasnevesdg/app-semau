import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const canvas = document.getElementById('runner-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('runner-score');
const gameOverScreen = document.getElementById('runner-game-over');
const pointsEarnedDisplay = document.getElementById('runner-points-earned');
const btnRestart = document.getElementById('btn-runner-restart');

let gameLoop;
let isGameOver = false;
let frames = 0;
let score = 0;
let velocidadeJogo = 5;
let chaoY = 0;
let roadLineX = 0; // Controla o movimento das faixas do asfalto

// Ajusta o canvas para a tela do celular e recalcula o chão
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // O chão agora fica a 65% da altura da tela, de cima para baixo.
    // Isso dá 65% de espaço para o céu e 35% de espaço para o asfalto!
    chaoY = canvas.height * 0.65; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// GERENCIADOR DE CENÁRIO (PARALLAX EFFECT)
// ==========================================
const cenario = {
    bgFarX: 0,
    bgNearX: 0,
    larguraFar: 1000,
    larguraNear: 800,

    draw() {
        // 1. Camada de Fundo (Prédios distantes) - Mais translúcida e lenta
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraFar) + 1; i++) {
            let offsetX = this.bgFarX + (i * this.larguraFar);
            ctx.fillRect(offsetX + 50, chaoY - 180, 150, 180);
            ctx.fillRect(offsetX + 220, chaoY - 250, 80, 250);
            ctx.fillRect(offsetX + 240, chaoY - 340, 40, 90); // Torre do P1
            ctx.fillRect(offsetX + 350, chaoY - 120, 200, 120);
            ctx.fillRect(offsetX + 600, chaoY - 200, 120, 200);
            ctx.fillRect(offsetX + 750, chaoY - 150, 180, 150);
        }

        // 2. Camada do Meio (Árvores e Postes) - Um pouco mais nítida
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraNear) + 1; i++) {
            let offsetX = this.bgNearX + (i * this.larguraNear);
            
            // Árvore 1
            ctx.fillRect(offsetX + 100, chaoY - 60, 15, 60);
            ctx.beginPath();
            ctx.arc(offsetX + 107, chaoY - 70, 40, 0, Math.PI * 2);
            ctx.fill();

            // Poste de Luz
            ctx.fillRect(offsetX + 350, chaoY - 120, 6, 120);
            ctx.fillRect(offsetX + 350, chaoY - 120, 30, 6);

            // Árvore 2
            ctx.fillRect(offsetX + 600, chaoY - 80, 20, 80);
            ctx.beginPath();
            ctx.arc(offsetX + 610, chaoY - 90, 50, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    update() {
        this.bgFarX -= velocidadeJogo * 0.2;
        this.bgNearX -= velocidadeJogo * 0.5;

        if (this.bgFarX <= -this.larguraFar) this.bgFarX += this.larguraFar;
        if (this.bgNearX <= -this.larguraNear) this.bgNearX += this.larguraNear;
    }
};

// O Personagem (Aluno/Capivara)
const player = {
    x: 50,
    y: chaoY - 40,
    w: 40,
    h: 40,
    dy: 0,
    jumpForce: 15,
    gravidade: 0.8,
    grounded: true,
    
    draw() {
        ctx.fillStyle = '#f0782c'; // Laranja vivo
        ctx.fillRect(this.x, this.y, this.w, this.h);
    },
    update() {
        this.dy += this.gravidade;
        this.y += this.dy;

        if (this.y + this.h >= chaoY) {
            this.y = chaoY - this.h;
            this.dy = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
    },
    jump() {
        if (this.grounded) {
            this.dy = -this.jumpForce;
            this.grounded = false;
        }
    }
};

// Gerenciador de Obstáculos
const obstaculos = {
    lista: [],
    spawnTimer: 0,
    draw() {
        this.lista.forEach(obs => {
            ctx.fillStyle = '#ffffff'; // Obstáculos brancos saltando aos olhos
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        });
    },
    update() {
        if (frames > 0 && frames % 600 === 0) velocidadeJogo += 0.5;

        this.spawnTimer--;

        if (this.spawnTimer <= 0) {
            let tipo = Math.random();
            let largura = tipo > 0.7 ? 60 : 30;
            let altura = tipo > 0.4 ? 50 : 30;

            this.lista.push({
                x: canvas.width,
                y: chaoY - altura,
                w: largura,
                h: altura
            });

            this.spawnTimer = Math.floor(Math.random() * 60 + 80);
        }

        this.lista.forEach((obs, index) => {
            // CORRIGIDO: velocidadJogo -> velocidadeJogo
            obs.x -= velocidadeJogo;

            if (
                player.x < obs.x + obs.w &&
                player.x + player.w > obs.x &&
                player.y < obs.y + obs.h &&
                player.y + player.h > obs.y
            ) {
                gameOver();
            }

            if (obs.x + obs.w < 0) this.lista.splice(index, 1);
        });
    }
};

// Controles
canvas.addEventListener('touchstart', (e) => { 
    e.preventDefault();
    if(!isGameOver) player.jump(); 
}, { passive: false });

canvas.addEventListener('mousedown', () => { 
    if(!isGameOver) player.jump(); 
});

// NOVO: Pinta o céu em gradiente com a sua paleta azul
function desenharCeuGradient() {
    let skyGradient = ctx.createLinearGradient(0, 0, 0, chaoY);
    
    // Topo da tela: Um tom mais escuro e profundo derivado do seu azul
    skyGradient.addColorStop(0, '#5175b5');    
    
    // Meio da tela: O seu azul exato!
    skyGradient.addColorStop(0.5, '#809acd');  
    
    // Linha do horizonte: Um azul bem clarinho para dar o efeito de névoa atmosférica
    skyGradient.addColorStop(1, '#c3d5ed');    

    ctx.fillStyle = skyGradient;
    // Preenche todo o fundo da tela com o gradiente
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// NOVO: Pinta a estrada de asfalto com faixas em movimento
function desenharChaoAsfalto() {
    // Corpo do asfalto (Cinza escuro)
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, chaoY, canvas.width, canvas.height - chaoY);
    
    // Configuração das faixas tracejadas da rua
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Branco suave para não poluir
    let larguraFaixa = 35;
    let espacoFaixa = 25;
    let faixaY = chaoY + 25; // Alinhado no meio do asfalto

    // Move as faixas para trás criando ilusão cinematográfica de rolagem
    roadLineX -= velocidadeJogo;
    if (roadLineX <= -(larguraFaixa + espacoFaixa)) {
        roadLineX = 0;
    }

    // Renderiza as faixas em sequência por toda a largura do celular
    for (let x = roadLineX; x < canvas.width; x += larguraFaixa + espacoFaixa) {
        ctx.fillRect(x, faixaY, larguraFaixa, 5);
    }
}

// O motor contínuo do jogo
function loop() {
    if (isGameOver) return;
    
    // Desenha o céu cobrindo o fundo antigo
    desenharCeuGradient();
    
    // Elementos de fundo
    cenario.update();
    cenario.draw();

    // Desenha a pista de asfalto realista
    desenharChaoAsfalto();
    
    player.update();
    player.draw();
    
    obstaculos.update();
    obstaculos.draw();
    
    if (frames % 10 === 0) {
        score++;
        scoreDisplay.textContent = score;
    }
    
    frames++;
    gameLoop = requestAnimationFrame(loop);
}

// Inicializa a partida
export function startRunner() {
    resizeCanvas(); 
    player.y = chaoY - player.h;
    player.dy = 0;
    player.grounded = true;
    obstaculos.lista = [];
    obstaculos.spawnTimer = 0; 
    cenario.bgFarX = 0;   
    cenario.bgNearX = 0;  
    roadLineX = 0; // Reseta a posição das faixas
    score = 0;
    frames = 0;
    velocidadeJogo = 5;
    isGameOver = false;
    scoreDisplay.textContent = score;
    gameOverScreen.style.display = 'none';
    
    loop();
}

// Encerra e pontua
async function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(gameLoop);
    
    const pontosConvertidos = Math.floor(score / 10);
    pointsEarnedDisplay.textContent = pontosConvertidos;
    gameOverScreen.style.display = 'block';

    if (pontosConvertidos > 0) {
        const userId = localStorage.getItem('usuarioLogadoId');
        if (userId) {
            try {
                const userRef = doc(db, "inscritos", userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const pontosAtuais = parseInt(userSnap.data().pontos) || 0;
                    const novoTotal = pontosAtuais + pontosConvertidos;
                    
                    await updateDoc(userRef, { pontos: novoTotal });
                    localStorage.setItem('usuarioPontos', novoTotal);
                    
                    const ticketDisplay = document.getElementById('user-points-display');
                    if (ticketDisplay) ticketDisplay.textContent = novoTotal;
                }
            } catch (erro) {
                console.error("Erro ao salvar pontos da corrida:", erro);
            }
        }
    }
}

if(btnRestart) btnRestart.addEventListener('click', startRunner);