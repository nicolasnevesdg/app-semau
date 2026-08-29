import { db } from './firebase-config.js';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    DIAS_EVENTO,
    TIPOS_ATIVIDADE_AO_VIVO,
    VERSAO_CONTEUDO_CRONOGRAMA,
    PROGRAMACAO_AO_VIVO_PADRAO,
    clonarProgramacao,
    horarioEmMinutos,
    normalizarAtividade,
    normalizarProgramacao,
    temProgramacaoValida
} from './programacao-ao-vivo-config.js?v=155';

const docCronogramaRef = doc(db, 'configuracoes', 'cronogramaAoVivo');
const EMAIL_CONTA_ADMINISTRATIVA = 'admin@semauufrrj.com';
const overlayLogin = document.getElementById('admin-login-overlay');
const formLogin = document.getElementById('form-admin-login');
const inputSenha = document.getElementById('admin-senha-input');
const btnLogin = document.getElementById('btn-admin-login');
const btnLogout = document.getElementById('btn-admin-logout');
const tabsDias = document.getElementById('cronograma-dias');
const listaAtividades = document.getElementById('cronograma-lista');
const tituloDia = document.getElementById('dia-editor-titulo');
const dataDia = document.getElementById('dia-editor-data');
const resumoDia = document.getElementById('dia-editor-resumo');
const btnAdicionar = document.getElementById('btn-adicionar-atividade');
const btnRestaurar = document.getElementById('btn-restaurar-dia');
const btnSalvar = document.getElementById('btn-salvar-cronograma');
const editorStatus = document.getElementById('editor-status');
const alteracoesStatus = document.getElementById('alteracoes-status');

let programacaoEditavel = clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
let diaAtivo = DIAS_EVENTO[0].chave;
let alteracoesPendentes = false;
let editorInicializado = false;

function mostrarStatus(mensagem, tipo = 'info', esconderDepois = false) {
    editorStatus.textContent = mensagem;
    editorStatus.className = `editor-status visivel ${tipo}`;
    if (esconderDepois) {
        window.setTimeout(() => editorStatus.classList.remove('visivel'), 4500);
    }
}

function marcarAlterado() {
    alteracoesPendentes = true;
    alteracoesStatus.textContent = 'Alterações ainda não publicadas';
}

function marcarSalvo() {
    alteracoesPendentes = false;
    alteracoesStatus.textContent = 'Tudo salvo no site';
}

function rotuloDia(chave) {
    return DIAS_EVENTO.find(dia => dia.chave === chave) || DIAS_EVENTO[0];
}

