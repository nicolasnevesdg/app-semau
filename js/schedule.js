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
    "palestrante-01": { nome: "Marina Albuquerque", descricao: "Arquiteta e urbanista", arquivoSvg: "jean-geal" },
    "palestrante-02": { nome: "Caio Mendonça", descricao: "Arquiteto e pesquisador", arquivoSvg: "jean-geal" },
    "palestrante-03": { nome: "Lívia Nascimento", descricao: "Urbanista e professora", arquivoSvg: "jean-geal" },
    "palestrante-04": { nome: "Rafael Tavares", descricao: "Arquiteto e artista visual", arquivoSvg: "jean-geal" },
    "palestrante-05": { nome: "Beatriz Sampaio", descricao: "Arquiteta e curadora", arquivoSvg: "jean-geal" },
    "palestrante-06": { nome: "André Vilar", descricao: "Paisagista e pesquisador", arquivoSvg: "jean-geal" },
    "palestrante-07": { nome: "Helena Moura", descricao: "Arquiteta e professora", arquivoSvg: "jean-geal" },
    "palestrante-08": { nome: "Lucas Ferraz", descricao: "Arquiteto e restaurador", arquivoSvg: "jean-geal" },
    "palestrante-09": { nome: "Natália Queiroz", descricao: "Arquiteta bioclimática", arquivoSvg: "jean-geal" },
    "palestrante-10": { nome: "Thiago Azevedo", descricao: "Urbanista e pesquisador", arquivoSvg: "jean-geal" },
    "palestrante-11": { nome: "Camila Figueira", descricao: "Arquiteta e ensaísta", arquivoSvg: "jean-geal" },
    "oficina-01": { nome: "Cartografias do cotidiano", descricao: "Com Elisa Prado", arquivoSvg: "jean-geal" },
    "oficina-02": { nome: "Cor, matéria e atmosfera", descricao: "Com Bruno Salgado", arquivoSvg: "jean-geal" },
    "oficina-03": { nome: "Fotografia e memória urbana", descricao: "Com Joana Paes", arquivoSvg: "jean-geal" },
    "oficina-04": { nome: "Maquetes de afeto", descricao: "Com Miguel Soares", arquivoSvg: "jean-geal" },
    "oficina-05": { nome: "Desenho de rua", descricao: "Com Lara Fontes", arquivoSvg: "jean-geal" },
    "oficina-06": { nome: "Intervenções efêmeras", descricao: "Com Daniel Portela", arquivoSvg: "jean-geal" }
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
// DADOS PROVISORIOS DAS PALESTRAS DO CRONOGRAMA OFICIAL
// Troque nomes, cargos, professores, temas, resumos e fotos aqui quando o conteudo final chegar.
const intervalosPalestras = ['10:30?12:00','14:00?15:30','16:30?18:00','09:00?10:30','11:00?12:30','09:00?10:30','11:00?12:30','14:00?15:30','09:00?10:30','10:00?11:30','14:00?15:30'];
const temasPalestras = [
    'Outros modos de habitar a cidade', 'Projeto, território e experiência', 'Memórias que desenham lugares',
    'Cidade, corpo e movimento', 'Arquitetura para encontros', 'Paisagem e pertencimento',
    'Habitar em transformação', 'Construir com o que existe', 'Clima, matéria e cotidiano',
    'Espaços comuns, futuros possíveis', 'O lugar que levamos conosco'
];
const resumosPalestras = [
    'Uma conversa sobre espaço urbano, pertencimento e as relações que construímos com os lugares.',
    'Debate sobre processos de projeto atentos às pessoas, ao cotidiano e às particularidades de cada território.',
    'Reflexões sobre arquitetura, memória e identidade na transformação dos espaços que habitamos.',
    'Um olhar para os percursos cotidianos e para as diferentes formas de perceber e ocupar o espaço urbano.',
    'Como o desenho dos espaços pode aproximar pessoas, acolher diferenças e fortalecer a vida coletiva.',
    'Discussão sobre as relações entre paisagem, cultura e os sentidos atribuídos ao lugar.',
    'Perspectivas para pensar moradia, mudanças sociais e novas dinâmicas de ocupação.',
    'Práticas de intervenção, reuso e leitura sensível das preexistências arquitetônicas.',
    'Estratégias de projeto que aproximam desempenho ambiental, materialidade e experiência cotidiana.',
    'Uma conversa sobre coletividade, espaços compartilhados e possibilidades para as cidades do futuro.',
    'Uma síntese das memórias, encontros e experiências construídas durante a semana.'
];
const palestrantesDemo = [
    { nome: 'Marina Albuquerque', cargo: 'Arquiteta e urbanista', professor: 'Prof.ª Renata Vasconcelos' },
    { nome: 'Caio Mendonça', cargo: 'Arquiteto e pesquisador', professor: 'Prof. Eduardo Linhares' },
    { nome: 'Lívia Nascimento', cargo: 'Urbanista e professora', professor: 'Prof.ª Mônica Peixoto' },
    { nome: 'Rafael Tavares', cargo: 'Arquiteto e artista visual', professor: 'Prof. Marcelo Farias' },
    { nome: 'Beatriz Sampaio', cargo: 'Arquiteta e curadora', professor: 'Prof.ª Denise Amaral' },
    { nome: 'André Vilar', cargo: 'Paisagista e pesquisador', professor: 'Prof. Paulo Nogueira' },
    { nome: 'Helena Moura', cargo: 'Arquiteta e professora', professor: 'Prof.ª Clarice Matos' },
    { nome: 'Lucas Ferraz', cargo: 'Arquiteto e restaurador', professor: 'Prof. Ricardo Paiva' },
    { nome: 'Natália Queiroz', cargo: 'Arquiteta bioclimática', professor: 'Prof.ª Sônia Ribeiro' },
    { nome: 'Thiago Azevedo', cargo: 'Urbanista e pesquisador', professor: 'Prof. Gustavo Meireles' },
    { nome: 'Camila Figueira', cargo: 'Arquiteta e ensaísta', professor: 'Prof.ª Teresa Brandão' }
];

