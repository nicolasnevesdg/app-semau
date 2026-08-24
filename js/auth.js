import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Elementos do Login
const inputEmail = document.getElementById('input-email');
const tokenBoxes = document.querySelectorAll('.token-box'); 
const btnEntrar = document.getElementById('btn-entrar');
const btnSair = document.getElementById('btn-sair');
const btnCronograma = document.getElementById('btn-fase-cronograma');
const btnInscricao = document.getElementById('btn-fase-inscricao');
const btnCredencial = document.getElementById('btn-fase-credencial');
const docConfigRef = doc(db, "configuracoes", "geral");

// Elementos do Dashboard (Ingresso)
const userNameDisplay = document.getElementById('user-name-display');
const userTokenDisplay = document.getElementById('user-token-display');
const userPointsDisplay = document.getElementById('user-points-display');

// 👇 PARTE A: Capturando o quadrado onde o QR Code vai ser desenhado
const qrCodeContainer = document.getElementById('qrcode-ticket');

// Telas e Menu
const viewLogin = document.getElementById('view-login');
const viewDashboard = document.getElementById('view-dashboard');
const navProfile = document.getElementById('nav-profile');

// 👇 ADICIONE ESTAS DUAS LINHAS AQUI 👇
const logoTopo = document.querySelector('.logo-topo');
const txtBoasVindas = document.getElementById('txt-boas-vindas');

// Elementos do Modal de QR Code
const qrModal = document.getElementById('qr-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const qrModalCanvas = document.getElementById('qr-modal-canvas');

// Função que abre o Modal e desenha um QR Code gigante
function abrirModalQR(textoQRCode) {
    if (!qrModal || !qrModalCanvas) return;
    qrModalCanvas.innerHTML = '';
    new QRCode(qrModalCanvas, {
        text: textoQRCode,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    qrModal.style.display = 'flex';
}

// Fechar o modal no "X"
if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => qrModal.style.display = 'none');
}

// Fechar o modal se o usuário clicar no fundo escuro
if (qrModal) {
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) qrModal.style.display = 'none';
    });
}

// ==========================================
// LÓGICA PARA SALTAR ENTRE OS CAMPOS DO TOKEN
// ==========================================
tokenBoxes.forEach((box, index) => {
    box.addEventListener('input', (e) => {
        box.value = box.value.toUpperCase(); 
        if (box.value.length === 1 && index < tokenBoxes.length - 1) {
            tokenBoxes[index + 1].focus();
        }
    });
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && box.value === '' && index > 0) {
            tokenBoxes[index - 1].focus();
        }
    });
});

// ==========================================
// 👇 PARTE B: A FUNÇÃO QUE DESENHA O QR CODE
// ==========================================
const INTERVALO_QR_MS = 30000;
let tokenQrAtivo = null;
let intervaloQr = null;
let slotQrRenderizado = null;

function criarPayloadQr(token) {
    const slot = Math.floor(Date.now() / INTERVALO_QR_MS);
    return 'SEMAU|' + token + '|' + slot;
}