function formatarAtualizacao(timestamp) {
    if (!timestamp?.toDate) return 'Programação original carregada';
    const data = timestamp.toDate();
    return `Última publicação: ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function renderizarTabs() {
    tabsDias.innerHTML = '';
    DIAS_EVENTO.forEach(dia => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = `dia-tab${dia.chave === diaAtivo ? ' ativo' : ''}`;
        botao.setAttribute('aria-pressed', String(dia.chave === diaAtivo));
        botao.innerHTML = `<strong>${dia.nome}</strong><span>${dia.dataCurta} · ${programacaoEditavel[dia.chave].length} itens</span>`;
        botao.addEventListener('click', () => {
            diaAtivo = dia.chave;
            renderizarTabs();
            renderizarDia();
        });
        tabsDias.appendChild(botao);
    });
}

function proximoHorarioDoDia() {
    const atividades = programacaoEditavel[diaAtivo];
    if (!atividades.length) return { inicio: '08:00', fim: '09:00' };
    const ultimoFim = atividades.reduce((maior, item) => horarioEmMinutos(item.fim) > horarioEmMinutos(maior) ? item.fim : maior, '00:00');
    const inicioMinutos = Math.min(horarioEmMinutos(ultimoFim), 22 * 60 + 30);
    const fimMinutos = Math.min(inicioMinutos + 60, 23 * 60 + 59);
    const formatar = minutos => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
    return { inicio: formatar(inicioMinutos), fim: formatar(fimMinutos) };
}

function criarCampo(classe, rotulo, controle) {
    const campo = document.createElement('div');
    campo.className = `campo ${classe}`;
    const label = document.createElement('label');
    label.textContent = rotulo;
    campo.append(label, controle);
    return campo;
}

function criarCampoDetalhe(item, propriedade, rotulo, { textarea = false, placeholder = '', limite = 500 } = {}) {
    const controle = document.createElement(textarea ? 'textarea' : 'input');
    if (!textarea) controle.type = 'text';
    controle.value = item[propriedade] || '';
    controle.maxLength = limite;
    controle.placeholder = placeholder;
    controle.addEventListener('input', () => {
        item[propriedade] = controle.value;
        marcarAlterado();
    });
    return criarCampo(textarea ? 'campo-detalhe campo-detalhe-largo' : 'campo-detalhe', rotulo, controle);
}

function criarCamposEspecificos(item) {
    const bloco = document.createElement('section');
    bloco.className = 'campos-especificos';

    if (item.tipo === 'palestra') {
        bloco.innerHTML = '<h3><i class="ph-bold ph-microphone-stage"></i> Informações da palestra</h3>';
        const grade = document.createElement('div');
        grade.className = 'detalhes-grade';
        grade.append(
            criarCampoDetalhe(item, 'convidado', 'Convidado', { placeholder: 'Nome do palestrante ou escritório', limite: 180 }),
            criarCampoDetalhe(item, 'convidadoCargo', 'Formação / cargo', { placeholder: 'Identificação curta exibida sob o nome' }),
            criarCampoDetalhe(item, 'convidadoBio', 'Informações sobre o convidado', { textarea: true, placeholder: 'Biografia e trajetória do convidado', limite: 8000 }),
            criarCampoDetalhe(item, 'tema', 'Tema da palestra', { placeholder: 'Título ou tema principal' }),
            criarCampoDetalhe(item, 'temaDescricao', 'Explicação da palestra', { textarea: true, placeholder: 'Resumo, ementa ou explicação do encontro', limite: 5000 }),
            criarCampoDetalhe(item, 'mediador', 'Mediador(a)', { placeholder: 'Nome de quem fará a mediação', limite: 180 }),
            criarCampoDetalhe(item, 'mediadorCargo', 'Cargo do(a) mediador(a)', { placeholder: 'Ex.: Docente do DAU/UFRRJ' })
        );
        bloco.appendChild(grade);
    } else if (item.tipo === 'oficina') {
        bloco.innerHTML = '<h3><i class="ph-bold ph-hammer"></i> Informações da oficina</h3>';
        const grade = document.createElement('div');
        grade.className = 'detalhes-grade';
        grade.append(
            criarCampoDetalhe(item, 'oficineiro', 'Oficineiro(a)', { placeholder: 'Nome de quem ministra a oficina', limite: 180 }),
            criarCampoDetalhe(item, 'oficineiroCargo', 'Formação / cargo', { placeholder: 'Identificação curta do oficineiro' }),
            criarCampoDetalhe(item, 'oficineiroBio', 'Informações sobre o(a) oficineiro(a)', { textarea: true, placeholder: 'Biografia e trajetória', limite: 8000 })
        );
        bloco.appendChild(grade);
    }

    return bloco;
}

function criarCardAtividade(item, indice) {
    const card = document.createElement('article');
    card.className = 'atividade-card';

    const topo = document.createElement('div');
    topo.className = 'atividade-card-topo';
    const numero = document.createElement('span');
    numero.className = 'atividade-numero';
    numero.innerHTML = `<i class="ph-bold ph-clock"></i> Item ${indice + 1}`;
    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'remover-botao';
    remover.innerHTML = '<i class="ph-bold ph-trash"></i> Remover';
    remover.addEventListener('click', () => {
        if (!window.confirm(`Remover “${item.titulo || 'esta atividade'}” deste dia?`)) return;
        programacaoEditavel[diaAtivo].splice(indice, 1);
        marcarAlterado();
        renderizarTabs();
        renderizarDia();
    });
    topo.append(numero, remover);

    const grade = document.createElement('div');
    grade.className = 'atividade-grade';

    const inicio = document.createElement('input');
    inicio.type = 'time';
    inicio.value = item.inicio;
    inicio.required = true;
    inicio.setAttribute('aria-label', `Início do item ${indice + 1}`);

    const fim = document.createElement('input');
    fim.type = 'time';
    fim.value = item.fim;
    fim.required = true;
    fim.setAttribute('aria-label', `Fim do item ${indice + 1}`);

    const tipo = document.createElement('select');
    tipo.setAttribute('aria-label', `Categoria do item ${indice + 1}`);
    Object.entries(TIPOS_ATIVIDADE_AO_VIVO).forEach(([valor, nome]) => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = nome;
        tipo.appendChild(option);
    });
    tipo.value = item.tipo;

    const titulo = document.createElement('input');
    titulo.type = 'text';
    titulo.value = item.titulo;
    titulo.maxLength = 180;
    titulo.required = true;
    titulo.placeholder = 'Ex.: Intervalo ou Palestra com…';
    titulo.setAttribute('aria-label', `Título do item ${indice + 1}`);

    const descricao = document.createElement('textarea');
    descricao.value = item.descricao || '';
    descricao.maxLength = 5000;
    descricao.placeholder = 'Texto exibido no cartão desta atividade.';
    descricao.setAttribute('aria-label', `Descrição do item ${indice + 1}`);

    const texto = document.createElement('textarea');
    texto.value = item.texto || '';
    texto.maxLength = 500;
    texto.placeholder = 'Opcional. Mensagem curta usada no aviso “acontecendo agora”.';
    texto.setAttribute('aria-label', `Mensagem ao vivo do item ${indice + 1}`);

    const campos = [
        [inicio, 'inicio'],
        [fim, 'fim'],
        [tipo, 'tipo'],
        [titulo, 'titulo'],
        [descricao, 'descricao'],
        [texto, 'texto']
    ];
    campos.forEach(([controle, propriedade]) => {
        const evento = controle.tagName === 'SELECT' ? 'change' : 'input';
        controle.addEventListener(evento, () => {
            item[propriedade] = controle.value;
            marcarAlterado();
            if (propriedade === 'titulo') numero.innerHTML = `<i class="ph-bold ph-clock"></i> Item ${indice + 1}`;
            if (propriedade === 'tipo') renderizarDia();
        });
    });

    grade.append(
        criarCampo('campo-inicio', 'Começa', inicio),
        criarCampo('campo-fim', 'Termina', fim),
        criarCampo('campo-tipo', 'Categoria', tipo),
        criarCampo('campo-titulo', 'Título exibido', titulo)
    );
    const campoDescricao = criarCampo('campo-mensagem', 'Descrição exibida no cronograma', descricao);
    grade.appendChild(campoDescricao);
    const campoTexto = criarCampo('campo-mensagem', 'Mensagem curta para o status ao vivo', texto);
    const ajuda = document.createElement('small');
    ajuda.textContent = 'Esta mensagem aparece abaixo do título enquanto o item estiver acontecendo.';
    campoTexto.appendChild(ajuda);
    grade.appendChild(campoTexto);

    card.append(topo, grade, criarCamposEspecificos(item));
    return card;
}

function renderizarDia() {
    const dia = rotuloDia(diaAtivo);
    const atividades = programacaoEditavel[diaAtivo];
    dataDia.textContent = `${dia.nome} · ${dia.dataCurta}`;
    tituloDia.textContent = 'Conteúdo exibido ao vivo';
    resumoDia.textContent = `${atividades.length} ${atividades.length === 1 ? 'item programado' : 'itens programados'} para este dia.`;
    listaAtividades.innerHTML = '';
    if (!atividades.length) {
        const vazio = document.createElement('div');
        vazio.className = 'atividades-vazio';
        vazio.innerHTML = '<i class="ph-bold ph-calendar-x" style="font-size: 28px;"></i><p>Este dia está sem atividades. Adicione um horário abaixo.</p>';
        listaAtividades.appendChild(vazio);
        return;
    }
    atividades.forEach((item, indice) => listaAtividades.appendChild(criarCardAtividade(item, indice)));
}

function validarProgramacaoParaSalvar() {
    const validada = {};
    DIAS_EVENTO.forEach(dia => {
        const atividades = programacaoEditavel[dia.chave].map((item, indice) => {
            const normalizada = normalizarAtividade(item);
            if (!normalizada) throw new Error(`${dia.nome}: confira início, fim e título do item ${indice + 1}.`);
            return normalizada;
        }).sort((a, b) => horarioEmMinutos(a.inicio) - horarioEmMinutos(b.inicio));

        validada[dia.chave] = atividades;
    });
    if (!temProgramacaoValida(validada)) throw new Error('O cronograma não pode ficar completamente vazio.');
    return validada;
}

async function carregarProgramacao() {
    mostrarStatus('Carregando a programação salva…', 'info');
    try {
        const snapshot = await getDoc(docCronogramaRef);
        const dados = snapshot.data();
        const remota = normalizarProgramacao(dados?.programacao);
        programacaoEditavel = dados?.versaoConteudo === VERSAO_CONTEUDO_CRONOGRAMA && temProgramacaoValida(remota)
            ? remota
            : clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
        renderizarTabs();
        renderizarDia();
        marcarSalvo();
        mostrarStatus(formatarAtualizacao(snapshot.data()?.atualizadoEm), 'sucesso', true);
    } catch (error) {
        console.error(error);
        programacaoEditavel = clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
        renderizarTabs();
        renderizarDia();
        alteracoesStatus.textContent = 'Programação original aberta';
        mostrarStatus('Não foi possível carregar a versão salva. A programação original foi aberta sem publicar alterações.', 'erro');
    }
}

async function salvarProgramacao() {
    let validada;
    try {
        validada = validarProgramacaoParaSalvar();
    } catch (error) {
        mostrarStatus(error.message, 'erro');
        return;
    }

    const textoOriginal = btnSalvar.innerHTML;
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="ph-bold ph-spinner-gap"></i> Publicando…';
    mostrarStatus('Publicando a nova programação…', 'info');
    try {
        await setDoc(docCronogramaRef, {
            programacao: validada,
            versaoConteudo: VERSAO_CONTEUDO_CRONOGRAMA,
            atualizadoEm: serverTimestamp()
        }, { merge: true });
        programacaoEditavel = clonarProgramacao(validada);
        renderizarTabs();
        renderizarDia();
        marcarSalvo();
        mostrarStatus('Programação publicada. Quem estiver no site receberá a mudança automaticamente.', 'sucesso', true);
    } catch (error) {
        console.error(error);
        mostrarStatus('Não foi possível publicar. Confira sua conexão e tente novamente.', 'erro');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = textoOriginal;
    }
}

function liberarEditor() {
    overlayLogin.style.display = 'none';
    if (!editorInicializado) {
        editorInicializado = true;
        carregarProgramacao();
    }
}

async function credencialAdministrativaValida(credencial) {
    const seguranca = await getDoc(doc(db, 'configuracoes', 'seguranca'));
    if (seguranca.exists() && credencial === String(seguranca.data().senhaAdmin || '')) return true;

    const token = credencial.toUpperCase();
    const consulta = query(
        collection(db, 'inscritos'),
        where('email', '==', EMAIL_CONTA_ADMINISTRATIVA),
        where('token', '==', token)
    );
    const resultado = await getDocs(consulta);
    return resultado.docs.some(documento => documento.data().ingressoAtivo !== false);
}

formLogin.addEventListener('submit', async evento => {
    evento.preventDefault();
    const senha = inputSenha.value.trim();
    if (!senha) return;
    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando…';
    try {
        if (await credencialAdministrativaValida(senha)) {
            sessionStorage.setItem('adminLogado', 'true');
            liberarEditor();
        } else {
            window.alert('Senha ou token administrativo incorreto.');
            inputSenha.value = '';
            inputSenha.focus();
        }
    } catch (error) {
        console.error(error);
        window.alert('Não foi possível verificar a senha. Confira sua conexão e tente novamente.');
    } finally {
        btnLogin.disabled = false;
        btnLogin.textContent = 'Acessar editor';
    }
});

btnLogout.addEventListener('click', () => {
    if (alteracoesPendentes && !window.confirm('Há alterações não publicadas. Deseja sair mesmo assim?')) return;
    sessionStorage.removeItem('adminLogado');
    window.location.href = 'admin.html';
});

btnAdicionar.addEventListener('click', () => {
    const horario = proximoHorarioDoDia();
    programacaoEditavel[diaAtivo].push({
        inicio: horario.inicio,
        fim: horario.fim,
        titulo: 'Nova atividade',
        tipo: 'atividade',
        texto: ''
    });
    marcarAlterado();
    renderizarTabs();
    renderizarDia();
    listaAtividades.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

btnRestaurar.addEventListener('click', () => {
    const dia = rotuloDia(diaAtivo);
    if (!window.confirm(`Restaurar toda a programação original de ${dia.nome}?`)) return;
    programacaoEditavel[diaAtivo] = clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO)[diaAtivo];
    marcarAlterado();
    renderizarTabs();
    renderizarDia();
});

btnSalvar.addEventListener('click', salvarProgramacao);

window.addEventListener('beforeunload', evento => {
    if (!alteracoesPendentes) return;
    evento.preventDefault();
    evento.returnValue = '';
});

if (sessionStorage.getItem('adminLogado') === 'true') liberarEditor();
