// Arquivo exclusivo de perguntas da XVI SEMAU
const pergunta = (texto, opcoes, respostaCorreta, dificuldade) => ({ texto, opcoes, respostaCorreta, dificuldade });

export const bancoDePerguntas = [
    // --- FÁCEIS ---
    {
        texto: "Qual escola de design e arquitetura, fundada em 1919 por Walter Gropius, revolucionou o século XX?",
        opcoes: ["De Stijl", "Bauhaus", "Art Nouveau", "Escola de Chicago"],
        respostaCorreta: 1,
        dificuldade: "facil"
    },
    {
        texto: "A quem é atribuída a famosa frase 'A forma segue a função', um dos principais lemas da arquitetura moderna?",
        opcoes: ["Louis Sullivan", "Frank Lloyd Wright", "Le Corbusier", "Oscar Niemeyer"],
        respostaCorreta: 0,
        dificuldade: "facil"
    },
    {
        texto: "Qual arquiteta projetou o icônico edifício do SESC Pompeia em São Paulo, reaproveitando uma antiga fábrica de tambores?",
        opcoes: ["Rosa Kliass", "Zaha Hadid", "Lina Bo Bardi", "Carmen Portinho"],
        respostaCorreta: 2,
        dificuldade: "facil"
    },
    {
        texto: "O Pavilhão Central (P1) da UFRRJ é um dos maiores ícones de qual estilo arquitetônico no Brasil?",
        opcoes: ["Modernista", "Brutalista", "Eclético", "Neocolonial"],
        respostaCorreta: 3,
        dificuldade: "facil"
    },
    {
        texto: "Qual grande paisagista brasileiro foi o responsável por desenhar os jardins do Aterro do Flamengo e o Eixo Monumental de Brasília?",
        opcoes: ["Roberto Burle Marx", "Rosa Kliass", "Benedito Abbud", "Haruyoshi Ono"],
        respostaCorreta: 0,
        dificuldade: "facil"
    },
    {
        texto: "O célebre lema 'Menos é mais' (Less is more) consolidou o estilo minimalista de qual mestre da arquitetura?",
        opcoes: ["Alvar Aalto", "Mies van der Rohe", "Tadao Ando", "Paulo Mendes da Rocha"],
        respostaCorreta: 1,
        dificuldade: "facil"
    },

    // --- MÉDIAS ---
    {
        texto: "Gaston Bachelard escreveu uma obra fundamental sobre a relação emocional e psicológica do homem com a casa. Qual o nome do livro?",
        opcoes: ["A Imagem da Cidade", "A Poética do Espaço", "Atmosferas", "Pensar a Arquitetura"],
        respostaCorreta: 1,
        dificuldade: "media"
    },
    {
        texto: "Como se chama o sistema de proporções criado por Le Corbusier, que baseou as medidas da arquitetura nas proporções do corpo humano?",
        opcoes: ["Sessão Áurea", "Homem Vitruviano", "Modulor", "Escala Funcional"],
        respostaCorreta: 2,
        dificuldade: "media"
    },
    {
        texto: "Qual destes materiais foi a grande revolução tecnológica dos romanos, permitindo a construção da cúpula do Panteão?",
        opcoes: ["Aço estrutural", "Tijolo de adobe", "Pedra-sabão", "Concreto (opus caementicium)"],
        respostaCorreta: 3,
        dificuldade: "media"
    },
    {
        texto: "No contexto de 'O espaço que nos habita', a Neuroarquitetura tem como principal objetivo estudar:",
        opcoes: ["O impacto do ambiente construído no cérebro e no comportamento humano", "O cálculo estrutural de redes neurais complexas", "O uso de inteligência artificial na renderização", "A restauração de edifícios psiquiátricos históricos"],
        respostaCorreta: 0,
        dificuldade: "media"
    },
    {
        texto: "A Casa da Cascata (Fallingwater) é a obra-prima de Frank Lloyd Wright e o maior símbolo de qual vertente arquitetônica?",
        opcoes: ["Brutalismo", "Desconstrutivismo", "Arquitetura Orgânica", "Metabolismo Japonês"],
        respostaCorreta: 2,
        dificuldade: "media"
    },
    {
        texto: "Qual elemento arquitetônico, de herança árabe e muito usado no período colonial brasileiro, servia para ventilar o ambiente mantendo a privacidade de quem olhava de dentro?",
        opcoes: ["Claraboia", "Muxarabi", "Platibanda", "Óculo"],
        respostaCorreta: 1,
        dificuldade: "media"
    },

    // --- DIFÍCEIS ---
    {
        texto: "O Palácio Gustavo Capanema (MEC), no Rio de Janeiro, é o marco inaugural do modernismo brasileiro. Qual arquiteto europeu veio ao Brasil como consultor do projeto?",
        opcoes: ["Le Corbusier", "Walter Gropius", "Mies van der Rohe", "Alvar Aalto"],
        respostaCorreta: 0,
        dificuldade: "dificil"
    },
    {
        texto: "Na fenomenologia, qual filósofo alemão é amplamente estudado na arquitetura por associar o ato de 'habitar' à própria essência do ser no mundo?",
        opcoes: ["Friedrich Nietzsche", "Immanuel Kant", "Martin Heidegger", "Jean-Paul Sartre"],
        respostaCorreta: 2,
        dificuldade: "dificil"
    },
    {
        texto: "A 'Carta de Atenas', manifesto urbanístico de 1933 que propunha a separação da cidade em zonas (habitar, trabalhar, recrear, circular), foi fruto de qual congresso?",
        opcoes: ["Congresso de Viena", "CIAM", "UIA", "Semana de 22"],
        respostaCorreta: 1,
        dificuldade: "dificil"
    },
    {
        texto: "Jane Jacobs escreveu um dos livros mais importantes contra o urbanismo rodoviarista moderno. Qual o título da obra?",
        opcoes: ["Morte e Vida de Grandes Cidades", "A Cidade do Amanhã", "Delírio de Nova York", "A Cidade Global"],
        respostaCorreta: 0,
        dificuldade: "dificil"
    },
    {
        texto: "O MASP, desenhado por Lina Bo Bardi, é mundialmente famoso pelo seu vão livre. Qual é a medida aproximada desse vão suportado por apenas 4 pilares?",
        opcoes: ["50 metros", "74 metros", "92 metros", "110 metros"],
        respostaCorreta: 1,
        dificuldade: "dificil"
    },
    {
        texto: "Robert Venturi criticou a monotonia do modernismo no seu livro 'Complexidade e Contradição na Arquitetura' (1966) criando uma frase irônica. Qual foi?",
        opcoes: ["A forma segue a ficção", "O ornamento não é crime", "Menos é um tédio (Less is a bore)", "Mais é mais (More is more)"],
        respostaCorreta: 2,
        dificuldade: "dificil"
    },

    // --- NOVAS FÁCEIS ---
    pergunta("Em que ano Brasília foi oficialmente inaugurada como capital do Brasil?", ["1956", "1964", "1960", "1970"], 2, "facil"),
    pergunta("Quem projetou os principais edifícios públicos do eixo monumental de Brasília?", ["Lúcio Costa", "Oscar Niemeyer", "Affonso Eduardo Reidy", "Vilanova Artigas"], 1, "facil"),
    pergunta("Quem venceu o concurso para o Plano Piloto de Brasília?", ["Lúcio Costa", "Burle Marx", "João Filgueiras Lima", "Rino Levi"], 0, "facil"),
    pergunta("Qual elemento é característico da arquitetura gótica?", ["Arco pleno", "Cobertura plana", "Arco ogival", "Coluna dórica"], 2, "facil"),
    pergunta("Em qual cidade está localizado o Panteão romano?", ["Atenas", "Roma", "Florença", "Istambul"], 1, "facil"),
    pergunta("Em qual país está localizado o Taj Mahal?", ["Paquistão", "Egito", "Turquia", "Índia"], 3, "facil"),
    pergunta("Quem projetou a Ópera de Sydney?", ["Jørn Utzon", "Renzo Piano", "Norman Foster", "Santiago Calatrava"], 0, "facil"),
    pergunta("Quem projetou o Museu Guggenheim de Bilbao?", ["Tadao Ando", "I. M. Pei", "Frank Gehry", "Rem Koolhaas"], 2, "facil"),
    pergunta("Quem projetou o Museu do Amanhã, no Rio de Janeiro?", ["Rafael Moneo", "Santiago Calatrava", "Álvaro Siza", "Richard Meier"], 1, "facil"),
    pergunta("Na arquitetura moderna, qual é a função dos pilotis?", ["Iluminar o subsolo", "Esconder a cobertura", "Ventilar a caixa-d'água", "Elevar o edifício do solo"], 3, "facil"),
    pergunta("Para que serve principalmente um brise-soleil?", ["Controlar a incidência solar", "Reforçar fundações", "Impermeabilizar lajes", "Aumentar o pé-direito"], 0, "facil"),
    pergunta("O que uma planta baixa representa?", ["A fachada principal", "Uma vista aérea sem cortes", "Um corte horizontal do edifício", "A estrutura da cobertura apenas"], 2, "facil"),
    pergunta("Em desenho arquitetônico, o que é um corte?", ["Uma perspectiva artística", "Uma seção vertical da construção", "Uma fotografia da obra", "Um mapa de localização"], 1, "facil"),
    pergunta("Na escala 1:100, 1 centímetro no desenho representa quanto na realidade?", ["10 centímetros", "10 metros", "100 metros", "1 metro"], 3, "facil"),
    pergunta("O concreto armado combina principalmente quais materiais?", ["Concreto e aço", "Madeira e vidro", "Tijolo e alumínio", "Pedra e cobre"], 0, "facil"),
    pergunta("Qual é uma função típica do cobogó?", ["Bloquear totalmente a luz", "Sustentar grandes vãos", "Permitir luz e ventilação com privacidade", "Substituir a fundação"], 2, "facil"),
    pergunta("O que caracteriza uma cobertura verde?", ["Telhas pintadas de verde", "Vegetação instalada sobre a cobertura", "Uso exclusivo de madeira", "Ausência de impermeabilização"], 1, "facil"),
    pergunta("A ventilação cruzada é favorecida por: ", ["Uma única abertura pequena", "Ambientes sem janelas", "Paredes totalmente vedadas", "Aberturas em lados diferentes do ambiente"], 3, "facil"),
    pergunta("Qual é a principal vantagem ambiental de um piso permeável?", ["Permitir a infiltração da água da chuva", "Eliminar a necessidade de drenagem", "Impedir qualquer crescimento vegetal", "Aumentar a reflexão sonora"], 0, "facil"),
    pergunta("O que significa fazer um retrofit em um edifício?", ["Demolir e reconstruir igual", "Trocar somente a pintura", "Atualizar uma construção existente", "Transformar todo edifício em museu"], 2, "facil"),
    pergunta("Bancos, lixeiras e pontos de ônibus são exemplos de: ", ["Infraestrutura viária", "Mobiliário urbano", "Patrimônio imaterial", "Zoneamento urbano"], 1, "facil"),
    pergunta("Qual recurso torna mais acessível a passagem entre níveis diferentes?", ["Platibanda", "Claraboia", "Marquise", "Rampa"], 3, "facil"),
    pergunta("No desenho urbano, uma área cercada por ruas é normalmente chamada de: ", ["Quadra", "Eixo", "Fachada", "Gabarito"], 0, "facil"),
    pergunta("O que significa a sigla BIM?", ["Base Integrada de Materiais", "Building Information Modeling", "Bloco Industrial Modular", "Biblioteca Internacional de Mapas"], 1, "facil"),

    // --- NOVAS MÉDIAS ---
    pergunta("Quais são os três princípios clássicos da arquitetura descritos por Vitrúvio?", ["Firmitas, utilitas e venustas", "Forma, função e técnica", "Luz, espaço e matéria", "Ordem, ritmo e simetria"], 0, "media"),
    pergunta("O Art Nouveau ficou conhecido principalmente pelo uso de: ", ["Concreto aparente", "Formas cúbicas rígidas", "Linhas orgânicas e motivos naturais", "Frontões clássicos sem ornamento"], 2, "media"),
    pergunta("Qual material aparente é frequentemente associado ao Brutalismo?", ["Vidro espelhado", "Concreto", "Adobe", "Mármore polido"], 1, "media"),
    pergunta("Quem projetou o Pavilhão de Barcelona de 1929?", ["Le Corbusier", "Alvar Aalto", "Walter Gropius", "Mies van der Rohe"], 3, "media"),
    pergunta("Em qual cidade francesa está a Villa Savoye?", ["Poissy", "Marselha", "Bordeaux", "Lyon"], 0, "media"),
    pergunta("A primeira Unité d'Habitation de Le Corbusier foi construída em: ", ["Paris", "Nantes", "Marselha", "Nice"], 2, "media"),
    pergunta("Em qual cidade está o Conjunto Arquitetônico da Pampulha?", ["Brasília", "Belo Horizonte", "São Paulo", "Salvador"], 1, "media"),
    pergunta("Quem projetou o Conjunto Residencial Prefeito Mendes de Moraes, conhecido como Pedregulho?", ["Rino Levi", "Sérgio Bernardes", "Lúcio Costa", "Affonso Eduardo Reidy"], 3, "media"),
    pergunta("A sede da FAU-USP na Cidade Universitária foi projetada por: ", ["Vilanova Artigas e Carlos Cascaldi", "Oscar Niemeyer e Lúcio Costa", "Lina Bo Bardi e Marcelo Ferraz", "Rino Levi e Roberto Cerqueira César"], 0, "media"),
    pergunta("Quem projetou o Museu Brasileiro da Escultura e Ecologia (MuBE)?", ["João Filgueiras Lima", "Ruy Ohtake", "Paulo Mendes da Rocha", "Isay Weinfeld"], 2, "media"),
    pergunta("Quem projetou o Museu de Arte Contemporânea de Niterói?", ["Affonso Eduardo Reidy", "Oscar Niemeyer", "Lina Bo Bardi", "Sérgio Bernardes"], 1, "media"),
    pergunta("Em qual cidade está localizado o Edifício Copan?", ["Rio de Janeiro", "Belo Horizonte", "Brasília", "São Paulo"], 3, "media"),
    pergunta("Quem formulou o conceito de Cidade-Jardim no fim do século XIX?", ["Ebenezer Howard", "Camillo Sitte", "Le Corbusier", "Patrick Geddes"], 0, "media"),
    pergunta("Na leitura urbana de Kevin Lynch, como se chama um ponto estratégico de encontro ou concentração?", ["Limite", "Distrito", "Nó", "Percurso"], 2, "media"),
    pergunta("A expressão 'olhos da rua', de Jane Jacobs, está relacionada a: ", ["Câmeras de vigilância", "Vigilância natural feita pelas pessoas", "Iluminação cenográfica", "Controle de tráfego"], 1, "media"),
    pergunta("Qual autor desenvolveu o conceito moderno de 'direito à cidade'?", ["David Harvey", "Manuel Castells", "Kevin Lynch", "Henri Lefebvre"], 3, "media"),
    pergunta("O urbanismo tático utiliza principalmente: ", ["Intervenções rápidas, temporárias e de baixo custo", "Grandes demolições permanentes", "Somente planos diretores", "Obras subterrâneas de alta complexidade"], 0, "media"),
    pergunta("Em conforto térmico, inércia térmica é a capacidade de um material de: ", ["Refletir todo o som", "Bloquear a ventilação", "Armazenar e liberar calor lentamente", "Produzir energia elétrica"], 2, "media"),
    pergunta("A cobertura do tipo shed é tradicionalmente usada para: ", ["Criar jardins suspensos", "Favorecer iluminação em edifícios industriais", "Eliminar a estrutura do telhado", "Formar cúpulas geodésicas"], 1, "media"),
    pergunta("A taipa de pilão é uma técnica construtiva baseada em: ", ["Blocos de vidro", "Peças metálicas dobradas", "Concreto projetado", "Terra compactada em fôrmas"], 3, "media"),
    pergunta("Na construção em madeira, o que significa CLT?", ["Madeira laminada cruzada", "Cobertura leve tensionada", "Concreto laminado térmico", "Componente linear treliçado"], 0, "media"),
    pergunta("Uma prateleira de luz (light shelf) ajuda a: ", ["Coletar água da chuva", "Bloquear toda a visão externa", "Redirecionar luz natural para o teto", "Aumentar a carga da fachada"], 2, "media"),
    pergunta("Um jardim de chuva é projetado para: ", ["Cultivar apenas plantas aquáticas", "Reter e infiltrar águas pluviais", "Substituir reservatórios de água potável", "Impedir a entrada de luz no solo"], 1, "media"),
    pergunta("O efeito de ilha de calor urbana corresponde a: ", ["Ventos mais fortes no campo", "Resfriamento causado por edifícios altos", "Aumento da umidade em túneis", "Temperaturas urbanas maiores que nas áreas vizinhas"], 3, "media"),

    // --- NOVAS DIFÍCEIS ---
    pergunta("O sistema estrutural Dom-ino, de 1914, foi proposto por: ", ["Le Corbusier", "Auguste Perret", "Tony Garnier", "Peter Behrens"], 0, "dificil"),
    pergunta("Quem projetou a Casa Schröder, em Utrecht?", ["Theo van Doesburg", "Hendrik Berlage", "Gerrit Rietveld", "J. J. P. Oud"], 2, "dificil"),
    pergunta("Quem é o principal autor da Maison de Verre, em Paris?", ["Eileen Gray", "Pierre Chareau", "Robert Mallet-Stevens", "Jean Prouvé"], 1, "dificil"),
    pergunta("O Seagram Building, em Nova York, foi projetado por Mies van der Rohe em colaboração com: ", ["Eero Saarinen", "Gordon Bunshaft", "Marcel Breuer", "Philip Johnson"], 3, "dificil"),
    pergunta("Quem projetou o Kimbell Art Museum, no Texas?", ["Louis Kahn", "I. M. Pei", "Paul Rudolph", "Richard Meier"], 0, "dificil"),
    pergunta("Quem projetou o Salk Institute, em La Jolla?", ["Eero Saarinen", "Marcel Breuer", "Louis Kahn", "Philip Johnson"], 2, "dificil"),
    pergunta("O Centre Pompidou, em Paris, foi projetado por Renzo Piano e: ", ["Norman Foster", "Richard Rogers", "Nicholas Grimshaw", "Michael Hopkins"], 1, "dificil"),
    pergunta("Quem projetou a Mediateca de Sendai?", ["Kazuyo Sejima", "Kengo Kuma", "Fumihiko Maki", "Toyo Ito"], 3, "dificil"),
    pergunta("O Terminal Marítimo Internacional de Yokohama foi projetado por qual escritório?", ["Foreign Office Architects (FOA)", "SANAA", "OMA", "MVRDV"], 0, "dificil"),
    pergunta("Quem projetou as Termas de Vals, na Suíça?", ["Álvaro Siza", "Herzog & de Meuron", "Peter Zumthor", "Eduardo Souto de Moura"], 2, "dificil"),
    pergunta("A Igreja da Luz, em Ibaraki, é obra de: ", ["Shigeru Ban", "Tadao Ando", "Arata Isozaki", "Kenzo Tange"], 1, "dificil"),
    pergunta("Quem projetou a Nakagin Capsule Tower?", ["Fumihiko Maki", "Kenzo Tange", "Arata Isozaki", "Kisho Kurokawa"], 3, "dificil"),
    pergunta("Habitat 67, em Montreal, foi projetado por: ", ["Moshe Safdie", "Paul Rudolph", "Buckminster Fuller", "John Andrews"], 0, "dificil"),
    pergunta("Quem projetou a Casa Gilardi, na Cidade do México?", ["Luis Barragán", "Teodoro González de León", "Ricardo Legorreta", "Juan O'Gorman"], 0, "dificil"),
    pergunta("O conjunto residencial do Parque Guinle, no Rio de Janeiro, foi projetado por: ", ["Jorge Machado Moreira", "Affonso Eduardo Reidy", "Lúcio Costa", "Oscar Niemeyer"], 2, "dificil"),
    pergunta("Qual é o nome completo do arquiteto brasileiro conhecido como Lelé?", ["Luiz Nunes", "João Filgueiras Lima", "Joaquim Guedes", "Severiano Porto"], 1, "dificil"),
    pergunta("O SESC 24 de Maio foi desenvolvido por Paulo Mendes da Rocha em parceria com: ", ["Brasil Arquitetura", "Una Arquitetos", "SPBR Arquitetos", "MMBB Arquitetos"], 3, "dificil"),
    pergunta("A teoria conhecida como Sintaxe Espacial foi desenvolvida inicialmente por: ", ["Bill Hillier e Julienne Hanson", "Kevin Lynch e Jane Jacobs", "Robert Venturi e Denise Scott Brown", "Aldo Rossi e Carlo Aymonino"], 0, "dificil"),
    pergunta("Qual autor está associado ao livro 'Uma Linguagem de Padrões' (A Pattern Language)?", ["Reyner Banham", "Kenneth Frampton", "Christopher Alexander", "Christian Norberg-Schulz"], 2, "dificil"),
    pergunta("Quem escreveu 'A Arquitetura da Cidade', publicado originalmente em 1966?", ["Manfredo Tafuri", "Aldo Rossi", "Leon Krier", "Colin Rowe"], 1, "dificil"),
    pergunta("O grupo Team 10 ganhou relevância ao criticar os princípios de qual organização?", ["Bauhaus", "Deutscher Werkbund", "UIA", "CIAM"], 3, "dificil"),
    pergunta("A Carta de Veneza, referência internacional para conservação e restauro, foi aprovada em: ", ["1964", "1931", "1972", "1994"], 0, "dificil"),
    pergunta("O Documento de Nara de 1994 ampliou o debate patrimonial sobre: ", ["Mobilidade urbana", "Zoneamento industrial", "Autenticidade", "Habitação mínima"], 2, "dificil"),
    pergunta("No conceito de 'regionalismo crítico', qual autor teve papel central na difusão do termo na teoria da arquitetura?", ["Charles Jencks", "Kenneth Frampton", "Nikolaus Pevsner", "Sigfried Giedion"], 1, "dificil")
];
