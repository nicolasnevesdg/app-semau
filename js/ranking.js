// Importando o banco de dados e as funções de busca avançada
import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Elementos da tela
const rankingList = document.getElementById('ranking-list');
const navProfile = document.getElementById('nav-profile');
const btnEntrar = document.getElementById('btn-entrar');
const btnVoltarDashboard = document.getElementById('btn-voltar-dashboard');

export async function carregarRanking() {
    if (!rankingList) return;
    rankingList.innerHTML = '<li style="text-align:center;">Atualizando placar... ⏳</li>';

    try {
        const inscritosRef = collection(db, "inscritos");
        
        // A MÁGICA: Ordena pelos pontos decrescentes (desc) e limita a 5 resultados
        const q = query(inscritosRef, orderBy("pontos", "desc"), limit(5));
        const querySnapshot = await getDocs(q);

        rankingList.innerHTML = ''; 
        
        let posicao = 1;
        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            
            // Pega apenas o primeiro nome para não quebrar o layout
            const primeiroNome = dados.nome ? dados.nome.split(' ')[0] : 'Inscrito';
            
            let icone = `${posicao}º`;
            let classeExtra = '';
            
            // Atribui medalhas e classes CSS
            if (posicao === 1) { icone = '🥇'; classeExtra = 'top-1'; }
            if (posicao === 2) { icone = '🥈'; classeExtra = 'top-2'; }
            if (posicao === 3) { icone = '🥉'; classeExtra = 'top-3'; }

            const li = document.createElement('li');
            li.className = `ranking-item ${classeExtra}`;
            li.innerHTML = `<span>${icone} ${primeiroNome}</span> <strong>${dados.pontos || 0} pts</strong>`;
            
            rankingList.appendChild(li);
            posicao++;
        });

    } catch (error) {
        console.error("Erro ao buscar o ranking:", error);
        
        // Aviso de erro no console para criar índices (MUITO COMUM NO FIREBASE)
        if(error.message.includes('index')) {
            console.warn("⚠️ O Firebase precisa que você crie um índice. Clique no link que apareceu neste erro para criá-lo automaticamente!");
        }

        rankingList.innerHTML = '<li style="text-align:center; color:#dc3545;">Erro ao carregar o placar.</li>';
    }
}

// ==========================================
// QUANDO ATUALIZAR O RANKING?
// ==========================================

// 1. Sempre que clicar no menu "Perfil"
if (navProfile) navProfile.addEventListener('click', carregarRanking);

// 2. Um segundo após clicar em "Entrar" no login (para dar tempo da tela trocar)
if (btnEntrar) btnEntrar.addEventListener('click', () => setTimeout(carregarRanking, 1000));

// 3. Ao voltar do Quiz
if (btnVoltarDashboard) btnVoltarDashboard.addEventListener('click', carregarRanking);

// ==========================================
// QUANDO ATUALIZAR O RANKING?
// ==========================================

// NOVO GATILHO: Sempre que clicar no ícone do controle no menu inferior
const navQuiz = document.getElementById('nav-quiz');
if (navQuiz) navQuiz.addEventListener('click', carregarRanking);

// Mantém os outros caso queira atualizar ao logar
if (navProfile) navProfile.addEventListener('click', carregarRanking);
if (btnEntrar) btnEntrar.addEventListener('click', () => setTimeout(carregarRanking, 1000));
if (btnVoltarDashboard) btnVoltarDashboard.addEventListener('click', carregarRanking);