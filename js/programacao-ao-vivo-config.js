export const DIAS_EVENTO = Object.freeze([
    Object.freeze({ chave: '2026-09-21', nome: 'Segunda-feira', dataCurta: '21/09' }),
    Object.freeze({ chave: '2026-09-22', nome: 'Terça-feira', dataCurta: '22/09' }),
    Object.freeze({ chave: '2026-09-23', nome: 'Quarta-feira', dataCurta: '23/09' }),
    Object.freeze({ chave: '2026-09-24', nome: 'Quinta-feira', dataCurta: '24/09' }),
    Object.freeze({ chave: '2026-09-25', nome: 'Sexta-feira', dataCurta: '25/09' })
]);

export const TIPOS_ATIVIDADE_AO_VIVO = Object.freeze({
    atividade: 'Atividade',
    intervalo: 'Intervalo',
    almoco: 'Almoço'
});

export const PROGRAMACAO_AO_VIVO_PADRAO = Object.freeze({
    '2026-09-21': Object.freeze([
        { inicio: '08:00', fim: '09:00', titulo: 'Recepção e credenciamento', tipo: 'atividade', texto: '' },
        { inicio: '09:00', fim: '10:30', titulo: 'Mesa de abertura + CAU/RJ', tipo: 'atividade', texto: '' },
        { inicio: '10:30', fim: '11:40', titulo: 'Palestra com Ethel Pinheiro', tipo: 'atividade', texto: '' },
        { inicio: '11:40', fim: '13:30', titulo: 'Pausa para o almoço', tipo: 'almoco', texto: '' },
        { inicio: '13:30', fim: '14:00', titulo: 'Recepção da tarde', tipo: 'atividade', texto: '' },
        { inicio: '14:00', fim: '14:10', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '14:10', fim: '15:20', titulo: 'Palestra com Ester Carro', tipo: 'atividade', texto: '' },
        { inicio: '15:20', fim: '15:40', titulo: 'Intervalo', tipo: 'intervalo', texto: '' },
        { inicio: '15:40', fim: '15:50', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '15:50', fim: '17:00', titulo: 'Palestra — informações em breve', tipo: 'atividade', texto: '' }
    ]),
    '2026-09-22': Object.freeze([
        { inicio: '08:00', fim: '09:00', titulo: 'Recepção e credenciamento', tipo: 'atividade', texto: '' },
        { inicio: '09:00', fim: '09:10', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '09:10', fim: '10:20', titulo: 'Palestra com Thaysa Malaquias', tipo: 'atividade', texto: '' },
        { inicio: '10:20', fim: '10:40', titulo: 'Intervalo', tipo: 'intervalo', texto: '' },
        { inicio: '10:40', fim: '12:00', titulo: 'Sítio Roberto Burle Marx — Rafael Zamorano', tipo: 'atividade', texto: '' },
        { inicio: '12:00', fim: '13:30', titulo: 'Pausa para o almoço', tipo: 'almoco', texto: '' },
        { inicio: '13:30', fim: '15:00', titulo: 'Oficinas de Levantamento e Cerâmica', tipo: 'atividade', texto: '' }
    ]),
    '2026-09-23': Object.freeze([
        { inicio: '08:00', fim: '09:00', titulo: 'Recepção e credenciamento', tipo: 'atividade', texto: '' },
        { inicio: '09:00', fim: '09:10', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '09:10', fim: '10:20', titulo: 'Palestra — informações em breve', tipo: 'atividade', texto: '' },
        { inicio: '10:20', fim: '10:40', titulo: 'Intervalo', tipo: 'intervalo', texto: '' },
        { inicio: '10:40', fim: '12:00', titulo: 'Pedra Lisa — Roberto Cruz Saavedra', tipo: 'atividade', texto: '' },
        { inicio: '12:00', fim: '13:30', titulo: 'Pausa para o almoço', tipo: 'almoco', texto: '' },
        { inicio: '13:30', fim: '14:00', titulo: 'Recepção da tarde', tipo: 'atividade', texto: '' },
        { inicio: '14:00', fim: '14:10', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '14:10', fim: '15:20', titulo: 'Palestra com o coletivo Urb.Anas', tipo: 'atividade', texto: '' },
        { inicio: '15:20', fim: '15:40', titulo: 'Intervalo', tipo: 'intervalo', texto: '' },
        { inicio: '15:40', fim: '17:00', titulo: 'Oficina de Aquarela e Jogo do Cuidado', tipo: 'atividade', texto: '' }
    ]),
    '2026-09-24': Object.freeze([
        { inicio: '08:00', fim: '09:00', titulo: 'Recepção e credenciamento', tipo: 'atividade', texto: '' },
        { inicio: '09:00', fim: '09:10', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '09:10', fim: '10:20', titulo: 'Palestra — informações em breve', tipo: 'atividade', texto: '' },
        { inicio: '10:20', fim: '10:40', titulo: 'Intervalo', tipo: 'intervalo', texto: '' },
        { inicio: '10:40', fim: '11:30', titulo: 'Palestra com Pedro Rajão · Negromuro', tipo: 'atividade', texto: '' },
        { inicio: '11:30', fim: '13:30', titulo: 'Pausa para o almoço', tipo: 'almoco', texto: '' },
        { inicio: '13:30', fim: '15:00', titulo: 'Oficinas de Mobiliário e Pintura de Mural', tipo: 'atividade', texto: '' }
    ]),
    '2026-09-25': Object.freeze([
        { inicio: '08:00', fim: '09:00', titulo: 'Recepção e credenciamento', tipo: 'atividade', texto: '' },
        { inicio: '09:00', fim: '09:10', titulo: 'Sorteio', tipo: 'atividade', texto: '' },
        { inicio: '09:10', fim: '10:20', titulo: 'Palestra com Verônica Natividade', tipo: 'atividade', texto: '' },
        { inicio: '10:20', fim: '11:00', titulo: 'Debate e mesa-redonda', tipo: 'atividade', texto: '' },
        { inicio: '11:00', fim: '12:00', titulo: 'Mesa de encerramento da XVI SEMAU', tipo: 'atividade', texto: '' }
    ])
});

