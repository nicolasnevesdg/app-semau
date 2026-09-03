import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const container = document.getElementById('instagram-feed-app');
const PERFIL_URL = 'https://www.instagram.com/semauufrrj/';
const QUANTIDADE_INICIAL = 6;

function textoSeguro(valor, alternativa = '') {
    const texto = typeof valor === 'string' ? valor.trim() : '';
    return texto || alternativa;
}

function numeroSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function formatarNumero(valor) {
    const numero = numeroSeguro(valor);
    if (numero === null) return '—';
    return new Intl.NumberFormat('pt-BR', {
        notation: numero >= 1000 ? 'compact' : 'standard',
        maximumFractionDigits: numero >= 1000 ? 1 : 0
    }).format(numero);
}

function urlSegura(valor, alternativa = '') {
    try {
        const url = new URL(valor);
        return url.protocol === 'https:' ? url.href : alternativa;
    } catch {
        return alternativa;
    }
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function criarLink(classe, href, rotulo) {
    const link = criarElemento('a', classe, rotulo);
    link.href = urlSegura(href, PERFIL_URL);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
}

function criarPerfil(perfil) {
    const cabecalho = criarElemento('div', 'instagram-feed-perfil');
    const identidade = criarElemento('div', 'instagram-feed-identidade');
    const avatarMoldura = criarElemento('span', 'instagram-feed-avatar-moldura');
    const avatar = document.createElement('img');
    avatar.className = 'instagram-feed-avatar';
    avatar.src = urlSegura(perfil.foto, 'assets/svg/logo-cn-05.svg');
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatarMoldura.appendChild(avatar);

    const nomes = criarElemento('span', 'instagram-feed-nomes');
    nomes.appendChild(criarElemento('strong', '', textoSeguro(perfil.nome, 'XVI SEMAU UFRRJ')));
    nomes.appendChild(criarElemento('small', '', `@${textoSeguro(perfil.usuario, 'semauufrrj')}`));
    identidade.append(avatarMoldura, nomes);

    const estatisticas = criarElemento('div', 'instagram-feed-estatisticas');
    [
        [perfil.publicacoes, 'publicações'],
        [perfil.seguidores, 'seguidores'],
        [perfil.seguindo, 'seguindo']
    ].forEach(([valor, legenda]) => {
        const item = criarElemento('span', 'instagram-feed-estatistica');
        item.append(
            criarElemento('strong', '', formatarNumero(valor)),
            criarElemento('small', '', legenda)
        );
        estatisticas.appendChild(item);
    });

    const seguir = criarLink('instagram-feed-seguir', perfil.url || PERFIL_URL);
    seguir.setAttribute('aria-label', 'Seguir a XVI SEMAU no Instagram');
    seguir.innerHTML = '<i class="ph-bold ph-instagram-logo" aria-hidden="true"></i><span>Seguir</span>';
    cabecalho.append(identidade, estatisticas, seguir);
    return cabecalho;
}

function criarPublicacao(publicacao) {
    const link = criarLink('instagram-feed-publicacao', publicacao.link || PERFIL_URL);
    const imagem = document.createElement('img');
    imagem.src = urlSegura(publicacao.imagem);
    imagem.alt = textoSeguro(publicacao.legenda, 'Publicação da XVI SEMAU').slice(0, 150);
    imagem.loading = 'lazy';
    imagem.decoding = 'async';
    link.appendChild(imagem);

    if (publicacao.tipo === 'VIDEO') {
        const icone = criarElemento('i', 'ph-fill ph-play-circle instagram-feed-tipo');
        icone.setAttribute('aria-hidden', 'true');
        link.appendChild(icone);
    } else if (publicacao.tipo === 'CAROUSEL_ALBUM') {
        const icone = criarElemento('i', 'ph-fill ph-squares-four instagram-feed-tipo');
        icone.setAttribute('aria-hidden', 'true');
        link.appendChild(icone);
    }
    return link;
}

function renderizarFeed(dados) {
    const publicacoes = Array.isArray(dados.publicacoes)
        ? dados.publicacoes.filter(item => urlSegura(item?.imagem) && urlSegura(item?.link))
        : [];
    if (!publicacoes.length) return;

    const feed = criarElemento('div', 'instagram-feed-oficial');
    const grade = criarElemento('div', 'instagram-feed-grade');
    let quantidadeVisivel = Math.min(QUANTIDADE_INICIAL, publicacoes.length);

    const atualizarGrade = () => {
        grade.replaceChildren(...publicacoes.slice(0, quantidadeVisivel).map(criarPublicacao));
    };

    feed.appendChild(criarPerfil(dados.perfil || {}));
    atualizarGrade();
    feed.appendChild(grade);

    if (publicacoes.length > QUANTIDADE_INICIAL) {
        const carregarMais = criarElemento('button', 'instagram-feed-carregar', 'Carregar mais');
        carregarMais.type = 'button';
        carregarMais.addEventListener('click', () => {
            quantidadeVisivel = Math.min(quantidadeVisivel + 6, publicacoes.length);
            atualizarGrade();
            if (quantidadeVisivel >= publicacoes.length) carregarMais.remove();
        });
        feed.appendChild(carregarMais);
    }

    container.replaceChildren(feed);
    container.classList.add('insta-feed-container-oficial');
    container.closest('.instagram-section')?.classList.add('instagram-section-feed-oficial');
}

if (container) {
    onSnapshot(
        doc(db, 'configuracoes', 'instagramFeed'),
        snapshot => {
            if (snapshot.exists()) renderizarFeed(snapshot.data());
        },
        error => console.warn('Não foi possível carregar o feed próprio do Instagram.', error)
    );
}
