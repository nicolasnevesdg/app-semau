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
    'Arquiteta e Urbanista pela FAU/UFRJ (2001), com Magna Cum Laude, Mestra em Arquitetura (2004) e Doutora em Arquitetura (2010) pelo PROARQ/FAU/UFRJ. Realizou pós-doutorado na Columbia University, em Nova York (2025). É Professora Associada da FAU/UFRJ, docente permanente do PROARQ/UFRJ, Cientista do Nosso Estado FAPERJ e Bolsista de Produtividade do CNPq — PQC. Coordenou o PROARQ/UFRJ entre 2020 e 2024, atua como editora-chefe do periódico CADERNOS PROARQ desde 2014, integrou a direção da ANPARQ nas gestões 2021–2022 e 2025–2026, coordenou projeto no CAPES PrInt entre 2019 e 2023 e é atual coordenadora administrativa do CAPES-GLOBAL.edu pela UFRJ (2026–2030). Atua na área de representação em arquitetura, com ênfase em planejamento e projeto do espaço urbano, desenho codificado e desenho etnográfico, investigando ambiências urbanas, desenho urbano, memória, cidade, complexidade, cultura e justiça social.',
    'Ester Carro é arquiteta, urbanista social, professora e ativista. Eleita uma das 50 arquitetas mais influentes do Brasil pela Casa Vogue Brasil (2024), integra a lista Forbes Under 30 (2023), na categoria Design, e foi reconhecida pela Rebel Girls como uma das 100 brasileiras extraordinárias. Em 2026, integrou a lista 101 Brasileiros que Constroem o Futuro, do jornal O Globo, na categoria Urbanismo e Território. É vencedora do Prêmio APCA de Arquitetura — Ativismo e do Prêmio ELLE DECO Brasil (2025), na categoria Responsabilidade Social. Desde 2017, preside o Instituto Fazendinhando, organização que promove transformação territorial, cultural e socioambiental em favelas de São Paulo, especialmente no Jardim Colombo, comunidade onde nasceu e cresceu. Integrou o elenco da CASACOR em 2023 e 2024, recebeu o Prêmio Revista Veja (2023) pelo espaço Motirõ e foi homenageada pelo Conselho de Arquitetura e Urbanismo do Brasil por sua atuação de impacto social. É doutoranda em Arquitetura e Urbanismo na Universidade Presbiteriana Mackenzie, Visiting Scholar em Urbanismo na TU Delft e professora de graduação na FAU-Mackenzie. É mestre em Projeto, Produção e Gestão do Espaço Urbano pela FIAM-FAAM, especialista em Urbanismo Social pelo Insper e em Habitação e Cidade pela Escola da Cidade. Atua também como arquiteta no Programa Nova Paraisópolis, desenvolvido pela SP Urbanismo e pela Secretaria Municipal de Urbanismo e Licenciamento.',
    'Hamilton Casé e Marcela Casé são arquitetos e sócios da Casé Arquitetura, escritório carioca cuja trajetória atravessa três gerações, iniciada pelo arquiteto Paulo Casé. Hamilton atua desde 1985 nas áreas de arquitetura, urbanismo e planejamento da paisagem, desenvolvendo projetos de diferentes escalas e naturezas. Marcela, formada em Arquitetura e Urbanismo pela PUC-Rio, integra o escritório desde 2020, dando continuidade e novos desdobramentos a essa trajetória familiar. Atualmente, desenvolvem principalmente projetos residenciais e de arquitetura no meio rural, com atuação especialmente presente na região serrana do Rio de Janeiro. O trabalho da Casé Arquitetura investiga a relação entre arquitetura e natureza a partir da implantação, da materialidade, da luz, da paisagem e da experiência sensorial dos espaços, entendendo o projeto não apenas como forma construída, mas como uma experiência vivida e percebida pelo corpo.',
    'Arquiteta e Urbanista com Mestrado em Arquitetura pelo Programa de Pós-Graduação em Arquitetura da Universidade Federal do Rio de Janeiro — PROARQ/UFRJ, na área de Pensamento, História e Crítica (2018). Graduada em Arquitetura e Urbanismo pela Universidade Federal do Rio de Janeiro (2013). Integrante do grupo de pesquisa LabLugares — PROARQ/UFRJ e cofundadora e membro da ONG e Coletivo Feminista Não Me Kahlo.',
    'Bacharel em História, Mestre em Ciência Política (2006), Doutor em História Social (2014) pelo PPGHIS da Universidade Federal do Rio de Janeiro e Pós-Doutor em Museologia pelo MAST/Unirio, como bolsista PDJ/CNPq. É Chefe da Divisão Técnica e Diretor Substituto do Sítio Roberto Burle Marx — SRBM/Iphan. Foi responsável pelo Núcleo de Pesquisa do Museu Histórico Nacional entre 2015 e 2021 e editor dos Anais do Museu Histórico Nacional de 2006 a 2021. Atua como professor permanente do Mestrado Profissional em Preservação e Gestão do Patrimônio Cultural das Ciências e da Saúde — COC/Fiocruz — e como professor do Mestrado Profissional em Ensino de História — ProfHistória/Unirio. Entre 2018 e 2020, coordenou o Programa Institucional de Bolsas de Iniciação Científica no Instituto Brasileiro de Museus. Desde 2024, atua como Conselheiro Local do National Folk Museum of Korea. Realiza e orienta pesquisas sobre história, museus e patrimônio, especialmente nos temas de colecionismo, cultura material, patrimônio histórico, escrita da história em museus e difusão de narrativas históricas em suportes digitais.',
    'Palestrante e tema aguardando confirmação.',
    'Uma conversa sobre arquitetura social, urbanismo participativo, requalificação urbana e transformação de territórios.',
    'Coletivo formado por Beatriz Corbacho, Camille Rodrigues, Lívia Perfeito, Maria Eduarda Werneck e Mariana Pio, com pesquisas sobre urbanismo, feminismo, gênero e interseccionalidade.',
    'Palestrante e tema aguardando confirmação.',
    'Encontro com Pedro Rajão, do coletivo Negromuro. As informações completas da palestra serão publicadas em breve.',
    'Inteligência artificial, fabricação digital, design paramétrico e habitação de interesse social.'
];
const palestrantesDemo = [
    { nome: 'Ethel Pinheiro', cargo: 'Arquiteta e urbanista · Professora Associada da FAU/UFRJ', professor: 'Bruna Mota Rodrigues', professorCargo: 'Docente Assistente do IT/UFRRJ' },
    { nome: 'Ester Carro', cargo: 'Arquiteta, urbanista social, professora e ativista', professor: 'Samira Chahin', professorCargo: 'Docente do DAU/UFRRJ' },
    { nome: 'Casé Arquitetura', cargo: 'Hamilton Casé e Marcela Casé · Arquitetura, urbanismo e paisagem', professor: 'Sofia Eder', professorCargo: 'Mediação' },
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
    { horario: '13:30?15:00', ministrante: 'Martha Niklaus', cargo: 'Artista, arte-educadora e gestora cultural', titulo: 'Oficina de Cerâmica', resumo: 'Artista e arte-educadora formada em Licenciatura em Artes pela PUC-Rio, com trajetória iniciada nos anos 1980 entre o Atelier de Escultura do Ingá e a Escola de Artes Visuais do Parque Lage. Criou e dirigiu a Galeria do Lago — arte contemporânea, no Museu da República, entre 2003 e 2013. Participa de projetos e exposições no Brasil e no exterior desde 1982, com obras em importantes coleções públicas.' },
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
