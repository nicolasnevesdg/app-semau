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
    "palestrante-01": { nome: "Ethel Pinheiro", descricao: "Arquiteta, urbanista e professora da UFRJ", arquivoSvg: "jean-geal" },
    "palestrante-02": { nome: "Ester Carro", descricao: "Arquiteta, pesquisadora e professora universitária", arquivoSvg: "jean-geal" },
    "palestrante-03": { nome: "Convidado(a) em breve", descricao: "Palestra de segunda-feira, às 15h50", arquivoSvg: "jean-geal" },
    "palestrante-04": { nome: "Thaysa Malaquias", descricao: "Arquiteta, urbanista e pesquisadora do LabLugares — PROARQ/UFRJ", arquivoSvg: "jean-geal" },
    "palestrante-05": { nome: "Rafael Zamorano", descricao: "Historiador e diretor substituto do Sítio Roberto Burle Marx", arquivoSvg: "jean-geal" },
    "palestrante-06": { nome: "Convidado(a) em breve", descricao: "Palestra de quarta-feira, às 09h10", arquivoSvg: "jean-geal" },
    "palestrante-07": { nome: "Roberto Cruz Saavedra", descricao: "Arquiteto e urbanista do Cruz Saavedra Arquitetura", arquivoSvg: "jean-geal" },
    "palestrante-08": { nome: "Urb.Anas", descricao: "Com Beatriz Corbacho, Camille Rodrigues, Lívia Perfeito, Maria Eduarda Werneck e Mariana Pio", arquivoSvg: "jean-geal" },
    "palestrante-09": { nome: "Convidado(a) em breve", descricao: "Palestra de quinta-feira, às 09h10", arquivoSvg: "jean-geal" },
    "palestrante-10": { nome: "Pedro Rajão · Negromuro", descricao: "Integrante do coletivo Negromuro", arquivoSvg: "jean-geal" },
    "palestrante-11": { nome: "Verônica Natividade", descricao: "Arquiteta, pesquisadora e professora da PUC-Rio", arquivoSvg: "jean-geal" },
    "oficina-01": { nome: "Oficina de Levantamento", descricao: "Com Raphael Valcarce", arquivoSvg: "jean-geal" },
    "oficina-02": { nome: "Oficina de Cerâmica", descricao: "Ministrante em breve", arquivoSvg: "jean-geal" },
    "oficina-03": { nome: "Oficina de Aquarela", descricao: "Com Alberto Kaplan", arquivoSvg: "jean-geal" },
    "oficina-04": { nome: "Jogo do Cuidado", descricao: "Com o coletivo Urb.Anas", arquivoSvg: "jean-geal" },
    "oficina-05": { nome: "Oficina de Mobiliário", descricao: "Ministrante em breve", arquivoSvg: "jean-geal" },
    "oficina-06": { nome: "Oficina de Pintura de Mural", descricao: "Ministrante em breve", arquivoSvg: "jean-geal" }
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

            // Elementos de controle da Fase 1
            const emptyState = document.getElementById('empty-state-programacao');
            const sectionPalestrantes = document.getElementById('section-palestrantes');
            const sectionOficinas = document.getElementById('section-oficinas');

            if (gridPalestrantes) gridPalestrantes.innerHTML = "";
            if (gridOficinas) gridOficinas.innerHTML = "";

            // Verifica o que temos anunciado hoje
            const temPalestrante = ativos.some(id => !id.startsWith('oficina-'));
            const temOficina = ativos.some(id => id.startsWith('oficina-'));

            // REGRA 1 e 4: Cadeira Vazia
            if (!temPalestrante && !temOficina) {
                if (emptyState) emptyState.style.display = "flex";
                if (sectionPalestrantes) sectionPalestrantes.style.display = "none";
                if (sectionOficinas) sectionOficinas.style.display = "none";
                return; // Para a execução por aqui se estiver tudo vazio
            } else {
                if (emptyState) emptyState.style.display = "none";
            }

            // REGRA 2 e 3: Títulos e Grids dinâmicos
            if (sectionPalestrantes) sectionPalestrantes.style.display = temPalestrante ? "block" : "none";
            if (sectionOficinas) sectionOficinas.style.display = temOficina ? "block" : "none";

            // Filtra e desenha os cards de quem está anunciado
            ativos.forEach((id) => {
                const convidado = catalogoConvidados[id];
                if (!convidado) return;

                const isOficina = id.startsWith('oficina-');
                const targetGrid = isOficina ? gridOficinas : gridPalestrantes;

                const cardHTML = `
                    <div class="card-convidado">
                        <div class="card-convidado-foto">
                            <img src="assets/svg/${convidado.arquivoSvg}.svg" alt="Foto de ${convidado.nome}">
                        </div>
                        <div class="card-convidado-texto">
                            <h2>${convidado.nome}</h2>
                            <p>${convidado.descricao}</p>
                        </div>
                    </div>
                `;
                targetGrid.insertAdjacentHTML('beforeend', cardHTML);
            });
        }
    }
});

