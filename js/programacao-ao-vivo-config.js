export const VERSAO_CONTEUDO_CRONOGRAMA = 2;

export const DIAS_EVENTO = Object.freeze([
    Object.freeze({ chave: '2026-09-21', nome: 'Segunda-feira', dataCurta: '21/09' }),
    Object.freeze({ chave: '2026-09-22', nome: 'Terça-feira', dataCurta: '22/09' }),
    Object.freeze({ chave: '2026-09-23', nome: 'Quarta-feira', dataCurta: '23/09' }),
    Object.freeze({ chave: '2026-09-24', nome: 'Quinta-feira', dataCurta: '24/09' }),
    Object.freeze({ chave: '2026-09-25', nome: 'Sexta-feira', dataCurta: '25/09' })
]);

export const TIPOS_ATIVIDADE_AO_VIVO = Object.freeze({
    atividade: 'Atividade', credenciamento: 'Credenciamento', abertura: 'Abertura',
    recepcao: 'Recepção', palestra: 'Palestra', oficina: 'Oficina', intervalo: 'Intervalo',
    almoco: 'Almoço', sorteio: 'Sorteio', debate: 'Debate', encerramento: 'Encerramento'
});

const PALESTRANTE_PADRAO = 'assets/img/palestrante-teste.png';
const MEDIADOR_PADRAO = 'assets/img/professor-teste_1.png';
const OFICINA_PADRAO = 'assets/img/oficina-levantamento.png';
const atividade = (id, inicio, fim, tipo, titulo, descricao = '', extras = {}) => Object.freeze({
    id, inicio, fim, tipo, titulo, descricao, texto: '', convidado: '', convidadoCargo: '',
    convidadoBio: '', tema: '', temaDescricao: '', mediador: '', mediadorCargo: '',
    oficineiro: '', oficineiroCargo: '', oficineiroBio: '', imagem: '', mediadorFoto: '', ...extras
});

