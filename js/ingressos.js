import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const tiposValidos = ['normal', 'kit', 'kit_camisa'];

document.querySelectorAll('.plano-botao').forEach(botao => {
    botao.addEventListener('click', () => {
        const tipo = tiposValidos.includes(botao.dataset.tipo) ? botao.dataset.tipo : 'normal';
        window.location.href = 'compra.html?tipo=' + tipo;
    });
});

const lotes = document.querySelectorAll('.lote-card');
const introLotes = document.querySelector('.planos-intro');

onSnapshot(doc(db, 'configuracoes', 'geral'), snapshot => {
    const loteAtivo = Math.min(3, Math.max(1, Number(snapshot.data()?.loteAtivo) || 1));
    lotes.forEach(lote => {
        const numero = Number(lote.dataset.lote);
        const ativo = numero === loteAtivo;
        lote.classList.toggle('lote-ativo', ativo);
        lote.classList.toggle('lote-inativo', !ativo);
        const status = lote.querySelector('b');
        if (status) status.textContent = ativo ? 'Ativo' : numero < loteAtivo ? 'Encerrado' : 'Em breve';
    });
    if (introLotes) introLotes.textContent = 'O ' + loteAtivo + 'º lote está disponível. Escolha seu ingresso abaixo.';
}, () => {
    if (introLotes) introLotes.textContent = 'O 1º lote está disponível. Escolha seu ingresso abaixo.';
});
