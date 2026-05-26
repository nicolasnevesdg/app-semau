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
let isIntro = true; 
let frames = 0;
let score = 0;
let velocidadeJogo = 0; 
let chaoY = 0;
let roadLineX = 0;
let nuvens = [];

// ==========================================
// 1. CARREGAMENTO DE IMAGENS (ASSETS)
// ==========================================
const imgBase = 'assets/img/';
const assets = {
    playerRun: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
    playerJump: [new Image(), new Image(), new Image(), new Image(), new Image(), new Image(), new Image()],
    capivara: new Image(),
    cavalo: new Image(),
    feira: new Image(),
    aluna: new Image(),    
    ciclista: new Image(),
    cachorro: new Image(),
    chao: new Image(),
    p1: new Image(),
    placa: new Image(),
    fantasma: new Image(),
    arvore1: new Image(),
    arvore2: new Image(),
    arvore3: new Image(),
    grama: new Image()
};

for (let i = 0; i < 6; i++) { assets.playerRun[i].src = imgBase + (i + 1) + '.png'; }
for (let i = 0; i < 7; i++) { assets.playerJump[i].src = imgBase + 'J' + (i + 1) + '.png'; }

assets.capivara.src = imgBase + 'Capivara.png';
assets.cavalo.src = imgBase + 'Cavalo.png';
assets.feira.src = imgBase + 'Feira.png';
assets.aluna.src = imgBase + 'Aluna.png';       
assets.ciclista.src = imgBase + 'Ciclista.png'; 

assets.cachorro.src = imgBase + 'cururu.png';
assets.chao.src = imgBase + 'chao.png';
assets.p1.src = imgBase + 'p1.png';
assets.placa.src = imgBase + 'placa.png';
assets.fantasma.src = imgBase + 'fantasminha.png';
assets.grama.src = imgBase + 'grama.png';

assets.arvore1.src = imgBase + 'arvore1.png';
assets.arvore2.src = imgBase + 'arvore2.png';
assets.arvore3.src = imgBase + 'arvore3.png';

// Alterar a quantidade para 6
assets.nuvens = [
    new Image(), new Image(), new Image(), new Image(), new Image(), new Image()
];

// O nome do arquivo agora é "cloud" seguido do número
for(let i = 0; i < 6; i++) {
    assets.nuvens[i].src = imgBase + 'cloud' + (i + 1) + '.png';
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    chaoY = canvas.height * 0.65; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// ANIMAÇÃO DE INTRODUÇÃO (FANTASMINHA)
// ==========================================
const ghost = {
    x: 200,
    y: 0,
    w: 450,
    h: 146.3,
    timer: 0,
    state: 'waiting', 
    
    draw() {
        if (this.state === 'done') return;
        let drawX = this.x;
        let drawY = this.y;
        
        if (this.state === 'shaking') {
            drawX += (Math.random() - 0.5) * 10; 
            drawY += (Math.random() - 0.5) * 6;
        }
        
        ctx.drawImage(assets.fantasma, drawX, drawY, this.w, this.h);
    },
    update() {
        if (this.state === 'done') return;
        this.timer++;
        
        if (this.state === 'waiting' && this.timer > 60) { 
            this.state = 'shaking';
            this.timer = 0;
        } else if (this.state === 'shaking' && this.timer > 60) { 
            this.state = 'running';
        } else if (this.state === 'running') {
            this.x += 18; 
            if (this.x > canvas.width) {
                this.state = 'done';
                iniciarCorridaDeVerdade(); 
            }
        }
    }
};

function iniciarCorridaDeVerdade() {
    isIntro = false;
    velocidadeJogo = 6; 
}

// ==========================================
// GERENCIADOR DE CENÁRIO (SEPARADO EM CAMADAS)
// ==========================================
const cenario = {
    bgFarX: 0, bgNearX: 0, 
    larguraP1: 360, 
    espacoP1: 1000,        // <-- NOVO: Define aqui a distância de espaço vazio entre os prédios P1
    larguraArvores: 3200,
    larguraGrama: 1600,
    
    // CAMADA 1: Prédio de fundo (Fica atrás do chão)
    drawFundo() {
        const cicloTotalP1 = this.larguraP1 + this.espacoP1;
        
        // Garantimos que o desenho começa exatamente na posição do bgFarX
        // Usamos Math.floor para evitar números quebrados que causam a "linha"
        let startX = Math.floor(this.bgFarX);

        // O "+ 2" no final garante que o jogo desenha prédios suficientes 
        // fora da tela para não sumirem na borda direita antes do reset
        for (let i = 0; i <= Math.ceil(canvas.width / cicloTotalP1) + 2; i++) {
            let offsetX = this.bgFarX + (i * cicloTotalP1);
            ctx.drawImage(assets.p1, offsetX, chaoY - 210, this.larguraP1, 120);
        }
    },

    drawGrama() {
        const baseY = chaoY - 110; // Alinhado com o asfalto
        let startX = Math.floor(this.bgNearX);
        
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraGrama) + 1; i++) {
            let offsetX = startX + (i * this.larguraGrama);
            ctx.drawImage(assets.grama, offsetX, baseY, this.larguraGrama, 120);
        }
    },

    // CAMADA 3: Objetos de Meio-Termo (Ficam por cima do chão)
    drawMeioTermo() {
        const baseY = chaoY - 60; 
        
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraArvores) + 1; i++) {
            let offsetX = this.bgNearX + (i * this.larguraArvores);
            
            ctx.drawImage(assets.arvore1, offsetX + 150, baseY - 100, 100, 100);
            ctx.drawImage(assets.arvore2, offsetX + 650, baseY - 100, 168.1, 100);
            ctx.drawImage(assets.arvore3, offsetX + 1300, baseY - 180, 236.8, 180);
            
            ctx.drawImage(assets.placa, offsetX + 2100, baseY - 80, 88.4, 80);
            
            ctx.drawImage(assets.arvore1, offsetX + 2650, baseY - 80, 80, 80);
            ctx.drawImage(assets.arvore2, offsetX + 2950, baseY - 100, 168.1, 100);
        }
    },

    update() {
        this.bgFarX -= velocidadeJogo * 0.2; 
        this.bgNearX -= velocidadeJogo * 0.5;
        
        const cicloTotalP1 = this.larguraP1 + this.espacoP1;

        // CORREÇÃO: O reinício agora usa o ciclo total (Prédio + Espaço) em vez de apenas a largura do prédio
        if (this.bgFarX <= -cicloTotalP1) {
            this.bgFarX += cicloTotalP1;
        }

        if (this.bgNearX <= -this.larguraArvores) {
            this.bgNearX += this.larguraArvores;
        }
    }
};

