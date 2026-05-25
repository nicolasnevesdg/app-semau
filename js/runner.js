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
let roadLineX = 0;

// ==========================================
// 1. CARREGAMENTO DE IMAGENS (ASSETS)
// ==========================================
const imgBase = 'assets/img/';
const assets = {
    // Jogador
    playerRun: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
    playerJump: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
    // Obstáculos
    capivara: new Image(),
    cavalo: new Image(),
    feira: new Image(),
    aluna: new Image(),    // NOVO
    ciclista: new Image()  // NOVO
};

// Carrega imagens do Jogador
for (let i = 0; i < 6; i++) {
    assets.playerRun[i].src = imgBase + (i + 1) + '.png';
}
for (let i = 0; i < 7; i++) {
    assets.playerJump[i].src = imgBase + 'j' + (i + 1) + '.png';
}

// Carrega imagens dos Obstáculos
assets.capivara.src = imgBase + 'capivara.png';
assets.cavalo.src = imgBase + 'cavalo.png';
assets.feira.src = imgBase + 'feira.png';
assets.aluna.src = imgBase + 'aluna.png';       // NOVO
assets.ciclista.src = imgBase + 'ciclista.png'; // NOVO

// Ajusta o canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    chaoY = canvas.height * 0.65; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// GERENCIADOR DE CENÁRIO (PARALLAX)
// ==========================================
const cenario = {
    bgFarX: 0, bgNearX: 0, larguraFar: 1000, larguraNear: 800,
    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraFar) + 1; i++) {
            let offsetX = this.bgFarX + (i * this.larguraFar);
            ctx.fillRect(offsetX + 50, chaoY - 180, 150, 180);
            ctx.fillRect(offsetX + 220, chaoY - 250, 80, 250);
            ctx.fillRect(offsetX + 240, chaoY - 340, 40, 90);
            ctx.fillRect(offsetX + 350, chaoY - 120, 200, 120);
            ctx.fillRect(offsetX + 600, chaoY - 200, 120, 200);
            ctx.fillRect(offsetX + 750, chaoY - 150, 180, 150);
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraNear) + 1; i++) {
            let offsetX = this.bgNearX + (i * this.larguraNear);
            ctx.fillRect(offsetX + 100, chaoY - 60, 15, 60); ctx.beginPath(); ctx.arc(offsetX + 107, chaoY - 70, 40, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(offsetX + 350, chaoY - 120, 6, 120); ctx.fillRect(offsetX + 350, chaoY - 120, 30, 6);
            ctx.fillRect(offsetX + 600, chaoY - 80, 20, 80); ctx.beginPath(); ctx.arc(offsetX + 610, chaoY - 90, 50, 0, Math.PI * 2); ctx.fill();
        }
    },
    update() {
        this.bgFarX -= velocidadeJogo * 0.2; this.bgNearX -= velocidadeJogo * 0.5;
        if (this.bgFarX <= -this.larguraFar) this.bgFarX += this.larguraFar;
        if (this.bgNearX <= -this.larguraNear) this.bgNearX += this.larguraNear;
    }
};

