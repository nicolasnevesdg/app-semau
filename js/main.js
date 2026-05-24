// ==========================================
// LÓGICA DA CONTAGEM REGRESSIVA
// ==========================================

// Coloque a data e hora do início do evento aqui (Ano, Mês - 1, Dia, Hora, Minuto)
// Exemplo: 20 de Outubro de 2026 às 09:00
// Atenção: O mês no JavaScript começa no 0 (Janeiro = 0, Outubro = 9)
const dataDoEvento = new Date(2026, 8, 21, 9, 0, 0).getTime();

// Elementos da tela
const elDias = document.getElementById('cd-dias');
const elHoras = document.getElementById('cd-horas');
const elMin = document.getElementById('cd-min');

function atualizarContagem() {
    const agora = new Date().getTime();
    const distancia = dataDoEvento - agora;

    // Se o evento já começou
    if (distancia < 0) {
        elDias.innerText = "00";
        elHoras.innerText = "00";
        elMin.innerText = "00";
        // Aqui no futuro podemos colocar a lógica para mudar o layout para "Durante o Evento"
        return;
    }

    // Cálculos matemáticos de conversão de tempo
    const dias = Math.floor(distancia / (1000 * 60 * 60 * 24));
    const horas = Math.floor((distancia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((distancia % (1000 * 60 * 60)) / (1000 * 60));

    // Coloca um "0" na frente se for menor que 10 (ex: 09 dias)
    elDias.innerText = dias < 10 ? "0" + dias : dias;
    elHoras.innerText = horas < 10 ? "0" + horas : horas;
    elMin.innerText = minutos < 10 ? "0" + minutos : minutos;
}

// Roda a função uma vez na hora que abre o app
atualizarContagem();

// Atualiza o relógio a cada 1 segundo (1000 milissegundos)
setInterval(atualizarContagem, 1000);