// ==========================================
// O PERSONAGEM
// ==========================================
const player = {
    x: 50,
    y: chaoY - 60,
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
    jumpCut() {
        if (!this.grounded && this.dy < 0) {
            this.dy *= 0.5; 
        }
    }
};

// ==========================================
// GERENCIADOR DE OBSTÁCULOS
// ==========================================
const obstaculos = {
    lista: [],
    spawnTimer: 0,
    draw() {
        this.lista.forEach(obs => {
            ctx.drawImage(obs.image, obs.x, obs.y, obs.w, obs.h);
        });
    },
    update() {
        if (frames > 0 && frames % 600 === 0) velocidadeJogo += 0.5;

        this.spawnTimer--;

        if (this.spawnTimer <= 0) {
            const tipos = [
                { img: assets.capivara, w: 50, h: 50, hitX: 5, hitY: 5 },
                { img: assets.cavalo, w: 75, h: 75, hitX: 10, hitY: 10 },
                { img: assets.feira, w: 90, h: 90, hitX: 15, hitY: 15 },
                { img: assets.aluna, w: 70, h: 70, hitX: 20, hitY: 10 },      
                { img: assets.ciclista, w: 80, h: 80, hitX: 15, hitY: 10 },
                { img: assets.cachorro, w: 67.2, h: 40, hitX: 5, hitY: 5 } 
            ];
            
            const escolhido = tipos[Math.floor(Math.random() * tipos.length)];

            this.lista.push({ 
                x: canvas.width, 
                y: chaoY - escolhido.h, 
                w: escolhido.w, 
                h: escolhido.h,
                image: escolhido.img,
                hitX: escolhido.hitX,
                hitY: escolhido.hitY
            });
            
            this.spawnTimer = Math.floor(Math.random() * 60 + (80 - velocidadeJogo));
        }

        this.lista.forEach((obs, index) => {
            obs.x -= velocidadeJogo;
            
            const pBoxX = player.x + 20; const pBoxY = player.y + 10; 
            const pBoxW = player.w - 40; const pBoxH = player.h - 20;

            const oBoxX = obs.x + obs.hitX; const oBoxY = obs.y + obs.hitY;
            const oBoxW = obs.w - (obs.hitX * 2); const oBoxH = obs.h - (obs.hitY * 2);
            
            if (pBoxX < oBoxX + oBoxW && pBoxX + pBoxW > oBoxX && pBoxY < oBoxY + oBoxH && pBoxY + pBoxH > oBoxY) {
                gameOver();
            }
            if (obs.x + obs.w < 0) this.lista.splice(index, 1);
        });
    }
};

