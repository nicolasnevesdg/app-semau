const parametros = new URLSearchParams(window.location.search);
const paymentId = parametros.get('payment_id') || parametros.get('collection_id');
const referencia = document.getElementById('retorno-referencia');
const referenciaValor = document.getElementById('retorno-payment-id');

if (paymentId && referencia && referenciaValor) {
    referenciaValor.textContent = paymentId;
    referencia.hidden = false;
}