export const PROGRAMACAO_AO_VIVO_PADRAO = Object.freeze({
    '2026-09-21': Object.freeze([
        atividade('21-0800-credenciamento', '08:00', '09:00', 'credenciamento', 'Recepção e credenciamento', 'Chegada e credenciamento dos participantes no Auditório Gustavão.'),
        atividade('21-0900-abertura', '09:00', '10:30', 'abertura', 'Mesa de abertura + CAU/RJ', 'Com Ana Luiza Rodrigues Gambardella, Gilvan Lunz Debona, Anderson C. Ferrari e Sydnei Dias Menezes.'),
        atividade('21-1030-ethel', '10:30', '11:40', 'palestra', 'Palestra com Ethel Pinheiro', '', {
            convidado: 'Ethel Pinheiro', convidadoCargo: 'Arquiteta e urbanista · Professora Associada da FAU/UFRJ',
            convidadoBio: 'Arquiteta e Urbanista pela FAU/UFRJ (2001), com Magna Cum Laude, Mestra em Arquitetura (2004) e Doutora em Arquitetura (2010) pelo PROARQ/FAU/UFRJ. Realizou pós-doutorado na Columbia University, em Nova York (2025). É Professora Associada da FAU/UFRJ, docente permanente do PROARQ/UFRJ, Cientista do Nosso Estado FAPERJ e Bolsista de Produtividade do CNPq — PQC. Coordenou o PROARQ/UFRJ entre 2020 e 2024, atua como editora-chefe do periódico CADERNOS PROARQ desde 2014, integrou a direção da ANPARQ nas gestões 2021–2022 e 2025–2026, coordenou projeto no CAPES PrInt entre 2019 e 2023 e é atual coordenadora administrativa do CAPES-GLOBAL.edu pela UFRJ (2026–2030). Atua na área de representação em arquitetura, com ênfase em planejamento e projeto do espaço urbano, desenho codificado e desenho etnográfico, investigando ambiências urbanas, desenho urbano, memória, cidade, complexidade, cultura e justiça social.',
            tema: 'Tema da palestra em breve', mediador: 'Bruna Mota Rodrigues', mediadorCargo: 'Docente Assistente do IT/UFRRJ', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO
        }),
        atividade('21-1140-almoco', '11:40', '13:30', 'almoco', 'Pausa para o almoço', 'Intervalo entre as atividades da manhã e da tarde.'),
        atividade('21-1330-recepcao', '13:30', '14:00', 'recepcao', 'Recepção da tarde', 'Retorno e acolhimento dos participantes no Auditório Gustavão.'),
        atividade('21-1400-sorteio', '14:00', '14:10', 'sorteio', 'Sorteio', 'Momento de sorteio antes da palestra da tarde.'),
        atividade('21-1410-ester', '14:10', '15:20', 'palestra', 'Palestra com Ester Carro', '', {
            convidado: 'Ester Carro', convidadoCargo: 'Arquiteta, urbanista social, professora e ativista',
            convidadoBio: 'Ester Carro é arquiteta, urbanista social, professora e ativista. Eleita uma das 50 arquitetas mais influentes do Brasil pela Casa Vogue Brasil (2024), integra a lista Forbes Under 30 (2023), na categoria Design, e foi reconhecida pela Rebel Girls como uma das 100 brasileiras extraordinárias. Em 2026, integrou a lista 101 Brasileiros que Constroem o Futuro, do jornal O Globo, na categoria Urbanismo e Território. É vencedora do Prêmio APCA de Arquitetura — Ativismo e do Prêmio ELLE DECO Brasil (2025), na categoria Responsabilidade Social. Desde 2017, preside o Instituto Fazendinhando, organização que promove transformação territorial, cultural e socioambiental em favelas de São Paulo, especialmente no Jardim Colombo, comunidade onde nasceu e cresceu. Integrou o elenco da CASACOR em 2023 e 2024, recebeu o Prêmio Revista Veja (2023) pelo espaço Motirõ e foi homenageada pelo Conselho de Arquitetura e Urbanismo do Brasil por sua atuação de impacto social. É doutoranda em Arquitetura e Urbanismo na Universidade Presbiteriana Mackenzie, Visiting Scholar em Urbanismo na TU Delft e professora de graduação na FAU-Mackenzie. É mestre em Projeto, Produção e Gestão do Espaço Urbano pela FIAM-FAAM, especialista em Urbanismo Social pelo Insper e em Habitação e Cidade pela Escola da Cidade. Atua também como arquiteta no Programa Nova Paraisópolis, desenvolvido pela SP Urbanismo e pela Secretaria Municipal de Urbanismo e Licenciamento.',
            tema: 'Tema da palestra em breve', mediador: 'Samira Chahin', mediadorCargo: 'Docente do DAU/UFRRJ', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO
        }),
        atividade('21-1520-intervalo', '15:20', '15:40', 'intervalo', 'Intervalo', 'Breve pausa entre as atividades da tarde.'),
        atividade('21-1540-sorteio', '15:40', '15:50', 'sorteio', 'Sorteio', 'Segundo momento de sorteio do dia.'),
        atividade('21-1550-case', '15:50', '17:00', 'palestra', 'Palestra com Casé Arquitetura', '', {
            convidado: 'Casé Arquitetura', convidadoCargo: 'Hamilton Casé e Marcela Casé · Arquitetura, urbanismo e paisagem',
            convidadoBio: 'Hamilton Casé e Marcela Casé são arquitetos e sócios da Casé Arquitetura, escritório carioca cuja trajetória atravessa três gerações, iniciada pelo arquiteto Paulo Casé. Hamilton atua desde 1985 nas áreas de arquitetura, urbanismo e planejamento da paisagem, desenvolvendo projetos de diferentes escalas e naturezas. Marcela, formada em Arquitetura e Urbanismo pela PUC-Rio, integra o escritório desde 2020, dando continuidade e novos desdobramentos a essa trajetória familiar. Atualmente, desenvolvem principalmente projetos residenciais e de arquitetura no meio rural, com atuação especialmente presente na região serrana do Rio de Janeiro. O trabalho da Casé Arquitetura investiga a relação entre arquitetura e natureza a partir da implantação, da materialidade, da luz, da paisagem e da experiência sensorial dos espaços, entendendo o projeto não apenas como forma construída, mas como uma experiência vivida e percebida pelo corpo.',
            tema: 'Tema da palestra em breve', mediador: 'Sofia Eder', mediadorCargo: 'Mediação', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO
        })
    ]),
    '2026-09-22': Object.freeze([
        atividade('22-0800-credenciamento', '08:00', '09:00', 'credenciamento', 'Recepção e credenciamento', 'Chegada e credenciamento dos participantes no Auditório Gustavão.'),
        atividade('22-0900-sorteio', '09:00', '09:10', 'sorteio', 'Sorteio', 'Abertura das atividades da terça-feira.'),
        atividade('22-0910-thaysa', '09:10', '10:20', 'palestra', 'Palestra com Thaysa Malaquias', '', { convidado: 'Thaysa Malaquias', convidadoCargo: 'Arquiteta, urbanista e pesquisadora do LabLugares — PROARQ/UFRJ', convidadoBio: 'Arquiteta e Urbanista com Mestrado em Arquitetura pelo Programa de Pós-Graduação em Arquitetura da Universidade Federal do Rio de Janeiro — PROARQ/UFRJ, na área de Pensamento, História e Crítica (2018). Graduada em Arquitetura e Urbanismo pela Universidade Federal do Rio de Janeiro (2013). Integrante do grupo de pesquisa LabLugares — PROARQ/UFRJ e cofundadora e membro da ONG e Coletivo Feminista Não Me Kahlo.', tema: 'Tema da palestra em breve', mediador: 'Silvia Scoralich de Carvalho', mediadorCargo: 'Docente do DAU/UFRRJ', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('22-1020-intervalo', '10:20', '10:40', 'intervalo', 'Intervalo', 'Breve pausa entre as atividades da manhã.'),
        atividade('22-1040-rafael', '10:40', '12:00', 'palestra', 'Palestra com Rafael Zamorano', '', { convidado: 'Rafael Zamorano', convidadoCargo: 'Historiador e diretor substituto do Sítio Roberto Burle Marx', convidadoBio: 'Bacharel em História, Mestre em Ciência Política (2006), Doutor em História Social (2014) pelo PPGHIS da Universidade Federal do Rio de Janeiro e Pós-Doutor em Museologia pelo MAST/Unirio, como bolsista PDJ/CNPq. É Chefe da Divisão Técnica e Diretor Substituto do Sítio Roberto Burle Marx — SRBM/Iphan. Foi responsável pelo Núcleo de Pesquisa do Museu Histórico Nacional entre 2015 e 2021 e editor dos Anais do Museu Histórico Nacional de 2006 a 2021. Atua como professor permanente do Mestrado Profissional em Preservação e Gestão do Patrimônio Cultural das Ciências e da Saúde — COC/Fiocruz — e como professor do Mestrado Profissional em Ensino de História — ProfHistória/Unirio. Entre 2018 e 2020, coordenou o Programa Institucional de Bolsas de Iniciação Científica no Instituto Brasileiro de Museus. Desde 2024, atua como Conselheiro Local do National Folk Museum of Korea. Realiza e orienta pesquisas sobre história, museus e patrimônio, especialmente nos temas de colecionismo, cultura material, patrimônio histórico, escrita da história em museus e difusão de narrativas históricas em suportes digitais.', tema: 'Sítio Roberto Burle Marx', mediador: 'Luiz Augusto dos Reis', mediadorCargo: 'Mediação', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('22-1200-almoco', '12:00', '13:30', 'almoco', 'Pausa para o almoço', 'Intervalo entre as atividades da manhã e as oficinas da tarde.'),
        atividade('22-1330-levantamento', '13:30', '15:00', 'oficina', 'Oficina de Levantamento', 'Apresentação das principais técnicas de levantamento arquitetônico, com exercício prático de medição e registro no Instituto de Tecnologia.', { oficineiro: 'Raphael Valcarce', oficineiroCargo: 'Professor e vice-coordenador do DAU/UFRRJ', imagem: OFICINA_PADRAO }),
        atividade('22-1330-ceramica', '13:30', '15:00', 'oficina', 'Oficina de Cerâmica', 'Atividade prática de cerâmica.', { oficineiro: 'Martha Niklaus', oficineiroCargo: 'Artista, arte-educadora e gestora cultural', oficineiroBio: 'Artista e arte-educadora formada em Licenciatura em Artes pela PUC-Rio, com trajetória iniciada nos anos 1980 entre o Atelier de Escultura do Ingá e a Escola de Artes Visuais do Parque Lage. Criou e dirigiu a Galeria do Lago — arte contemporânea, no Museu da República, entre 2003 e 2013. Participa de projetos e exposições no Brasil e no exterior desde 1982, com obras em importantes coleções públicas.', imagem: OFICINA_PADRAO })
    ]),
    '2026-09-23': Object.freeze([
        atividade('23-0800-credenciamento', '08:00', '09:00', 'credenciamento', 'Recepção e credenciamento', 'Chegada e credenciamento dos participantes no Auditório Gustavão.'),
        atividade('23-0900-sorteio', '09:00', '09:10', 'sorteio', 'Sorteio', 'Abertura das atividades da quarta-feira.'),
        atividade('23-0910-palestra', '09:10', '10:20', 'palestra', 'Palestra — informações em breve', '', { convidado: 'Convidado(a) em breve', convidadoCargo: 'Informações em breve', tema: 'Tema da palestra em breve', mediador: 'Lorena Couto', mediadorCargo: 'Mediação', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('23-1020-intervalo', '10:20', '10:40', 'intervalo', 'Intervalo', 'Breve pausa entre as atividades da manhã.'),
        atividade('23-1040-roberto', '10:40', '12:00', 'palestra', 'Palestra com Roberto Cruz Saavedra', '', { convidado: 'Roberto Cruz Saavedra', convidadoCargo: 'Arquiteto e urbanista · Cruz Saavedra Arquitetura', tema: 'Pedra Lisa', temaDescricao: 'Uma conversa sobre arquitetura social, urbanismo participativo, requalificação urbana e transformação de territórios.', mediador: 'Marlise Sanchotene de Aguiar', mediadorCargo: 'Docente do DAU/IT/UFRRJ', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('23-1200-almoco', '12:00', '13:30', 'almoco', 'Pausa para o almoço', 'Intervalo entre as atividades da manhã e da tarde.'),
        atividade('23-1330-recepcao', '13:30', '14:00', 'recepcao', 'Recepção da tarde', 'Retorno e acolhimento dos participantes.'),
        atividade('23-1400-sorteio', '14:00', '14:10', 'sorteio', 'Sorteio', 'Sorteio antes da programação da tarde.'),
        atividade('23-1410-urbanas', '14:10', '15:20', 'palestra', 'Palestra com o coletivo Urb.Anas', '', { convidado: 'Urb.Anas', convidadoCargo: 'Beatriz Corbacho, Camille Rodrigues, Lívia Perfeito, Maria Eduarda Werneck e Mariana Pio', convidadoBio: 'Coletivo com pesquisas sobre urbanismo, feminismo, gênero e interseccionalidade.', tema: 'Tema da palestra em breve', mediador: 'Denise de Alcântara Pereira', mediadorCargo: 'Mediação', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('23-1520-intervalo', '15:20', '15:40', 'intervalo', 'Intervalo', 'Breve pausa antes das oficinas.'),
        atividade('23-1540-aquarela', '15:40', '17:00', 'oficina', 'Oficina de Aquarela', 'Experimentação em aquarela com o professor e artista visual Alberto Kaplan.', { oficineiro: 'Alberto Kaplan', oficineiroCargo: 'Professor e artista visual', imagem: OFICINA_PADRAO }),
        atividade('23-1540-cuidado', '15:40', '17:00', 'oficina', 'Jogo do Cuidado', 'Atividade coletiva sobre gênero, cuidado, espaço urbano e direito à cidade.', { oficineiro: 'Urb.Anas', oficineiroCargo: 'Coletivo de pesquisa da UFF', imagem: OFICINA_PADRAO })
    ]),
    '2026-09-24': Object.freeze([
        atividade('24-0800-credenciamento', '08:00', '09:00', 'credenciamento', 'Recepção e credenciamento', 'Chegada e credenciamento dos participantes no Auditório Gustavão.'),
        atividade('24-0900-sorteio', '09:00', '09:10', 'sorteio', 'Sorteio', 'Abertura das atividades da quinta-feira.'),
        atividade('24-0910-palestra', '09:10', '10:20', 'palestra', 'Palestra — informações em breve', '', { convidado: 'Convidado(a) em breve', convidadoCargo: 'Informações em breve', tema: 'Tema da palestra em breve', mediador: 'Ana Luiza Gambardella', mediadorCargo: 'Mediação', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('24-1020-intervalo', '10:20', '10:40', 'intervalo', 'Intervalo', 'Breve pausa entre as atividades da manhã.'),
        atividade('24-1040-negromuro', '10:40', '11:30', 'palestra', 'Palestra com Pedro Rajão · Negromuro', '', { convidado: 'Pedro Rajão · Negromuro', convidadoCargo: 'Integrante do coletivo Negromuro', tema: 'Tema da palestra em breve', temaDescricao: 'Encontro com Pedro Rajão, do coletivo Negromuro.', mediador: 'Gabriel Girnos', mediadorCargo: 'Professor do DAU/IT/UFRRJ', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('24-1130-almoco', '11:30', '13:30', 'almoco', 'Pausa para o almoço', 'Intervalo entre as atividades da manhã e as oficinas da tarde.'),
        atividade('24-1330-mobiliario', '13:30', '15:00', 'oficina', 'Oficina de Mobiliário', 'Confecção de bancos para o pátio atrás do Departamento de Arquitetura.', { oficineiro: 'Ministrante a confirmar', oficineiroCargo: 'Informações em breve', imagem: OFICINA_PADRAO }),
        atividade('24-1330-mural', '13:30', '15:00', 'oficina', 'Oficina de Pintura de Mural', 'Atividade prática de pintura de mural no Instituto de Tecnologia.', { oficineiro: 'Ministrante a confirmar', oficineiroCargo: 'Informações em breve', imagem: OFICINA_PADRAO })
    ]),
    '2026-09-25': Object.freeze([
        atividade('25-0800-credenciamento', '08:00', '09:00', 'credenciamento', 'Recepção e credenciamento', 'Chegada e credenciamento dos participantes no Auditório Gustavão.'),
        atividade('25-0900-sorteio', '09:00', '09:10', 'sorteio', 'Sorteio', 'Abertura das atividades da sexta-feira.'),
        atividade('25-0910-veronica', '09:10', '10:20', 'palestra', 'Palestra com Verônica Natividade', '', { convidado: 'Verônica Natividade', convidadoCargo: 'Arquiteta, pesquisadora e professora da PUC-Rio', convidadoBio: 'Inteligência artificial, fabricação digital, design paramétrico e habitação de interesse social.', tema: 'Tema da palestra em breve', mediador: 'Juarez Franco', mediadorCargo: 'Mediação', imagem: PALESTRANTE_PADRAO, mediadorFoto: MEDIADOR_PADRAO }),
        atividade('25-1020-debate', '10:20', '11:00', 'debate', 'Debate e mesa-redonda', 'Conversa coletiva com a comissão e participantes.'),
        atividade('25-1100-encerramento', '11:00', '12:00', 'encerramento', 'Mesa de encerramento', 'Considerações finais e encerramento da XVI SEMAU.')
    ])
});

export function horarioValido(valor) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || '')); }
export function horarioEmMinutos(valor) {
    if (!horarioValido(valor)) return Number.POSITIVE_INFINITY;
    const [hora, minuto] = valor.split(':').map(Number);
    return hora * 60 + minuto;
}
function textoSeguro(valor, limite) { return String(valor || '').trim().replace(/\s+/g, ' ').slice(0, limite); }
export function normalizarAtividade(item) {
    const inicio = String(item?.inicio || '').trim();
    const fim = String(item?.fim || '').trim();
    const titulo = textoSeguro(item?.titulo, 180);
    const tipo = TIPOS_ATIVIDADE_AO_VIVO[item?.tipo] ? item.tipo : 'atividade';
    if (!horarioValido(inicio) || !horarioValido(fim) || horarioEmMinutos(fim) <= horarioEmMinutos(inicio) || !titulo) return null;
    return {
        id: textoSeguro(item?.id, 120) || `${inicio}-${fim}-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
        inicio, fim, tipo, titulo,
        descricao: textoSeguro(item?.descricao, 5000), texto: textoSeguro(item?.texto, 500),
        convidado: textoSeguro(item?.convidado, 180), convidadoCargo: textoSeguro(item?.convidadoCargo, 500), convidadoBio: textoSeguro(item?.convidadoBio, 8000),
        tema: textoSeguro(item?.tema, 500), temaDescricao: textoSeguro(item?.temaDescricao, 5000),
        mediador: textoSeguro(item?.mediador, 180), mediadorCargo: textoSeguro(item?.mediadorCargo, 500),
        oficineiro: textoSeguro(item?.oficineiro, 180), oficineiroCargo: textoSeguro(item?.oficineiroCargo, 500), oficineiroBio: textoSeguro(item?.oficineiroBio, 8000),
        imagem: textoSeguro(item?.imagem, 500), mediadorFoto: textoSeguro(item?.mediadorFoto, 500)
    };
}
export function normalizarProgramacao(valor) {
    const programacao = {};
    DIAS_EVENTO.forEach(({ chave }) => {
        const atividades = Array.isArray(valor?.[chave]) ? valor[chave] : [];
        programacao[chave] = atividades.map(normalizarAtividade).filter(Boolean).sort((a, b) => horarioEmMinutos(a.inicio) - horarioEmMinutos(b.inicio));
    });
    return programacao;
}
export function clonarProgramacao(valor = PROGRAMACAO_AO_VIVO_PADRAO) { return normalizarProgramacao(valor); }
export function temProgramacaoValida(valor) { return DIAS_EVENTO.some(({ chave }) => Array.isArray(valor?.[chave]) && valor[chave].length > 0); }