function desenharQrDinamico(forcar = false) {
    if (!qrCodeContainer || !tokenQrAtivo) return;
    const slotAtual = Math.floor(Date.now() / INTERVALO_QR_MS);
    const segundosRestantes = 30 - Math.floor((Date.now() % INTERVALO_QR_MS) / 1000);
    const validade = document.getElementById('qr-validade');
    if (validade) validade.textContent = 'Atualiza em ' + segundosRestantes + 's';
    if (!forcar && slotAtual === slotQrRenderizado) return;
    slotQrRenderizado = slotAtual;
    const payload = criarPayloadQr(tokenQrAtivo);
    qrCodeContainer.innerHTML = '';
    new QRCode(qrCodeContainer, {
        text: payload,
        width: 150,
        height: 150,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    qrCodeContainer.onclick = () => abrirModalQR(criarPayloadQr(tokenQrAtivo));
    if (qrModal?.style.display === 'flex') abrirModalQR(payload);
}

function gerarQRCode(token) {
    tokenQrAtivo = token;
    slotQrRenderizado = null;
    if (intervaloQr) clearInterval(intervaloQr);
    desenharQrDinamico(true);
    intervaloQr = setInterval(() => desenharQrDinamico(), 1000);
}

function pararQrDinamico() {
    if (intervaloQr) clearInterval(intervaloQr);
    intervaloQr = null;
    tokenQrAtivo = null;
    slotQrRenderizado = null;
}

// ==========================================
// CATÁLOGO DE OFICINAS (As 6 oficinas)
// ==========================================
const catalogoOficinas = {
    "OF01": { titulo: "Oficina de Levantamento", data: "22/Set - 13:30" },
    "OF02": { titulo: "Oficina de Cerâmica", data: "22/Set - 13:30" },
    "OF03": { titulo: "Oficina de Aquarela", data: "23/Set - 15:40" },
    "OF04": { titulo: "Jogo do Cuidado", data: "23/Set - 15:40" },
    "OF05": { titulo: "Oficina de Mobiliário", data: "24/Set - 13:30" },
    "OF06": { titulo: "Oficina de Pintura de Mural", data: "24/Set - 13:30" }
};

const containerOficinas = document.getElementById('container-oficinas');
const listaOficinas = document.getElementById('lista-oficinas');

// ==========================================
// FUNÇÃO: DESENHAR INGRESSOS DAS OFICINAS
// ==========================================
function renderizarOficinas(tokenUsuario, oficinasDoAluno) {

    // Se o aluno não tiver oficinas (ou se o campo não existir), esconde a área
    if (!oficinasDoAluno || oficinasDoAluno.length === 0) {
        if(containerOficinas) containerOficinas.style.display = 'none';
        return;
    }

    // Se tiver, mostra a área e limpa a lista velha
    if(containerOficinas) containerOficinas.style.display = 'block';
    if(listaOficinas) listaOficinas.innerHTML = ''; 

    // Passa por cada oficina que o aluno tem e cria o ingresso
    oficinasDoAluno.forEach((idOficina) => {
        const oficina = catalogoOficinas[idOficina];
        if (!oficina) return; // Se o ID não existir no catálogo, ignora

        const divId = `qr-${idOficina}`; // ID único pra caixa do QR Code
        const tokenDaOficina = `${tokenUsuario}-${idOficina}`; // O segredo da segurança (Ex: QC8YS-OF01)

        const cardHTML = `
            <div class="ticket-oficina" data-oficina="${idOficina}">
                <div class="ticket-oficina-info">
                    <span class="tag-oficina">${idOficina}</span>
                    <h4 class="ticket-oficina-titulo">${oficina.titulo}</h4>
                    <p class="ticket-oficina-data">${oficina.data}</p>
                </div>
                <div class="ticket-oficina-qr">
                    <div id="${divId}"></div>
                </div>
            </div>
        `;
        
        listaOficinas.insertAdjacentHTML('beforeend', cardHTML);

        // Dá um tempinho mínimo (100ms) pro HTML renderizar e depois desenha o QR Code dentro dele
        setTimeout(() => {
            const containerOficina = document.getElementById(divId);
            new QRCode(containerOficina, {
                text: tokenDaOficina,
                width: 58,
                height: 58,
                colorDark : "#000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M
            });

            // NOVO: Adiciona o evento de clique na oficina para abrir o modal
            containerOficina.onclick = () => abrirModalQR(tokenDaOficina);
        }, 100);
    });
}

// ==========================================
// 1. LÓGICA DE LOGIN (ENTRAR)
// ==========================================
if (btnEntrar) {
    btnEntrar.addEventListener('click', async () => {
        const emailDigitado = inputEmail.value.trim().toLowerCase();
        const tokenDigitado = Array.from(tokenBoxes).map(box => box.value).join('');
        

        if (!emailDigitado || tokenDigitado.length < 5) {
            alert("Por favor, preencha seu e-mail e os 5 caracteres do Token.");
            return;
        }

        btnEntrar.textContent = "Verificando...";
        btnEntrar.disabled = true;

        try {
            const inscritosRef = collection(db, "inscritos");
            const q = query(inscritosRef, where("email", "==", emailDigitado), where("token", "==", tokenDigitado));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                querySnapshot.forEach((docSnap) => {
                    const dadosUsuario = docSnap.data();
                    
                    userNameDisplay.textContent = dadosUsuario.nome;
                    userTokenDisplay.textContent = dadosUsuario.token;
                    userPointsDisplay.textContent = dadosUsuario.pontos || 0;
                    
                    // Salva a sessão no navegador
                    localStorage.setItem('usuarioLogadoId', docSnap.id); 
                    localStorage.setItem('usuarioPoints', dadosUsuario.pontos || 0);
                    window.dispatchEvent(new Event('usuarioLoginAlterado'));

                    // 👇 PARTE C (1/2): Gerar o QR Code logo após o login dar certo
                    gerarQRCode(dadosUsuario.token);
                    
                    // 👇 CHAMA A FUNÇÃO DAS OFICINAS AQUI:
                    renderizarOficinas(dadosUsuario.token, dadosUsuario.oficinas);

                    // Atualiza o menu para mostrar o ícone do Quiz!
                    atualizarMenuInferior();

                    // Troca a tela
                    viewLogin.style.display = 'none';
                    viewLogin.classList.remove('active');
                    viewDashboard.style.display = 'block';
                    viewDashboard.classList.add('active');
                    
                    // 👇 CAPTURA DINÂMICA AQUI DENTRO 👇
                    const txtBoasVindasDynamic = document.getElementById('txt-boas-vindas');

                    if (txtBoasVindasDynamic && dadosUsuario.nome) {
                        const primeiroNome = dadosUsuario.nome.split(' ')[0]; 
                        txtBoasVindasDynamic.textContent = `Olá, ${primeiroNome}`;
                    }
                    
                    inputEmail.value = "";
                    tokenBoxes.forEach(box => box.value = "");
                });
            } else {
                alert("E-mail ou Token incorretos. Tente novamente!");
            }
        } catch (error) {
            console.error("Erro ao fazer login: ", error);
            alert("Erro ao conectar com o servidor.");
        } finally {
            btnEntrar.textContent = "Acessar Meu Espaço";
            btnEntrar.disabled = false;
        }
    });
}

// ==========================================
// 2. LÓGICA DE LOGOUT (SAIR)
// ==========================================
if (btnSair) {
    btnSair.addEventListener('click', () => {
        localStorage.removeItem('usuarioLogadoId');
        localStorage.removeItem('usuarioPoints');
        pararQrDinamico();
        window.dispatchEvent(new Event('usuarioLoginAlterado'));

        // Atualiza o menu para esconder o ícone do Quiz!
        atualizarMenuInferior();
        
        // 👇 RESET DO TOPO AQUI DENTRO 👇
        const logoPrincipal = document.getElementById('logo-principal');
        if (logoPrincipal) {
            logoPrincipal.style.display = 'block'; // Mostra o semau.app de novo
        }
        
        viewDashboard.style.display = 'none';
        viewDashboard.classList.remove('active');
        viewLogin.style.display = 'block';
        viewLogin.classList.add('active');
    });
}

// ==========================================
// 3. A "MEMÓRIA": VERIFICAR SESSÃO ATIVA
// ==========================================
async function verificarSessao() {
    const userId = localStorage.getItem('usuarioLogadoId');
    
    if (userId) {
        try {
            const userRef = doc(db, "inscritos", userId);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                const dadosUsuario = docSnap.data();
                userNameDisplay.textContent = dadosUsuario.nome;
                userTokenDisplay.textContent = dadosUsuario.token;
                userPointsDisplay.textContent = dadosUsuario.pontos || 0;
                localStorage.setItem('usuarioPoints', dadosUsuario.pontos || 0);
                
                // 👇 PARTE C (2/2): Gerar o QR Code se o usuário já abrir o app logado
                gerarQRCode(dadosUsuario.token);

                // 👇 CHAMA A FUNÇÃO DAS OFICINAS:
                renderizarOficinas(dadosUsuario.token, dadosUsuario.oficinas);

                // 2. Mantém o código que dá "Olá" com o seu nome
                const txtBoasVindasDynamic = document.getElementById('txt-boas-vindas');
                if (txtBoasVindasDynamic && dadosUsuario.nome) {
                    const primeiroNome = dadosUsuario.nome.split(' ')[0]; 
                    txtBoasVindasDynamic.textContent = `Olá, ${primeiroNome}`;
                }
                
                if (txtBoasVindasDynamic && dadosUsuario.nome) {
                    const primeiroNome = dadosUsuario.nome.split(' ')[0]; 
                    txtBoasVindasDynamic.innerHTML = `Olá, <b style="font-weight: 800;">${primeiroNome}</b>`;
                }
            }
        } catch (erro) {
            console.error("Erro ao recuperar sessão silenciosa:", erro);
        }
    }
}