// ==========================================
// O PERSONAGEM
// ==========================================
const player = {
    x: 50,
    y: chaoY - 50,
    w: 70,         
    h: 70,         
    dy: 0,
    jumpForce: 15,
    gravidade: 0.6,
    grounded: true,
    
    currentRunFrame: 0, 
    frameChangeTimer: 0,
    frameChangeInterval: 6, 
    
    currentJumpFrame: 0,
    jumpFrameTimer: 0,
    jumpFrameInterval: 5,
    
    draw() {
        if (!this.grounded) {
            ctx.drawImage(assets.playerJump[this.currentJumpFrame], this.x, this.y, this.w, this.h);
        } else {
            ctx.drawImage(assets.playerRun[this.currentRunFrame], this.x, this.y, this.w, this.h);
        }
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

        if (this.grounded && !isGameOver) {
            this.frameChangeTimer++;
            if (this.frameChangeTimer >= this.frameChangeInterval) {
                this.currentRunFrame++;
                if (this.currentRunFrame >= 6) this.currentRunFrame = 0;
                this.frameChangeTimer = 0;
            }
        } else if (!this.grounded && !isGameOver) {
            this.jumpFrameTimer++;
            if (this.jumpFrameTimer >= this.jumpFrameInterval) {
                if (this.currentJumpFrame < 6) this.currentJumpFrame++;
                this.jumpFrameTimer = 0;
            }
        }
    },
    jump() {
        if (this.grounded) {
            this.dy = -this.jumpForce;
            this.grounded = false;
            this.currentJumpFrame = 0;
            this.jumpFrameTimer = 0;
        }
    },
    // NOVO: Função que corta o pulo ao soltar o clique/toque
    jumpCut() {
        if (!this.grounded && this.dy < 0) {
            this.dy *= 0.5; // Reduz a velocidade de subida pela metade
        }
    }
};

// ==========================================
// GERENCIADOR DE OBSTÁCULOS (COM HITBOX CORRIGIDA)
// ==========================================
const obstaculos = {
    lista: [],
    spawnTimer: 0,
    draw() {
        this.lista.forEach(obs => {
            // Desenha a imagem normalmente
            ctx.drawImage(obs.image, obs.x, obs.y, obs.w, obs.h);
            
            /* DICA DE OURO: Se você quiser VER as caixas de colisão para testar
               se estão justas o suficiente, apague as duas barras "//" das 4 linhas abaixo!
            */
            
            // ctx.strokeStyle = 'red'; // Hitbox do obstáculo em vermelho
            // ctx.strokeRect(obs.x + obs.hitPaddingX, obs.y + obs.hitPaddingY, obs.w - (obs.hitPaddingX * 2), obs.h - (obs.hitPaddingY * 2));
        });

        // ctx.strokeStyle = 'blue'; // Hitbox do jogador em azul
        // ctx.strokeRect(player.x + 20, player.y + 10, player.w - 40, player.h - 20);
    },
    update() {
        if (frames > 0 && frames % 600 === 0) velocidadeJogo += 0.5;

        this.spawnTimer--;

        if (this.spawnTimer <= 0) {
            // NOVO: Adicionado 'hitPaddingX' e 'hitPaddingY'.
            // Isso define quantos pixels vamos ignorar das bordas transparentes de cada PNG.
            const tipos = [
                { img: assets.capivara, w: 45, h: 45, hitPaddingX: 5, hitPaddingY: 5 },
                { img: assets.cavalo, w: 70, h: 70, hitPaddingX: 10, hitPaddingY: 10 },
                { img: assets.feira, w: 80, h: 80, hitPaddingX: 15, hitPaddingY: 15 },
                { img: assets.aluna, w: 70, h: 70, hitPaddingX: 20, hitPaddingY: 10 },
                { img: assets.ciclista, w: 70, h: 70, hitPaddingX: 15, hitPaddingY: 10 }
            ];
            
            const escolhido = tipos[Math.floor(Math.random() * tipos.length)];

            this.lista.push({ 
                x: canvas.width, 
                y: chaoY - escolhido.h, 
                w: escolhido.w, 
                h: escolhido.h,
                image: escolhido.img,
                hitPaddingX: escolhido.hitPaddingX, // Salva o encolhimento escolhido
                hitPaddingY: escolhido.hitPaddingY
            });
            
            this.spawnTimer = Math.floor(Math.random() * 60 + 80);
        }

        this.lista.forEach((obs, index) => {
            obs.x -= velocidadeJogo;
            
            // 1. HITBOX DO JOGADOR (Encolhendo a caixa do estudante)
            // A imagem tem 70x70, mas vamos cortar o espaço vazio em volta dele
            const pBoxX = player.x + 20; // Corta 20px da esquerda
            const pBoxY = player.y + 10; // Corta 10px do topo
            const pBoxW = player.w - 40; // Tira 20px de cada lado (20+20)
            const pBoxH = player.h - 20; // Tira 10px em cima e 10px embaixo

            // 2. HITBOX DO OBSTÁCULO (Encolhendo a caixa da barraca/animais)
            const oBoxX = obs.x + obs.hitPaddingX;
            const oBoxY = obs.y + obs.hitPaddingY;
            const oBoxW = obs.w - (obs.hitPaddingX * 2);
            const oBoxH = obs.h - (obs.hitPaddingY * 2);
            
            // 3. NOVA DETECÇÃO DE COLISÃO (Usando as caixas encolhidas em vez do tamanho total)
            if (pBoxX < oBoxX + oBoxW && 
                pBoxX + pBoxW > oBoxX && 
                pBoxY < oBoxY + oBoxH && 
                pBoxY + pBoxH > oBoxY) {
                gameOver();
            }

            if (obs.x + obs.w < 0) this.lista.splice(index, 1);
        });
    }
};
// Controles
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(!isGameOver) player.jump(); }, { passive: false });
canvas.addEventListener('mousedown', () => { if(!isGameOver) player.jump(); });