export function horarioValido(valor) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || ''))) return false;
    return true;
}

export function horarioEmMinutos(valor) {
    if (!horarioValido(valor)) return Number.POSITIVE_INFINITY;
    const [hora, minuto] = valor.split(':').map(Number);
    return hora * 60 + minuto;
}

export function normalizarAtividade(item) {
    const inicio = String(item?.inicio || '').trim();
    const fim = String(item?.fim || '').trim();
    const titulo = String(item?.titulo || '').trim().replace(/\s+/g, ' ').slice(0, 140);
    const texto = String(item?.texto || '').trim().replace(/\s+/g, ' ').slice(0, 220);
    const tipo = TIPOS_ATIVIDADE_AO_VIVO[item?.tipo] ? item.tipo : 'atividade';
    if (!horarioValido(inicio) || !horarioValido(fim) || horarioEmMinutos(fim) <= horarioEmMinutos(inicio) || !titulo) return null;
    return { inicio, fim, titulo, tipo, texto };
}

export function normalizarProgramacao(valor) {
    const programacao = {};
    DIAS_EVENTO.forEach(({ chave }) => {
        const atividades = Array.isArray(valor?.[chave]) ? valor[chave] : [];
        programacao[chave] = atividades
            .map(normalizarAtividade)
            .filter(Boolean)
            .sort((a, b) => horarioEmMinutos(a.inicio) - horarioEmMinutos(b.inicio));
    });
    return programacao;
}

export function clonarProgramacao(valor = PROGRAMACAO_AO_VIVO_PADRAO) {
    return normalizarProgramacao(valor);
}

export function temProgramacaoValida(valor) {
    return DIAS_EVENTO.some(({ chave }) => Array.isArray(valor?.[chave]) && valor[chave].length > 0);
}