const palestrasCronograma = intervalosPalestras.map((horario, indice) => ({
    horario,
    palestrante: palestrantesDemo[indice].nome,
    cargo: palestrantesDemo[indice].cargo,
    professor: palestrantesDemo[indice].professor,
    professorCargo: 'Docente da UFRRJ',
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
    { horario: '14:00?15:30', ministrante: 'Elisa Prado', cargo: 'Arquiteta e cartógrafa', titulo: 'Cartografias do cotidiano', resumo: 'Uma leitura sensível dos percursos diários transformada em mapas afetivos e narrativas visuais.' },
    { horario: '16:00?17:30', ministrante: 'Bruno Salgado', cargo: 'Arquiteto e artista visual', titulo: 'Cor, matéria e atmosfera', resumo: 'Experimentações com cor, textura e luz para investigar como os materiais alteram a percepção do espaço.' },
    { horario: '16:00?17:30', ministrante: 'Joana Paes', cargo: 'Fotógrafa e pesquisadora', titulo: 'Fotografia e memória urbana', resumo: 'Um exercício de observação e registro das marcas, gestos e memórias presentes na paisagem cotidiana.' },
    { horario: '14:00?15:30', ministrante: 'Miguel Soares', cargo: 'Arquiteto e educador', titulo: 'Maquetes de afeto', resumo: 'Construção de pequenas espacialidades a partir de lembranças, objetos e relações de pertencimento.' },
    { horario: '16:00?18:00', ministrante: 'Lara Fontes e Daniel Portela', cargo: 'Artistas e arquitetos convidados', titulo: 'Desenho de rua e intervenções efêmeras', resumo: 'Duas práticas complementares para observar, desenhar e transformar temporariamente os espaços do campus.' }
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