if (navProfile) {
    navProfile.addEventListener('click', () => {
        const userId = localStorage.getItem('usuarioLogadoId');
        
        viewLogin.style.display = 'none';
        viewDashboard.style.display = 'none';
        
        if (userId) {
            viewDashboard.style.display = 'block';
            verificarSessao(); 
        } else {
            viewLogin.style.display = 'block';
        }
    });
}

setTimeout(verificarSessao, 500);

onSnapshot(docConfigRef, (docSnap) => {
    if (docSnap.exists()) {
        const fase = docSnap.data().faseAtual;

        // Esconde todos primeiro
        if(btnCronograma) btnCronograma.style.display = 'none';
        if(btnInscricao) btnInscricao.style.display = 'none';
        if(btnCredencial) btnCredencial.style.display = 'none';

        // Mostra só o que o admin mandou (usando 'flex' por causa do nosso SVG no CSS)
        if (fase === 'cronograma' && btnCronograma) {
            btnCronograma.style.display = 'flex';
        } else if (fase === 'inscricao' && btnInscricao) {
            btnInscricao.style.display = 'flex';
        } else if (fase === 'credencial' && btnCredencial) {
            btnCredencial.style.display = 'flex';
        }
    } else {
        // Se o documento não existir ainda no banco, mostra o cronograma por padrão
        if(btnCronograma) btnCronograma.style.display = 'flex';
    }
});

