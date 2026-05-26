import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const canvas = document.getElementById('runner-canvas');
const ctx = canvas.getContext('2d');

// Ajuste de DPI para telas retina/alta resolução
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();

canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;

ctx.scale(dpr, dpr);

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

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
let vidas = 1; // 1 é a vida normal. Pegar o ticket aumenta para 2.
let invulneravel = 0; // Timer para o personagem "piscar" quando perder a vida extra

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
    grama: new Image(),
    ticket: new Image(),
    fundoUltraDistante: new Image()
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

assets.fundoUltraDistante.src = imgBase + 'fundoUltraDistante.png';
assets.ticket.src = imgBase + 'ticket.png';

// Alterar a quantidade para 6
assets.nuvens = [
    new Image(), new Image(), new Image(), new Image(), new Image(), new Image()
];

// O nome do arquivo agora é "cloud" seguido do número
for(let i = 0; i < 6; i++) {
    assets.nuvens[i].src = imgBase + 'cloud' + (i + 1) + '.png'; // <--- ADICIONE ESTA LINHA
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
    bgUltraFarX: 0, // <-- NOVO: Posição do cenário distante
    bgFarX: 0, 
    bgNearX: 0, 
    larguraUltraFar: 700, // <-- Tamanho base largo para o panorama espalhar bem
    larguraP1: 360, 
    espacoP1: 1000,        
    larguraArvores: 3200,
    larguraGrama: 1600,
    
    // NOVO: Camada que preenche o céu vazio lá atrás de tudo
    drawUltraFundo() {
        const baseY = chaoY - 60; 
        let startX = Math.round(this.bgUltraFarX);
        
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraUltraFar) + 1; i++) {
            let offsetX = startX + (i * this.larguraUltraFar);
            // larguraUltraFar + 1 remove as frestas entre emendas
            ctx.drawImage(assets.fundoUltraDistante, offsetX, baseY - 220, this.larguraUltraFar + 1, 233.3);
        }
    },

    // CAMADA 1: Prédio de fundo
    drawFundo() {
        const cicloTotalP1 = this.larguraP1 + this.espacoP1;
        let startX = Math.round(this.bgFarX);

        for (let i = 0; i <= Math.ceil(canvas.width / cicloTotalP1) + 2; i++) {
            let offsetX = startX + (i * cicloTotalP1);
            ctx.drawImage(assets.p1, offsetX, chaoY - 193, this.larguraP1, 101.5);
        }
    },

    drawGrama() {
        const baseY = chaoY - 110; 
        let startX = Math.round(this.bgNearX);
        
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraGrama) + 1; i++) {
            let offsetX = startX + (i * this.larguraGrama);
            // +1 na largura impede a temida linha divisória na grama
            ctx.drawImage(assets.grama, offsetX, baseY, this.larguraGrama + 1, 120);
        }
    },

    drawMeioTermo() {
        const baseY = chaoY - 60; 
        let startX = Math.round(this.bgNearX);
        
        for (let i = 0; i <= Math.ceil(canvas.width / this.larguraArvores) + 1; i++) {
            let offsetX = startX + (i * this.larguraArvores);
            
            ctx.drawImage(assets.arvore1, offsetX + 150, baseY - 100, 100, 100);
            ctx.drawImage(assets.arvore2, offsetX + 650, baseY - 100, 168.1, 100);
            ctx.drawImage(assets.arvore3, offsetX + 1300, baseY - 180, 236.8, 180);
            ctx.drawImage(assets.placa, offsetX + 2100, baseY - 80, 88.4, 80);
            ctx.drawImage(assets.arvore1, offsetX + 2650, baseY - 80, 80, 80);
            ctx.drawImage(assets.arvore2, offsetX + 2950, baseY - 100, 168.1, 100);
        }
    },

    update(dt) {
        let delta = dt || 1; // Segurança caso o loop demore a entregar o frame
        
        // Movimento relativo: a montanha de trás move a 0.03 (quase parada)
        this.bgUltraFarX -= velocidadeJogo * 0.03 * delta; 
        this.bgFarX -= velocidadeJogo * 0.2 * delta; 
        this.bgNearX -= velocidadeJogo * 0.5 * delta;
        
        const cicloTotalP1 = this.larguraP1 + this.espacoP1;

        if (this.bgUltraFarX <= -this.larguraUltraFar) {
            this.bgUltraFarX += this.larguraUltraFar;
        }
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
        // O efeito de piscar (só acontece se invulneravel for maior que 0)
        if (invulneravel > 0 && Math.floor(Date.now() / 100) % 2 === 0) return; 

        if (!this.grounded) {
            ctx.drawImage(assets.playerJump[this.currentJumpFrame], this.x, this.y, this.w, this.h);
        } else {
            ctx.drawImage(assets.playerRun[this.currentRunFrame], this.x, this.y, this.w, this.h);
        }
    },
    update() {
        // AQUI ESTÁ A CORREÇÃO: O timer de invulnerabilidade cai um ponto por frame
        if (invulneravel > 0) invulneravel--; 

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
    // 1. Coloque o 'dt' aqui dentro dos parênteses
    update(dt) { 
        
        // 2. Corrigimos a aceleração maluca do celular baseando no score
        if (score > 0 && score % 100 === 0) {
            velocidadeJogo += 0.2; 
        }

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
            // 3. Multiplique o movimento por 'dt' para estabilizar a velocidade!
            obs.x -= velocidadeJogo * dt; 
            
            const pBoxX = player.x + 20; const pBoxY = player.y + 10; 
            const pBoxW = player.w - 40; const pBoxH = player.h - 20;

            const oBoxX = obs.x + obs.hitX; const oBoxY = obs.y + obs.hitY;
            const oBoxW = obs.w - (obs.hitX * 2); const oBoxH = obs.h - (obs.hitY * 2);
            
            // Substitua o bloco de colisão dentro de obstaculos.update(dt) por este:
            if (pBoxX < oBoxX + oBoxW && pBoxX + pBoxW > oBoxX && pBoxY < oBoxY + oBoxH && pBoxY + pBoxH > oBoxY) {
                
                // Se o personagem estiver piscando, o 'return' faz ele ignorar esse obstáculo (modo fantasma temporário)
                if (invulneravel > 0) return; 

                if (vidas > 1) {
                    vidas--; 
                    invulneravel = 120; // Toma a pancada e ganha 120 frames de pisca-pisca
                } else {
                    gameOver();
                }
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
// GERENCIADOR DE COLETÁVEIS (BRINDES)
// ==========================================
const coletaveis = {
    lista: [],
    spawnTimer: 1000, // Começa alto para demorar a aparecer o primeiro
    
    draw() {
        this.lista.forEach(item => {
            ctx.drawImage(item.image, item.x, item.y, item.w, item.h);
        });
    },
    
    update(dt) {
        this.spawnTimer--;
        
        // Timer bem longo (demora bastante para nascer)
        if (this.spawnTimer <= 0) {
            this.lista.push({ 
                x: canvas.width, 
                y: chaoY - 120 - (Math.random() * 40), 
                w: 76,  
                h: 40,  
                image: assets.ticket
            });
            
            // NOVO INTERVALO: Sorteia entre 1800 e 3000 frames (aprox. 30 a 50 segundos)
            this.spawnTimer = Math.floor(Math.random() * 1200 + 1800); 
        }

        this.lista.forEach((item, index) => {
            item.x -= velocidadeJogo * dt; 
            
            // Hitbox do Player
            const pBoxX = player.x + 20; const pBoxY = player.y + 10; 
            const pBoxW = player.w - 40; const pBoxH = player.h - 20;
            
            // Hitbox do Coletável
            if (pBoxX < item.x + item.w && pBoxX + pBoxW > item.x && pBoxY < item.y + item.h && pBoxY + pBoxH > item.y) {
                // Pegou o brinde!
                vidas++; 
                this.lista.splice(index, 1); // Remove da tela
            } else if (item.x + item.w < 0) {
                // Passou da tela sem pegar
                this.lista.splice(index, 1);
            }
        });
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
function desenharChaoAsfalto(dt) {
    let delta = dt || 1;
    const larguraChao = 1046; 
    const deslocamentoParaCima = 100; 
    roadLineX -= velocidadeJogo * delta; 
    
    if (roadLineX <= -larguraChao) {
        roadLineX = 0;
    }
    
    // Math.round + larguraChao + 1 sela a fresta vertical do chão definitivamente
    for (let x = Math.round(roadLineX); x < canvas.width; x += larguraChao) { 
        ctx.drawImage(assets.chao, x, chaoY - deslocamentoParaCima, larguraChao + 1, 400); 
    }
}

// ==========================================
// MOTOR DO JOGO (ORDEM DE RENDERIZAÇÃO)
// ==========================================
let lastTime = 0; // Adicione esta variável no topo, junto com as outras (let frames = 0;)

function loop(timestamp) {
    if (isGameOver) return;
    
    let deltaTime = (timestamp - lastTime) / 16.67; 
    lastTime = timestamp;

    desenharCeuGradient();
    cloudManager.spawn();
    cloudManager.update();
    cloudManager.draw();
    
    cenario.update(deltaTime);            // <-- Passando deltaTime
    cenario.drawUltraFundo();             // <-- Desenha as montanhas bem atrás de tudo
    cenario.drawFundo();
    cenario.drawGrama();
    desenharChaoAsfalto(deltaTime);       // <-- Passando deltaTime
    cenario.drawMeioTermo();
    
    if (isIntro) {
        ghost.update(); 
        ghost.draw();
    } else {
        player.update(); 
        player.draw(); 

        coletaveis.update(deltaTime); // <-- ATUALIZA BRINDES
        coletaveis.draw();

        obstaculos.update(deltaTime);     // <-- Passando deltaTime (Seus obstáculos vão voltar!)
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
    cenario.bgUltraFarX = 0; // <-- ADICIONE ISSO AQUI PARA RESETAR AS MONTANHAS
    cenario.bgFarX = 0; cenario.bgNearX = 0; roadLineX = 0;
    
    vidas = 1;
    invulneravel = 0;
    coletaveis.lista = [];
    coletaveis.spawnTimer = 1000;

    score = 0; 
    frames = 0; 
    velocidadeJogo = 0; 
    isIntro = true;     
    isGameOver = false;
    
    // IMPORTANTE: Resetamos o timestamp do deltaTime para não ter saltos
    lastTime = performance.now();
    
    scoreDisplay.textContent = score; 
    gameOverScreen.style.display = 'none';
    
    loop(performance.now()); // Passamos o tempo inicial
}

async function gameOver() {
    isGameOver = true; cancelAnimationFrame(gameLoop);
    const pontosConvertidos = Math.floor(score / 10);
    pointsEarnedDisplay.textContent = pontosConvertidos; 
    gameOverScreen.style.display = 'block';

    console.log("🏁 Game Over! Score:", score, "-> Pontos a somar:", pontosConvertidos);

    if (pontosConvertidos > 0) {
        const userId = localStorage.getItem('usuarioLogadoId');
        console.log("🔍 ID do usuário no localStorage:", userId);

        if (userId) {
            try {
                const userRef = doc(db, "inscritos", userId);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const pontosAtuais = parseInt(userSnap.data().pontos) || 0;
                    const novoTotal = pontosAtuais + pontosConvertidos;
                    
                    console.log("💾 Pontos no banco:", pontosAtuais, "+ Novos:", pontosConvertidos, "= Total:", novoTotal);
                    
                    await updateDoc(userRef, { pontos: novoTotal });
                    
                    localStorage.setItem('usuarioPontos', novoTotal);
                    const ticketDisplay = document.getElementById('user-points-display');
                    if (ticketDisplay) ticketDisplay.textContent = novoTotal;
                    
                    console.log("✅ SUCESSO! Pontos salvos no Firebase.");

                    // 👇 ADICIONE ESTA LINHA 👇
                    // Isso cria um megafone invisível avisando o navegador inteiro que os pontos mudaram
                    window.dispatchEvent(new Event('pontosAtualizados'));

                } else {
                    console.warn("⚠️ ERRO: Usuário não encontrado na coleção 'inscritos' do Firebase!");
                }
            } catch (erro) { 
                console.error("❌ FIREBASE BLOQUEOU O SALVAMENTO:", erro); 
            }
        } else {
            console.warn("⚠️ ERRO: Nenhum ID logado no localStorage. O jogo não sabe para quem dar os pontos.");
        }
    }
}

if(btnRestart) btnRestart.addEventListener('click', startRunner);