// 2. LÓGICA DE INTERAÇÃO DAS ABAS (FASE 2)
// DADOS PROVISORIOS DAS PALESTRAS DO CRONOGRAMA OFICIAL
// Troque nomes, cargos, professores, temas, resumos e fotos aqui quando o conteudo final chegar.
const intervalosPalestras = ['10:30?11:40','14:10?15:20','15:50?17:00','09:10?10:20','10:40?12:00','09:10?10:20','10:40?12:00','14:10?15:20','09:10?10:20','10:40?11:30','09:10?10:20'];
const temasPalestras = [
    'Tema da palestra em breve', 'Tema da palestra em breve', 'Informações em breve',
    'Tema da palestra em breve', 'Sítio Roberto Burle Marx', 'Tema da palestra em breve',
    'Pedra Lisa', 'Tema da palestra em breve', 'Tema da palestra em breve',
    'Tema da palestra em breve', 'Tema da palestra em breve'
];
const resumosPalestras = [
    'Atuação em representação, cultura, cidade, complexidade, memória e teoria do afeto.',
    'Palestra com Ester Carro, do Instituto Fazendinhando. A descrição completa será publicada em breve.',
    'Palestrante, tema e descrição aguardando confirmação.',
    'Pesquisa e prática em arquitetura, com atuação em projeto de legalização e pesquisa acadêmica.',
    'Uma conversa sobre história, patrimônio, museus e o Sítio Roberto Burle Marx.',
    'Palestrante e tema aguardando confirmação.',
    'Uma conversa sobre arquitetura social, urbanismo participativo, requalificação urbana e transformação de territórios.',
    'Coletivo formado por Beatriz Corbacho, Camille Rodrigues, Lívia Perfeito, Maria Eduarda Werneck e Mariana Pio, com pesquisas sobre urbanismo, feminismo, gênero e interseccionalidade.',
    'Palestrante e tema aguardando confirmação.',
    'Encontro com Pedro Rajão, do coletivo Negromuro. As informações completas da palestra serão publicadas em breve.',
    'Inteligência artificial, fabricação digital, design paramétrico e habitação de interesse social.'
];
const palestrantesDemo = [
    { nome: 'Ethel Pinheiro', cargo: 'Arquiteta, urbanista e professora da UFRJ', professor: 'Bruna Mota Rodrigues', professorCargo: 'Professora Assistente da UFRRJ' },
    { nome: 'Ester Carro', cargo: 'Arquiteta, pesquisadora e professora universitária', professor: 'Samira Bueno Chahin', professorCargo: 'Mediação' },
    { nome: 'Convidado(a) a confirmar', cargo: 'Informações em breve', professor: 'Mediação a confirmar', professorCargo: 'Informações em breve' },
    { nome: 'Thaysa Malaquias', cargo: 'Arquiteta, urbanista e pesquisadora do LabLugares — PROARQ/UFRJ', professor: 'Silvia Scoralich de Carvalho', professorCargo: 'Docente do DAU/UFRRJ' },
    { nome: 'Rafael Zamorano', cargo: 'Historiador e diretor substituto do Sítio Roberto Burle Marx', professor: 'Luiz Augusto dos Reis', professorCargo: 'Mediação' },
    { nome: 'Convidado(a) a confirmar', cargo: 'Informações em breve', professor: 'Lorena Couto', professorCargo: 'Mediação' },
    { nome: 'Roberto Cruz Saavedra', cargo: 'Arquiteto e urbanista · Cruz Saavedra Arquitetura', professor: 'Marlise Sanchotene de Aguiar', professorCargo: 'Docente do DAU/IT/UFRRJ' },
    { nome: 'Urb.Anas', cargo: 'Beatriz Corbacho, Camille Rodrigues, Lívia Perfeito, Maria Eduarda Werneck e Mariana Pio', professor: 'Denise de Alcântara Pereira', professorCargo: 'Mediação' },
    { nome: 'Convidado(a) a confirmar', cargo: 'Informações em breve', professor: 'Ana Luiza Gambardella', professorCargo: 'Mediação' },
    { nome: 'Pedro Rajão · Negromuro', cargo: 'Integrante do coletivo Negromuro', professor: 'Gabriel Girnos', professorCargo: 'Professor do DAU/IT/UFRRJ' },
    { nome: 'Verônica Natividade', cargo: 'Arquiteta, pesquisadora e professora da PUC-Rio', professor: 'Juarez Franco', professorCargo: 'Mediação' }
];

