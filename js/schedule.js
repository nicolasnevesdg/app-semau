import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import {
    DIAS_EVENTO,
    TIPOS_ATIVIDADE_AO_VIVO,
    VERSAO_CONTEUDO_CRONOGRAMA,
    PROGRAMACAO_AO_VIVO_PADRAO,
    clonarProgramacao,
    normalizarProgramacao,
    temProgramacaoValida
} from './programacao-ao-vivo-config.js?v=20260906-1';

const gridPalestrantes = document.getElementById('grid-palestrantes');
const gridOficinas = document.getElementById('grid-oficinas');
const containerFase1 = document.getElementById('container-fase1');
const containerFase2 = document.getElementById('container-fase2');
const docConvidadosRef = doc(db, 'configuracoes', 'anuncios');
const docCronogramaRef = doc(db, 'configuracoes', 'cronogramaAoVivo');
const VERSAO_IMAGENS_CRONOGRAMA = '20260902-1';

function versionarImagemLocal(caminho) {
    const valor = String(caminho || '').trim();
    if (!valor || /^(?:https?:)?\/\//i.test(valor) || /^(?:data|blob):/i.test(valor)) return valor;
    return `${valor}${valor.includes('?') ? '&' : '?'}imgv=${VERSAO_IMAGENS_CRONOGRAMA}`;
}

const catalogoConvidados = {
    'palestrante-01': { nome: 'Ethel Pinheiro', descricao: 'Arquiteta, urbanista e professora da UFRJ', imagem: 'assets/palestrantes/ethel-pinheiro.png' },
    'palestrante-02': { nome: 'Ester Carro', descricao: 'Arquiteta, pesquisadora e professora universitária', imagem: 'assets/palestrantes/esther-carro.png' },
    'palestrante-03': { nome: 'Casé Arquitetura', descricao: 'Hamilton Casé e Marcela Casé', imagem: 'assets/palestrantes/case-arquitetura.png' },
    'palestrante-04': { nome: 'Thaysa Malaquias', descricao: 'Arquiteta, urbanista e pesquisadora do LabLugares — PROARQ/UFRJ', imagem: 'assets/palestrantes/thaysa-malaquias.png' },
    'palestrante-05': { nome: 'Rafael Zamorano', descricao: 'Historiador e diretor substituto do Sítio Roberto Burle Marx', imagem: 'assets/palestrantes/rafael-zamorano.png' },
    'palestrante-06': { nome: 'Beatriz Fraga', descricao: 'Palestrante da quarta-feira, às 09h10', imagem: 'assets/palestrantes/beatriz-fraga.png' },
    'palestrante-07': { nome: 'Roberto Cruz Saavedra', descricao: 'Arquiteto e urbanista do Cruz Saavedra Arquitetura', imagem: 'assets/palestrantes/roberto-cruz.png' },
    'palestrante-08': { nome: 'Urb.Anas', descricao: 'Coletivo de pesquisa sobre urbanismo, feminismo, gênero e interseccionalidade', imagem: 'assets/palestrantes/urbanas.png' },
    'palestrante-09': { nome: 'Daniel Disitzer · Mestres da Obra', descricao: 'Palestra de quinta-feira, às 09h10', imagem: 'assets/img/palestrante-teste.png' },
    'palestrante-10': { nome: 'Pedro Rajão · Negromuro', descricao: 'Integrante do coletivo Negromuro', imagem: 'assets/palestrantes/pedro-rajao.png' },
    'palestrante-11': { nome: 'Verônica Natividade', descricao: 'Arquiteta, pesquisadora e professora da PUC-Rio', imagem: 'assets/palestrantes/veronica-natividade.png' },
    'oficina-01': { nome: 'Oficina de Levantamento', descricao: 'Com Raphael Valcarce', arquivoSvg: 'jean-geal' },
    'oficina-02': { nome: 'Oficina de Cerâmica', descricao: 'Com Martha Niklaus', arquivoSvg: 'jean-geal' },
    'oficina-03': { nome: 'Oficina de Aquarela', descricao: 'Com Alberto Kaplan', arquivoSvg: 'jean-geal' },
    'oficina-04': { nome: 'Jogo do Cuidado', descricao: 'Com o coletivo Urb.Anas', arquivoSvg: 'jean-geal' },
    'oficina-05': { nome: 'Oficina de Mobiliário', descricao: 'Ministrante em breve', arquivoSvg: 'jean-geal' },
    'oficina-06': { nome: 'Oficina de Pintura de Mural', descricao: 'Ministrante em breve', arquivoSvg: 'jean-geal' }
};

function renderizarAnuncios(ativos) {
    if (gridPalestrantes) gridPalestrantes.innerHTML = '';
    if (gridOficinas) gridOficinas.innerHTML = '';
    const temPalestrante = ativos.some(id => !id.startsWith('oficina-'));
    const temOficina = ativos.some(id => id.startsWith('oficina-'));
    const emptyState = document.getElementById('empty-state-programacao');
    const sectionPalestrantes = document.getElementById('section-palestrantes');
    const sectionOficinas = document.getElementById('section-oficinas');
    if (emptyState) emptyState.style.display = temPalestrante || temOficina ? 'none' : 'flex';
    if (sectionPalestrantes) sectionPalestrantes.style.display = temPalestrante ? 'block' : 'none';
    if (sectionOficinas) sectionOficinas.style.display = temOficina ? 'block' : 'none';

    ativos.forEach(id => {
        const convidado = catalogoConvidados[id];
        if (!convidado) return;
        const targetGrid = id.startsWith('oficina-') ? gridOficinas : gridPalestrantes;
        targetGrid?.insertAdjacentHTML('beforeend', `
            <div class="card-convidado">
                <div class="card-convidado-foto"><img src="${versionarImagemLocal(convidado.imagem || `assets/svg/${convidado.arquivoSvg}.svg`)}" alt="Foto de ${convidado.nome}"></div>
                <div class="card-convidado-texto"><h2>${convidado.nome}</h2><p>${convidado.descricao}</p></div>
            </div>`);
    });
}

onSnapshot(docConvidadosRef, snapshot => {
    const dados = snapshot.data() || {};
    if (dados.modo === 'fase2') {
        if (containerFase1) containerFase1.style.display = 'none';
        if (containerFase2) containerFase2.style.display = 'block';
    } else {
        if (containerFase1) containerFase1.style.display = 'block';
        if (containerFase2) containerFase2.style.display = 'none';
        renderizarAnuncios(Array.isArray(dados.ativos) ? dados.ativos : []);
    }
});

function escaparHtml(valor) {
    return String(valor || '').replace(/[&<>'"]/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caractere]);
}

function imagemAtividade(item, fallback) {
    return escaparHtml(versionarImagemLocal(item.imagem || fallback));
}

function horarioCard(item) {
    return `<span class="palestra-hora"><strong>${escaparHtml(item.inicio)}</strong><i></i><strong>${escaparHtml(item.fim)}</strong></span>`;
}

function renderizarPalestra(item) {
    const tema = item.tema || item.titulo;
    const biografia = item.convidadoBio ? `<div class="palestra-biografia"><strong>Sobre o convidado</strong><p>${escaparHtml(item.convidadoBio)}</p></div>` : '';
    const explicacao = item.temaDescricao || item.descricao;
    const mediacao = item.mediador ? `<div class="palestra-mesa"><img src="${escaparHtml(versionarImagemLocal(item.mediadorFoto || 'assets/img/professor-teste_1.png'))}" alt="Foto de ${escaparHtml(item.mediador)}"><div><strong>${escaparHtml(item.mediador)}</strong><small>${escaparHtml(item.mediadorCargo || 'Mediação')}</small></div></div>` : '';
    return `<div class="carousel-card schedule-card schedule-card-palestra">
        <div class="palestra-capa"><img src="${imagemAtividade(item, 'assets/img/palestrante-teste.png')}" alt="Foto de ${escaparHtml(item.convidado || item.titulo)}"><div class="palestra-capa-topo">${horarioCard(item)}<span class="type-tag palestra">Palestra</span></div></div>
        <div class="palestra-corpo"><div class="palestra-identidade"><h3>${escaparHtml(item.convidado || item.titulo)}</h3><p>${escaparHtml(item.convidadoCargo)}</p></div><div class="palestra-conteudo"><h4>${escaparHtml(tema)}</h4>${explicacao ? `<p>${escaparHtml(explicacao)}</p>` : ''}${biografia}</div>${mediacao}</div>
    </div>`;
}

function renderizarOficina(item) {
    const biografia = item.oficineiroBio ? `<div class="palestra-biografia"><strong>Sobre quem ministra</strong><p>${escaparHtml(item.oficineiroBio)}</p></div>` : '';
    const fotoOficineiro = escaparHtml(versionarImagemLocal(item.oficineiroFoto || 'assets/img/professor-teste_1.png'));
    const ministrante = item.oficineiro ? `<div class="palestra-mesa oficina-ministrante"><img src="${fotoOficineiro}" alt="Foto de ${escaparHtml(item.oficineiro)}"><div><strong>${escaparHtml(item.oficineiro)}</strong><small>${escaparHtml(item.oficineiroCargo)}</small></div></div>` : '';
    const local = item.local || 'Local a confirmar';
    return `<div class="carousel-card schedule-card schedule-card-oficina">
        <div class="palestra-capa oficina-capa"><img src="${imagemAtividade(item, 'assets/img/oficina-levantamento.png')}" alt="Imagem de ${escaparHtml(item.titulo)}"><div class="palestra-capa-topo">${horarioCard(item)}<span class="type-tag oficina">Oficina</span></div></div>
        <div class="palestra-corpo oficina-corpo"><div class="oficina-conteudo"><h3>${escaparHtml(item.titulo)}</h3><p class="oficina-local"><i class="ph-bold ph-map-pin"></i><span>${escaparHtml(local)}</span></p>${item.descricao ? `<p>${escaparHtml(item.descricao)}</p>` : ''}${biografia}</div>${ministrante}</div>
    </div>`;
}

function renderizarAtividade(item) {
    if (item.tipo === 'palestra') return renderizarPalestra(item);
    if (item.tipo === 'oficina') return renderizarOficina(item);
    const rotulo = TIPOS_ATIVIDADE_AO_VIVO[item.tipo] || 'Atividade';
    return `<div class="carousel-card schedule-card schedule-card-evento">
        <div class="palestra-capa evento-capa"><img src="${imagemAtividade(item, 'assets/img/oficina-levantamento.png')}" alt="Imagem de ${escaparHtml(item.titulo)}"><div class="palestra-capa-topo">${horarioCard(item)}<span class="type-tag especial">${escaparHtml(rotulo)}</span></div></div>
        <div class="palestra-corpo evento-corpo"><div class="evento-conteudo"><h3>${escaparHtml(item.titulo)}</h3>${item.descricao ? `<p>${escaparHtml(item.descricao)}</p>` : ''}</div></div>
    </div>`;
}

function renderizarCronograma(programacao) {
    DIAS_EVENTO.forEach((dia, indice) => {
        const track = document.getElementById(`track-dia-${indice + 1}`);
        if (!track) return;
        track.innerHTML = (programacao[dia.chave] || []).map(renderizarAtividade).join('');
        track.scrollLeft = 0;
    });
}

let programacaoAtual = clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
renderizarCronograma(programacaoAtual);

onSnapshot(docCronogramaRef, snapshot => {
    const dados = snapshot.data();
    const remota = normalizarProgramacao(dados?.programacao);
    programacaoAtual = dados?.versaoConteudo === VERSAO_CONTEUDO_CRONOGRAMA && temProgramacaoValida(remota)
        ? remota
        : clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
    renderizarCronograma(programacaoAtual);
}, error => console.warn('Não foi possível sincronizar o cronograma completo.', error));

const botoesDias = document.querySelectorAll('.btn-dia-tab');
const tracksCronograma = document.querySelectorAll('.cronograma-track');
botoesDias.forEach(botao => {
    botao.addEventListener('click', () => {
        botoesDias.forEach(item => item.classList.remove('active'));
        botao.classList.add('active');
        tracksCronograma.forEach(track => track.style.display = 'none');
        const trackAlvo = document.getElementById(`track-dia-${botao.dataset.dia}`);
        if (trackAlvo) trackAlvo.style.display = 'flex';
    });
});