const cloudManager = {
    spawn() {
        // Reduzi de 0.01 para 0.003. Isso faz o jogo testar menos vezes se deve criar uma nuvem.
        if (Math.random() < 0.003) { 
            nuvens.push({
                x: canvas.width,
                y: Math.random() * 150,
                img: assets.nuvens[Math.floor(Math.random() * 6)], 
                speed: 0.1 + Math.random() * 0.2
            });
        }
    },
    update() {
        for (let i = 0; i < nuvens.length; i++) {
            nuvens[i].x -= nuvens[i].speed;
            if (nuvens[i].x + 100 < 0) { // Remove quando sair da tela
                nuvens.splice(i, 1);
                i--;
            }
        }
    },
    draw() {
        for (let n of nuvens) {
            // AQUI está o segredo: use os valores corretos de largura e altura
            // Se as nuvens são horizontais, 183.7 é a largura e 60 é a altura
            ctx.drawImage(n.img, n.x, n.y, 183.7, 60); 
        }
    }
};

// ==========================================
// CONTROLES
// ==========================================
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(!isGameOver && !isIntro) player.jump(); }, { passive: false });
canvas.addEventListener('mousedown', () => { if(!isGameOver && !isIntro) player.jump(); });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); if(!isGameOver && !isIntro) player.jumpCut(); }, { passive: false });
canvas.addEventListener('mouseup', () => { if(!isGameOver && !isIntro) player.jumpCut(); });

function desenharCeuGradient() {
    let skyGradient = ctx.createLinearGradient(0, 0, 0, chaoY);
    skyGradient.addColorStop(0, '#5175b5');    
    skyGradient.addColorStop(0.5, '#809acd');  
    skyGradient.addColorStop(1, '#c3d5ed');    
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ==========================================
// CHÃO (CAMADA 2: Entre o P1 e a vegetação)
// ==========================================
function desenharChaoAsfalto() {
    const larguraChao = 1046; 
    const deslocamentoParaCima = 100; // Mantém isto para cravar o pé do personagem
    roadLineX -= velocidadeJogo; 
    
    // Reseta o loop de forma mais precisa
    if (roadLineX <= -larguraChao) {
        roadLineX = 0;
    }
    
    for (let x = roadLineX; x < canvas.width; x += larguraChao) { 
        // Substituímos o último pedaço todo por 162!
        ctx.drawImage(assets.chao, x, chaoY - deslocamentoParaCima, larguraChao, 400); 
    }
}

// ==========================================
// MOTOR DO JOGO (ORDEM DE RENDERIZAÇÃO)
// ==========================================
function loop() {
    if (isGameOver) return;
    
    desenharCeuGradient();

    // NUVENS (Desenha antes de tudo para ficarem lá atrás)
    cloudManager.spawn();
    cloudManager.update();
    cloudManager.draw();
    
    cenario.update(); 
    
    // ORDEM CRÍTICA DE CAMADAS EXECUTADA AQUI:
    cenario.drawFundo();     // 1. Prédio P1 (Fica atrás)
    cenario.drawGrama();
    desenharChaoAsfalto();   // 2. Imagem do Asfalto/Chão (Cobre o fundo do P1)
    cenario.drawMeioTermo(); // 3. Árvores e Placa (Ficam em cima do asfalto)
    
    if (isIntro) {
        ghost.update(); 
        ghost.draw();
    } else {
        player.update(); 
        player.draw(); 
        obstaculos.update(); 
        obstaculos.draw();
        
        if (frames % 10 === 0) { score++; scoreDisplay.textContent = score; }
    }
    
    frames++; 
    gameLoop = requestAnimationFrame(loop);
}

export function startRunner() {
    resizeCanvas(); 
    
    player.y = chaoY - player.h; player.dy = 0; player.grounded = true;
    player.currentRunFrame = 0; player.frameChangeTimer = 0;
    player.currentJumpFrame = 0; player.jumpFrameTimer = 0;

    ghost.y = chaoY - ghost.h; 
    ghost.x = 200;
    ghost.timer = 0;
    ghost.state = 'waiting';
    
    obstaculos.lista = []; obstaculos.spawnTimer = 0; 
    cenario.bgFarX = 0; cenario.bgNearX = 0; roadLineX = 0;
    
    score = 0; 
    frames = 0; 
    velocidadeJogo = 0; 
    isIntro = true;     
    isGameOver = false;
    
    scoreDisplay.textContent = score; 
    gameOverScreen.style.display = 'none';
    
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