const palestrasCronograma = intervalosPalestras.map((horario, indice) => ({
    horario,
    palestrante: palestrantesDemo[indice].nome,
    cargo: palestrantesDemo[indice].cargo,
    professor: palestrantesDemo[indice].professor,
    professorCargo: palestrantesDemo[indice].professorCargo || 'Docente da UFRRJ',
    professorFoto: 'assets/img/professor-teste_1.png',
    titulo: temasPalestras[indice],
    resumo: resumosPalestras[indice],
    foto: 'assets/img/palestrante-teste.png'
}));

function renderizarPalestrasCronograma() {
    const cards = Array.from(document.querySelectorAll('.schedule-card')).filter(card => card.querySelector('.type-tag.palestra'));
    cards.forEach((card, indice) => {
        const palestra = palestrasCronograma[indice];
        if (!palestra) return;
        card.classList.add('schedule-card-palestra');
        const [inicio, fim] = palestra.horario.split('?');
        card.innerHTML = `
            <div class="palestra-capa">
                <img src="${palestra.foto}" alt="Foto de ${palestra.palestrante}">
                <div class="palestra-capa-topo">
                    <span class="palestra-hora"><strong>${inicio}</strong><i></i><strong>${fim}</strong></span>
                    <span class="type-tag palestra">Palestra</span>
                </div>
            </div>
            <div class="palestra-corpo">
                <div class="palestra-identidade">
                    <h3>${palestra.palestrante}</h3>
                    <p>${palestra.cargo}</p>
                </div>
                <div class="palestra-conteudo">
                    <h4>${palestra.titulo}</h4>
                    <p>${palestra.resumo}</p>
                </div>
                <div class="palestra-mesa">
                    <img src="${palestra.professorFoto}" alt="Foto de ${palestra.professor}">
                    <div><strong>${palestra.professor}</strong><small>${palestra.professorCargo}</small></div>
                </div>
            </div>`;
    });
}

renderizarPalestrasCronograma();