// ==========================================
// MÁGICA: SENSOR DA ÁREA DO INSCRITO
// ==========================================
const telaDashboardObserver = document.getElementById('view-dashboard');
const logoPrincipalGlobal = document.getElementById('logo-principal');

if (telaDashboardObserver && logoPrincipalGlobal) {
    function checarLogoVisivel() {
        // Se a tela do dashboard estiver com display block OU com a classe 'active'
        if (telaDashboardObserver.style.display === 'block' || telaDashboardObserver.classList.contains('active')) {
            logoPrincipalGlobal.style.display = 'none'; // Esconde na Área do Inscrito
        } else {
            logoPrincipalGlobal.style.display = 'block'; // Mostra nas outras abas
        }
    }
    
    // Cria o "olheiro" que avisa sempre que a classe ou o estilo do dashboard mudar
    const observer = new MutationObserver(checarLogoVisivel);
    
    // Manda o olheiro vigiar a seção do dashboard
    observer.observe(telaDashboardObserver, { attributes: true, attributeFilter: ['style', 'class'] });
    
    // Executa uma vez no início para garantir que carregue certo
    checarLogoVisivel();
}

const btnNavQuiz = document.getElementById('nav-quiz');

export function atualizarMenuInferior() {
    if (!btnNavQuiz) return;
    btnNavQuiz.style.removeProperty('display');
}

// Execute logo na abertura do app para checar se já havia um login salvo
atualizarMenuInferior();

(function() {
    setTimeout(function() {
        // String contendo a estrutura HTML oculta em Base64
        var assinaturaHTML = 'PGRpdiBzdHlsZT0idGV4dC1hbGlnbjogY2VudGVyOyBmb250LXNpemU6IDEycHg7IG9wYWNpdHk6IDAuNDsgbWFyZ2luLXRvcDogMzBweDsgcGFkZGluZy1ib3R0b206IDEwcHg7Ij5hcHAgd2ViIGRlc2Vudm9sdmlkbyBwb3IgPGEgaHJlZj0iaHR0cHM6Ly9uaWNvbGFzbmV2ZXMuY29tLmJyIiB0YXJnZXQ9Il9ibGFuayIgc3R5bGU9ImNvbG9yOiBpbmhlcml0OyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsiPk7DrWNvbGFzIE5ldmVzPC9hPjwvZGl2Pg==';
        
        // MÁGICA AQUI: Decodificador especial para não quebrar os acentos (UTF-8)
        var htmlDecodificado = decodeURIComponent(escape(atob(assinaturaHTML)));
        
        // 1. Injeta no rodapé da caixa de login
        var loginContainer = document.querySelector('.login-container');
        if (loginContainer) {
            loginContainer.insertAdjacentHTML('beforeend', htmlDecodificado);
        }
        
        // 2. Injeta no final da Área do Inscrito (Dashboard)
        var dashboardView = document.getElementById('view-dashboard');
        if (dashboardView) {
            dashboardView.insertAdjacentHTML('beforeend', htmlDecodificado);
        }
    }, 500);
})();