// NOVO: Controles para o corte do pulo
canvas.addEventListener('touchend', (e) => { e.preventDefault(); if(!isGameOver) player.jumpCut(); }, { passive: false });
canvas.addEventListener('mouseup', () => { if(!isGameOver) player.jumpCut(); });

function desenharCeuGradient() {
    let skyGradient = ctx.createLinearGradient(0, 0, 0, chaoY);
    skyGradient.addColorStop(0, '#5175b5');    
    skyGradient.addColorStop(0.5, '#809acd');  
    skyGradient.addColorStop(1, '#c3d5ed');    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function desenharChaoAsfalto() {
    ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, chaoY, canvas.width, canvas.height - chaoY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; 
    let larguraFaixa = 35, espacoFaixa = 25, faixaY = chaoY + 25; 
    roadLineX -= velocidadeJogo; if (roadLineX <= -(larguraFaixa + espacoFaixa)) roadLineX = 0;
    for (let x = roadLineX; x < canvas.width; x += larguraFaixa + espacoFaixa) { ctx.fillRect(x, faixaY, larguraFaixa, 5); }
}

function loop() {
    if (isGameOver) return;
    desenharCeuGradient(); cenario.update(); cenario.draw(); desenharChaoAsfalto();
    player.update(); player.draw(); obstaculos.update(); obstaculos.draw();
    if (frames % 10 === 0) { score++; scoreDisplay.textContent = score; }
    frames++; gameLoop = requestAnimationFrame(loop);
}

export function startRunner() {
    resizeCanvas(); 
    player.y = chaoY - player.h; player.dy = 0; player.grounded = true;
    
    player.currentRunFrame = 0;
    player.frameChangeTimer = 0;
    player.currentJumpFrame = 0;
    player.jumpFrameTimer = 0;

    obstaculos.lista = []; obstaculos.spawnTimer = 0; 
    cenario.bgFarX = 0; cenario.bgNearX = 0; roadLineX = 0;
    score = 0; frames = 0; velocidadeJogo = 5; isGameOver = false;
    scoreDisplay.textContent = score; gameOverScreen.style.display = 'none';
    
    loop();
}

async function gameOver() {
    isGameOver = true; cancelAnimationFrame(gameLoop);
    const pontosConvertidos = Math.floor(score / 10);
    pointsEarnedDisplay.textContent = pontosConvertidos; gameOverScreen.style.display = 'block';

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
            } catch (erro) { console.error("Erro ao salvar pontos da corrida:", erro); }
        }
    }
}

if(btnRestart) btnRestart.addEventListener('click', startRunner);