// DADOS PROVISORIOS DAS OFICINAS DO CRONOGRAMA OFICIAL
const oficinasCronograma = [
    { horario: '13:30?15:00', ministrante: 'Raphael Valcarce', cargo: 'Professor e vice-coordenador do DAU/UFRRJ', titulo: 'Oficina de Levantamento', resumo: 'Apresentação das principais técnicas de levantamento arquitetônico, com exercício prático de medição e registro no Instituto de Tecnologia.' },
    { horario: '13:30?15:00', ministrante: 'Ministrante a confirmar', cargo: 'Informações em breve', titulo: 'Oficina de Cerâmica', resumo: 'As informações completas desta oficina serão publicadas em breve.' },
    { horario: '15:40?17:00', ministrante: 'Alberto Kaplan', cargo: 'Professor e artista visual', titulo: 'Oficina de Aquarela', resumo: 'Experimentação em aquarela com o professor e artista visual Alberto Kaplan.' },
    { horario: '15:40?17:00', ministrante: 'Urb.Anas', cargo: 'Coletivo de pesquisa da UFF', titulo: 'Jogo do Cuidado', resumo: 'Atividade coletiva sobre gênero, cuidado, espaço urbano e direito à cidade.' },
    { horario: '13:30?15:00', ministrante: 'Ministrante a confirmar', cargo: 'Informações em breve', titulo: 'Oficina de Mobiliário', resumo: 'Confecção de bancos para o pátio atrás do Departamento de Arquitetura.' },
    { horario: '13:30?15:00', ministrante: 'Ministrante a confirmar', cargo: 'Informações em breve', titulo: 'Oficina de Pintura de Mural', resumo: 'Atividade prática de pintura de mural no Instituto de Tecnologia. As informações completas serão publicadas em breve.' }
].map(oficina => ({ ...oficina, foto: 'assets/img/oficina-levantamento.png' }));

function renderizarOficinasCronograma() {
    const cards = Array.from(document.querySelectorAll('.schedule-card')).filter(card => card.querySelector('.type-tag.oficina'));
    cards.forEach((card, indice) => {
        const oficina = oficinasCronograma[indice];
        if (!oficina) return;
        const [inicio, fim] = oficina.horario.split('?');
        card.classList.add('schedule-card-oficina');
        card.innerHTML = `
            <div class="palestra-capa oficina-capa">
                <img src="${oficina.foto}" alt="Foto de ${oficina.ministrante}">
                <div class="palestra-capa-topo">
                    <span class="palestra-hora"><strong>${inicio}</strong><i></i><strong>${fim}</strong></span>
                    <span class="type-tag oficina">Oficina</span>
                </div>
            </div>
            <div class="palestra-corpo oficina-corpo">
                <div class="oficina-conteudo">
                    <h3>${oficina.titulo}</h3>
                    <p>${oficina.resumo}</p>
                </div>
                <div class="palestra-mesa oficina-ministrante">
                    <img src="${oficina.foto}" alt="Foto de ${oficina.ministrante}">
                    <div><strong>${oficina.ministrante}</strong><small>${oficina.cargo}</small></div>
                </div>
            </div>`;
    });
}

renderizarOficinasCronograma();

// Cards gerais do cronograma: abertura, atividades especiais e encerramento.
function renderizarEventosCronograma() {
    const cards = Array.from(document.querySelectorAll('.schedule-card')).filter(card => card.querySelector('.type-tag.especial'));

    cards.forEach(card => {
        const horario = card.querySelector('.time-tag')?.textContent.trim() || '';
        const tipo = card.querySelector('.type-tag')?.textContent.trim() || 'Atividade';
        const titulo = card.querySelector('h3')?.textContent.trim() || '';
        const resumo = card.querySelector('p')?.textContent.trim() || '';

        card.classList.add('schedule-card-evento');
        card.innerHTML = `
            <div class="palestra-capa evento-capa">
                <img src="assets/img/oficina-levantamento.png" alt="Imagem de ${titulo}">
                <div class="palestra-capa-topo">
                    <span class="palestra-hora"><strong>${horario}</strong></span>
                    <span class="type-tag especial">${tipo}</span>
                </div>
            </div>
            <div class="palestra-corpo evento-corpo">
                <div class="evento-conteudo">
                    <h3>${titulo}</h3>
                    <p>${resumo}</p>
                </div>
            </div>`;
    });
}

renderizarEventosCronograma();

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