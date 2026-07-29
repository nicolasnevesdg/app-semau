import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

const produtos = document.getElementById('loja-conteudo-produtos');
const avisoVendas = document.getElementById('loja-aviso-vendas');
const emBreve = document.getElementById('loja-em-breve');
const carregando = document.getElementById('loja-estado-carregando');

function atualizarLojinha(visivel) {
    if (carregando) carregando.style.display = 'none';
    if (produtos) produtos.style.display = visivel ? 'grid' : 'none';
    if (avisoVendas) avisoVendas.style.display = visivel ? 'flex' : 'none';
    if (emBreve) emBreve.style.display = visivel ? 'none' : 'flex';
}

onSnapshot(
    doc(db, 'configuracoes', 'geral'),
    snapshot => atualizarLojinha(snapshot.data()?.lojinhaVisivel !== false),
    error => {
        console.error('Erro ao carregar o estado da lojinha:', error);
        atualizarLojinha(true);
    }
);
