import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

// Elementos da Fase 1
const gridPalestrantes = document.getElementById('grid-palestrantes');
const gridOficinas = document.getElementById('grid-oficinas');

// Contêineres principais de Fases
const containerFase1 = document.getElementById('container-fase1');
const containerFase2 = document.getElementById('container-fase2');

const docConvidadosRef = doc(db, "configuracoes", "anuncios");

// CATÁLOGO COMPLETO
const catalogoConvidados = {
    "palestrante-01": { nome: "Nome 1", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-02": { nome: "Nome 2", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-03": { nome: "Nome 3", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-04": { nome: "Nome 4", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-05": { nome: "Nome 5", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-06": { nome: "Nome 6", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-07": { nome: "Nome 7", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-08": { nome: "Nome 8", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-09": { nome: "Nome 9", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-10": { nome: "Nome 10", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "palestrante-11": { nome: "Nome 11", descricao: "Cargo", arquivoSvg: "jean-geal" },
    "oficina-01": { nome: "Oficina 01", descricao: "Ofertante", arquivoSvg: "jean-geal" },
    "oficina-02": { nome: "Oficina 02", descricao: "Ofertante", arquivoSvg: "jean-geal" },
    "oficina-03": { nome: "Oficina 03", descricao: "Ofertante", arquivoSvg: "jean-geal" },
    "oficina-04": { nome: "Oficina 04", descricao: "Ofertante", arquivoSvg: "jean-geal" },
    "oficina-05": { nome: "Oficina 05", descricao: "Ofertante", arquivoSvg: "jean-geal" },
    "oficina-06": { nome: "Oficina 06", descricao: "Ofertante", arquivoSvg: "jean-geal" }
};

// 1. ESCUTA O BANCO DE DADOS EM TEMPO REAL (GERENCIA FASES)
onSnapshot(docConvidadosRef, (docSnap) => {
    if (docSnap.exists()) {
        const dados = docSnap.data();
        const ativos = dados.ativos || [];
        const modoAtual = dados.modo || "fase1"; // Padrão é fase 1 se estiver vazio no banco

        if (modoAtual === "fase2") {
            // Ativa o Cronograma Oficial (Esconde Fase 1, Mostra Fase 2)
            if (containerFase1) containerFase1.style.display = "none";
            if (containerFase2) containerFase2.style.display = "block";
        } else {
            // Mantém os Anúncios Ativos (Mostra Fase 1, Esconde Fase 2)
            if (containerFase1) containerFase1.style.display = "block";
            if (containerFase2) containerFase2.style.display = "none";

            // Renderiza a lista de Anúncios normalmente
            if (gridPalestrantes) gridPalestrantes.innerHTML = "";
            if (gridOficinas) gridOficinas.innerHTML = "";

            // Filtra e desenha
            ativos.forEach((id) => {
                const convidado = catalogoConvidados[id];
                if (!convidado) return;

                const isOficina = id.startsWith('oficina-');
                const targetGrid = isOficina ? gridOficinas : gridPalestrantes;

                const cardHTML = `
                    <div class="card-convidado">
                        <img src="assets/svg/${convidado.arquivoSvg}.svg" alt="Foto">
                        <h2>${convidado.nome}</h2>
                        <p>${convidado.descricao}</p>
                    </div>
                `;
                targetGrid.insertAdjacentHTML('beforeend', cardHTML);
            });
        }
    }
});

// 2. LÓGICA DE INTERAÇÃO DAS ABAS (FASE 2)
const botoesDias = document.querySelectorAll('.btn-dia-tab');
const tracksCronograma = document.querySelectorAll('.cronograma-track');

botoesDias.forEach(botao => {
    botao.addEventListener('click', () => {
        // Remove 'active' de todos os botões
        botoesDias.forEach(btn => btn.classList.remove('active'));
        // Adiciona classe ativa no botão clicado
        botao.classList.add('active');

        // Esconde todos os carrosséis de dias
        tracksCronograma.forEach(track => track.style.display = 'none');

        // Mostra o carrossel correspondente ao dia clicado
        const diaSelecionado = botao.dataset.dia;
        const trackAlvo = document.getElementById(`track-dia-${diaSelecionado}`);
        if (trackAlvo) {
            trackAlvo.style.display = 'flex';
            trackAlvo.scrollLeft = 0; // Reseta o scroll para o começo do dia
        }
    });
});