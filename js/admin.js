import { app, db } from './firebase-config.js';
import { collection, doc, addDoc, getDocs, updateDoc, query, where, arrayUnion, arrayRemove, setDoc, onSnapshot, deleteDoc, getDoc, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";
import {
    VERSAO_CONTEUDO_CRONOGRAMA,
    PROGRAMACAO_AO_VIVO_PADRAO,
    clonarProgramacao,
    montarCatalogoIngressosOficinas,
    normalizarProgramacao,
    temProgramacaoValida
} from './programacao-ao-vivo-config.js?v=20260903-1';

const funcoesAdmin = getFunctions(app, 'southamerica-east1');
const atualizarLimiteEstoqueSeguro = httpsCallable(funcoesAdmin, 'atualizarLimiteEstoque');
const atualizarCategoriaIngressoSeguro = httpsCallable(funcoesAdmin, 'atualizarCategoriaIngresso');

// ==========================================
// ELEMENTOS DO HTML
// ==========================================
const adminNovoNome = document.getElementById('admin-novo-nome');
const adminNovoEmail = document.getElementById('admin-novo-email');
const btnAdminCadastrar = document.getElementById('btn-admin-cadastrar');
const adminAlertaSucesso = document.getElementById('admin-alerta-sucesso');
const adminTokenGerado = document.getElementById('admin-token-gerado');
const selectFase = document.getElementById('select-fase-evento');
const btnSalvarFase = document.getElementById('btn-salvar-fase');
const btnAdminLogout = document.getElementById('btn-admin-logout');
const selectLoteAtivo = document.getElementById('select-lote-ativo');
const btnSalvarLote = document.getElementById('btn-salvar-lote');
const toggleLojinhaVisivel = document.getElementById('toggle-lojinha-visivel');
const btnSalvarLojinha = document.getElementById('btn-salvar-lojinha');
const emailjsPublicKey = document.getElementById('emailjs-public-key');
const emailjsServiceId = document.getElementById('emailjs-service-id');
const emailjsTemplateId = document.getElementById('emailjs-template-id');
const toggleEmailjsAtivo = document.getElementById('toggle-emailjs-ativo');
const btnSalvarEmailjs = document.getElementById('btn-salvar-emailjs');
const btnRecuperarEmails = document.getElementById('btn-recuperar-emails');
const statusEmailjs = document.getElementById('status-emailjs');
const btnCopiarTemplateEmail = document.getElementById('btn-copiar-template-email');

const adminBuscaPax = document.getElementById('admin-busca-pax');
const btnAdminBuscar = document.getElementById('btn-admin-buscar');
const adminResultadoBusca = document.getElementById('admin-resultado-busca');
const paxNome = document.getElementById('pax-nome');
const btnAbrirCamera = document.getElementById('btn-abrir-camera');
const leitorQrcodeDiv = document.getElementById('leitor-qrcode');
let leitor = null; 

const botoesPresenca = document.querySelectorAll('.btn-presenca');
const botoesOficinaAdmin = document.querySelectorAll('.btn-oficina-admin');
const adminEscopoCheckin = document.getElementById('admin-escopo-checkin');
const adminOficinasVazio = document.getElementById('admin-oficinas-vazio');
const fichaOficinas = document.getElementById('ficha-oficinas');

const btnAdminSortear = document.getElementById('btn-admin-sortear');
const sorteioResultado = document.getElementById('sorteio-resultado');
const btnAbrirTelao = document.getElementById('btn-abrir-telao');
const btnAbrirTelaoEvento = document.getElementById('btn-abrir-telao-evento');
const btnPrepararTelaoOffline = document.getElementById('btn-preparar-telao-offline');
const statusTelaoOffline = document.getElementById('status-telao-offline');
const statusTelao = document.getElementById('status-telao');

let idAlunoSelecionado = null;
let alunoCheckinAtual = null;
let credencialCheckinAtual = { tipo: 'consulta', oficinaId: null };
const INTERVALO_QR_MS = 30000;
const adminQrStatus = document.getElementById('admin-qr-status');
const docCronogramaOficinasRefAdmin = doc(db, 'configuracoes', 'cronogramaAoVivo');
let catalogoOficinasAdmin = montarCatalogoIngressosOficinas(PROGRAMACAO_AO_VIVO_PADRAO);

function oficinaExiste(idOficina) {
    return Boolean(catalogoOficinasAdmin[idOficina]) || /^OF0[1-6]$/.test(idOficina);
}

function validarQrTemporizado(token, slot, dadosExtras = {}) {
    const slotAtual = Math.floor(Date.now() / INTERVALO_QR_MS);
    if (!/^[A-Z0-9]{5}$/.test(token) || !Number.isInteger(slot)) {
        return { valido: false, mensagem: 'QR Code inválido.' };
    }
    if (Math.abs(slotAtual - slot) > 1) {
        return { valido: false, mensagem: 'Este QR Code expirou. Peça ao participante para atualizar o ingresso.' };
    }
    return {
        valido: true,
        busca: token.toLowerCase(),
        origemQr: true,
        geradoEm: new Date(slot * INTERVALO_QR_MS),
        ...dadosExtras
    };
}

function interpretarConteudoQr(valor) {
    const texto = String(valor || '').trim();
    if (!texto.startsWith('SEMAU|')) {
        const oficinaLegada = texto.toUpperCase().match(/^([A-Z0-9]{5})-(OF0[1-6])$/);
        if (oficinaLegada && oficinaExiste(oficinaLegada[2])) {
            return {
                valido: true,
                busca: oficinaLegada[1].toLowerCase(),
                origemQr: true,
                tipoCredencial: 'oficina',
                oficinaId: oficinaLegada[2],
                legado: true
            };
        }
        if (/^[A-Z0-9]{5}$/i.test(texto)) {
            return { valido: true, busca: texto.toLowerCase(), origemQr: false, tipoCredencial: 'token_manual' };
        }
        return { valido: true, busca: texto.toLowerCase(), origemQr: false, tipoCredencial: 'consulta' };
    }

    const partes = texto.split('|');
    if (partes.length === 3) {
        return validarQrTemporizado(partes[1]?.trim().toUpperCase(), Number(partes[2]), { tipoCredencial: 'geral' });
    }
    return { valido: false, mensagem: 'QR Code inválido.' };
}

function mostrarStatusQr(mensagem, valido) {
    if (!adminQrStatus) return;
    adminQrStatus.style.display = 'block';
    adminQrStatus.style.background = valido ? '#e9f7ee' : '#fdeceb';
    adminQrStatus.style.color = valido ? '#217a43' : '#a33a32';
    adminQrStatus.textContent = mensagem;
}

function dadosOficina(idOficina) {
    return catalogoOficinasAdmin[idOficina] || { titulo: 'Oficina', ministrante: 'Ministrante a confirmar', data: 'Horário a confirmar' };
}

function rotuloOficina(idOficina) {
    return `${idOficina} · ${dadosOficina(idOficina).titulo}`;
}

function atualizarNomesOficinasCheckin() {
    botoesOficinaAdmin.forEach(botao => {
        botao.dataset.rotuloBase = rotuloOficina(botao.dataset.oficina);
    });
}

atualizarNomesOficinasCheckin();

if (adminNovoNome) {
    adminNovoNome.addEventListener('input', () => {
        if(adminAlertaSucesso) adminAlertaSucesso.style.display = 'none';
    });
}

// ==========================================
// 1. CADASTRAR NOVO ALUNO
// ==========================================
if (btnAdminCadastrar) {
    btnAdminCadastrar.addEventListener('click', async () => {
        const nome = adminNovoNome.value.trim();
        const email = adminNovoEmail.value.trim().toLowerCase();

        if (!nome || !email) {
            alert("Preencha o Nome e o E-mail para cadastrar!");
            return;
        }

        const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let tokenGerado = '';
        for (let i = 0; i < 5; i++) {
            tokenGerado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }

        btnAdminCadastrar.disabled = true;
        btnAdminCadastrar.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Salvando...';

        try {
            await addDoc(collection(db, "inscritos"), {
                nome: nome,
                email: email,
                token: tokenGerado,
                pontos: 0,
                oficinas: [],
                oficinasPresenca: [],
                d21_m: false, d21_t: false,
                d22_m: false,
                d23_m: false, d23_t: false,
                d24_m: false,
                d25_m: false
            });

            if(adminTokenGerado) adminTokenGerado.textContent = tokenGerado;
            if(adminAlertaSucesso) adminAlertaSucesso.style.display = 'block';
            
            adminNovoNome.value = "";
            adminNovoEmail.value = "";
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            alert("Erro ao salvar no banco de dados.");
        } finally {
            btnAdminCadastrar.disabled = false;
            btnAdminCadastrar.textContent = "Salvar Inscrição";
        }
    });
}

// ==========================================
// 1.5 SCANNER DE CÂMERA
// ==========================================
const modalCamera = document.getElementById('modal-camera');
const btnFecharCamera = document.getElementById('btn-fechar-camera');
let rolagemAntesDaCamera = 0;

// O painel usa um contêiner estreito no celular. Fora dele, o overlay fixo passa
// a ocupar a janela inteira, inclusive as áreas laterais e atrás da navegação.
if (modalCamera && modalCamera.parentElement !== document.body) {
    document.body.appendChild(modalCamera);
}

function abrirInterfaceCamera() {
    rolagemAntesDaCamera = window.scrollY;
    document.body.style.top = `-${rolagemAntesDaCamera}px`;
    document.documentElement.classList.add('camera-modal-aberta');
    document.body.classList.add('camera-modal-aberta');
    modalCamera.style.display = 'flex';
}

function fecharInterfaceCamera() {
    modalCamera.style.display = 'none';
    document.documentElement.classList.remove('camera-modal-aberta');
    document.body.classList.remove('camera-modal-aberta');
    document.body.style.top = '';
    window.scrollTo(0, rolagemAntesDaCamera);
}

if (btnAbrirCamera) {
    btnAbrirCamera.addEventListener('click', () => {
        abrirInterfaceCamera();
        if (!leitor) leitor = new Html5Qrcode("leitor-qrcode");
        
        leitor.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (textoDecodificado) => {
                if (navigator.vibrate) navigator.vibrate(200);
                adminBuscaPax.value = textoDecodificado;
                btnAdminBuscar.click();
                desligarCamera();
            },
            (erroDeLeitura) => { }
        ).catch((err) => {
            alert("Não foi possível acessar a câmera.");
            desligarCamera();
        });
    });
}

function desligarCamera() {
    if (leitor) {
        try {
            Promise.resolve(leitor.stop()).catch(() => {}).finally(fecharInterfaceCamera);
        } catch (_) {
            fecharInterfaceCamera();
        }
    } else {
        fecharInterfaceCamera();
    }
}
if (btnFecharCamera) btnFecharCamera.addEventListener('click', desligarCamera);

// ==========================================
// 2. BUSCAR ALUNO E PREENCHER A GRADE
// ==========================================
if (btnAdminBuscar) {
    btnAdminBuscar.addEventListener('click', async () => {
        const leitura = interpretarConteudoQr(adminBuscaPax.value);
        if (!leitura.valido) {
            credencialCheckinAtual = { tipo: 'consulta', oficinaId: null };
            alunoCheckinAtual = null;
            mostrarStatusQr(leitura.mensagem, false);
            adminResultadoBusca.style.display = 'none';
            return;
        }
        const busca = leitura.busca;
        if (!busca) return;
        if (leitura.origemQr) {
            const horario = leitura.geradoEm
                ? `, gerado às ${leitura.geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : '';
            const identificacao = leitura.tipoCredencial === 'oficina'
                ? `QR da ${rotuloOficina(leitura.oficinaId)}`
                : 'QR do ingresso geral';
            mostrarStatusQr(`${identificacao} válido${horario}.`, true);
            adminBuscaPax.value = leitura.busca.toUpperCase();
        } else if (adminQrStatus) {
            adminQrStatus.style.display = 'none';
        }

        adminResultadoBusca.style.display = 'none';
        idAlunoSelecionado = null;
        alunoCheckinAtual = null;
        credencialCheckinAtual = { tipo: leitura.tipoCredencial || 'consulta', oficinaId: leitura.oficinaId || null };

        try {
            const inscritosRef = collection(db, "inscritos");
            const querySnapshot = await getDocs(inscritosRef);
            let alunoAchado = null;

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                if (String(dados.email || '').toLowerCase() === busca || String(dados.token || '').toLowerCase() === busca) {
                    alunoAchado = { id: docSnap.id, ...dados };
                }
            });

            if (alunoAchado) {
                idAlunoSelecionado = alunoAchado.id;
                alunoCheckinAtual = alunoAchado;
                paxNome.textContent = alunoAchado.nome;

                const oficinasAtuais = Array.isArray(alunoAchado.oficinas) ? alunoAchado.oficinas : [];
                if (credencialCheckinAtual.tipo === 'oficina' && !oficinasAtuais.includes(credencialCheckinAtual.oficinaId)) {
                    mostrarStatusQr('Este ingresso de oficina não está ativo para o participante.', false);
                    credencialCheckinAtual = { tipo: 'invalida', oficinaId: credencialCheckinAtual.oficinaId };
                }
                atualizarGradeCheckin(alunoAchado, credencialCheckinAtual);

                adminResultadoBusca.style.display = 'block';
            } else {
                alert("Nenhum participante encontrado.");
            }
        } catch (error) {
            console.error("Erro na busca:", error);
        }
    });
}

function atualizarEscopoCheckin(credencial) {
    if (!adminEscopoCheckin) return;
    adminEscopoCheckin.dataset.tipo = credencial.tipo;
    if (credencial.tipo === 'geral') {
        adminEscopoCheckin.textContent = 'Ingresso geral lido: somente os turnos de palestras estão habilitados.';
    } else if (credencial.tipo === 'oficina') {
        adminEscopoCheckin.textContent = `${rotuloOficina(credencial.oficinaId)} lida: somente esta oficina está habilitada.`;
    } else if (credencial.tipo === 'token_manual') {
        adminEscopoCheckin.textContent = 'Modo de contingência por token: turnos e oficinas inscritas estão habilitados.';
    } else if (credencial.tipo === 'invalida') {
        adminEscopoCheckin.textContent = 'Este ingresso de oficina não pertence às inscrições ativas deste participante.';
    } else {
        adminEscopoCheckin.textContent = 'Consulta manual: leia o QR Code correto para habilitar um check-in.';
    }
}

function atualizarBotaoPresenca(botao, status, horario = null) {
    if (status) {
        botao.classList.add('confirmado');
        let horaTexto = '';
        if (horario) {
            const data = typeof horario.toDate === 'function' ? horario.toDate() : new Date(horario);
            if (!Number.isNaN(data.getTime())) horaTexto = ' • ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        botao.innerHTML = '<i class="ph-bold ph-check"></i> Confirmado' + horaTexto;
        botao.style.backgroundColor = 'var(--cor-primaria)';
        botao.style.color = '#fff';
        botao.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    } else {
        botao.classList.remove('confirmado');
        botao.textContent = botao.dataset.campo.endsWith('_m') ? 'Manhã' : 'Tarde';
        botao.style.backgroundColor = '#f4f5f7';
        botao.style.color = '#888';
        botao.style.boxShadow = 'none';
    }
}

function atualizarBotaoOficinaCheckin(botao, dadosAluno, credencial) {
    const idOficina = botao.dataset.oficina;
    const oficinasInscritas = Array.isArray(dadosAluno.oficinas) ? dadosAluno.oficinas : [];
    const inscrito = oficinasInscritas.includes(idOficina);
    botao.hidden = !inscrito;
    const oficinaHabilitada = credencial.tipo === 'token_manual'
        || (credencial.tipo === 'oficina' && credencial.oficinaId === idOficina);
    botao.disabled = !inscrito || !oficinaHabilitada;
    if (!inscrito) return;

    const presencas = Array.isArray(dadosAluno.oficinasPresenca) ? dadosAluno.oficinasPresenca : [];
    const confirmado = presencas.includes(idOficina);
    const horario = dadosAluno.oficinasCheckinEm?.[idOficina];
    botao.classList.toggle('confirmado', confirmado);
    if (confirmado) {
        let horaTexto = '';
        if (horario) {
            const data = typeof horario.toDate === 'function' ? horario.toDate() : new Date(horario);
            if (!Number.isNaN(data.getTime())) horaTexto = ` · ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
        botao.innerHTML = `<i class="ph-bold ph-check"></i> ${idOficina} · Presença confirmada${horaTexto}`;
        botao.style.backgroundColor = 'var(--cor-secundaria)';
        botao.style.color = '#fff';
        botao.style.border = '1px solid var(--cor-secundaria)';
    } else {
        botao.textContent = botao.dataset.rotuloBase || rotuloOficina(idOficina);
        botao.style.backgroundColor = '#f4f5f7';
        botao.style.color = '#666';
        botao.style.border = '1px solid #e8e8eb';
    }
}

function atualizarGradeCheckin(dadosAluno, credencial) {
    atualizarEscopoCheckin(credencial);
    botoesPresenca.forEach(botao => {
        const campoNoBanco = botao.dataset.campo;
        atualizarBotaoPresenca(botao, dadosAluno[campoNoBanco], dadosAluno[campoNoBanco + '_checkinEm']);
        botao.disabled = credencial.tipo !== 'geral' && credencial.tipo !== 'token_manual';
    });
    botoesOficinaAdmin.forEach(botao => atualizarBotaoOficinaCheckin(botao, dadosAluno, credencial));
    if (adminOficinasVazio) {
        const possuiOficinas = Array.isArray(dadosAluno.oficinas) && dadosAluno.oficinas.length > 0;
        adminOficinasVazio.style.display = possuiOficinas ? 'none' : 'block';
    }
}

// ==========================================
// 3. DAR PRESENÇA E OFICINAS
// ==========================================
const togglePresenca = async (campo, botao) => {
    if (!idAlunoSelecionado || !['geral', 'token_manual'].includes(credencialCheckinAtual.tipo)) {
        alert('Leia o QR Code do ingresso geral para alterar a presença em palestras.');
        return;
    }
    const jaTemPresenca = botao.classList.contains('confirmado');
    const novoStatus = !jaTemPresenca;
    try {
        const atualizacao = novoStatus ? {
            [campo]: true,
            [campo + '_checkinEm']: serverTimestamp(),
            [campo + '_origem']: credencialCheckinAtual.tipo === 'token_manual' ? 'token_manual' : 'qr_dinamico'
        } : {
            [campo]: false,
            [campo + '_checkinEm']: deleteField(),
            [campo + '_origem']: deleteField()
        };
        await updateDoc(doc(db, "inscritos", idAlunoSelecionado), atualizacao);
        if (alunoCheckinAtual) {
            alunoCheckinAtual[campo] = novoStatus;
            alunoCheckinAtual[campo + '_checkinEm'] = novoStatus ? new Date() : null;
            atualizarParticipanteNaBaseSorteioOffline(alunoCheckinAtual);
        }
        atualizarBotaoPresenca(botao, novoStatus, novoStatus ? new Date() : null);
    } catch (error) { console.error("Erro ao atualizar presença:", error); }
};

botoesPresenca.forEach(botao => {
    botao.addEventListener('click', () => {
        if (!['geral', 'token_manual'].includes(credencialCheckinAtual.tipo)) {
            alert('Este controle só é liberado pelo QR Code do ingresso geral.');
            return;
        }
        const acao = botao.classList.contains('confirmado') ? "REMOVER a presença" : "CONFIRMAR a presença";
        if (confirm(`Tem certeza que deseja ${acao} neste turno?`)) {
            togglePresenca(botao.dataset.campo, botao);
        }
    });
});

botoesOficinaAdmin.forEach(botao => {
    botao.addEventListener('click', async () => {
        if (!idAlunoSelecionado || !alunoCheckinAtual) return;
        const idOficina = botao.dataset.oficina;
        const oficinaHabilitada = credencialCheckinAtual.tipo === 'token_manual'
            || (credencialCheckinAtual.tipo === 'oficina' && credencialCheckinAtual.oficinaId === idOficina);
        if (!oficinaHabilitada) {
            alert('Leia o QR Code desta oficina para alterar a presença nela.');
            return;
        }
        const oficinasInscritas = Array.isArray(alunoCheckinAtual.oficinas) ? alunoCheckinAtual.oficinas : [];
        if (!oficinasInscritas.includes(idOficina)) {
            alert('O participante não está inscrito nesta oficina.');
            return;
        }
        const presencas = Array.isArray(alunoCheckinAtual.oficinasPresenca) ? alunoCheckinAtual.oficinasPresenca : [];
        const jaTemPresenca = presencas.includes(idOficina);
        const acao = jaTemPresenca ? 'REMOVER a presença em' : 'CONFIRMAR a presença em';
        if (!confirm(`Tem certeza que deseja ${acao} ${rotuloOficina(idOficina)}?`)) return;

        const alunoRef = doc(db, "inscritos", idAlunoSelecionado);
        try {
            if (jaTemPresenca) {
                await updateDoc(alunoRef, {
                    oficinasPresenca: arrayRemove(idOficina),
                    [`oficinasCheckinEm.${idOficina}`]: deleteField(),
                    [`oficinasCheckinOrigem.${idOficina}`]: deleteField()
                });
                alunoCheckinAtual.oficinasPresenca = presencas.filter(id => id !== idOficina);
                if (alunoCheckinAtual.oficinasCheckinEm) delete alunoCheckinAtual.oficinasCheckinEm[idOficina];
            } else {
                await updateDoc(alunoRef, {
                    oficinasPresenca: arrayUnion(idOficina),
                    [`oficinasCheckinEm.${idOficina}`]: serverTimestamp(),
                    [`oficinasCheckinOrigem.${idOficina}`]: credencialCheckinAtual.tipo === 'token_manual' ? 'token_manual' : 'qr_oficina'
                });
                alunoCheckinAtual.oficinasPresenca = [...new Set([...presencas, idOficina])];
                alunoCheckinAtual.oficinasCheckinEm = { ...(alunoCheckinAtual.oficinasCheckinEm || {}), [idOficina]: new Date() };
            }
            atualizarBotaoOficinaCheckin(botao, alunoCheckinAtual, credencialCheckinAtual);
        } catch (error) { console.error("Erro:", error); }
    });
});

// ==========================================
// 4. O SORTEADOR
// ==========================================
const CHAVE_BASE_SORTEIO_OFFLINE = 'semau-base-sorteio-offline-v1';
const canalSorteio = 'BroadcastChannel' in window ? new BroadcastChannel('semau-sorteio') : null;
let janelaTelao = null;
let telaoConectado = false;

function montarBaseSorteioOffline(documentos) {
    const participantes = documentos.map(documento => {
        const dados = typeof documento.data === 'function' ? documento.data() : documento;
        const id = documento?.id || dados?.id || '';
        const nome = String(dados?.nome || '').trim();
        const turnos = TURNOS_PRESENCA.filter(turno => dados?.[turno] === true);
        return { id, nome, turnos };
    }).filter(participante => participante.nome && participante.turnos.length);
    return { versao: 1, atualizadoEm: Date.now(), participantes };
}

function salvarBaseSorteioOffline(base) {
    localStorage.setItem(CHAVE_BASE_SORTEIO_OFFLINE, JSON.stringify(base));
    atualizarStatusTelaoOffline(base);
}

function carregarBaseSorteioOffline() {
    try {
        const base = JSON.parse(localStorage.getItem(CHAVE_BASE_SORTEIO_OFFLINE) || 'null');
        return base?.versao === 1 && Array.isArray(base.participantes) ? base : null;
    } catch (_) {
        return null;
    }
}

function atualizarParticipanteNaBaseSorteioOffline(dadosAluno) {
    const base = carregarBaseSorteioOffline();
    if (!base || !dadosAluno) return;
    const id = dadosAluno.id || idAlunoSelecionado || '';
    const nome = String(dadosAluno.nome || '').trim();
    const turnos = TURNOS_PRESENCA.filter(turno => dadosAluno[turno] === true);
    const indiceParticipante = base.participantes.findIndex(participante => participante.id === id);
    if (!nome || !turnos.length) {
        if (indiceParticipante >= 0) base.participantes.splice(indiceParticipante, 1);
    } else if (indiceParticipante >= 0) {
        base.participantes[indiceParticipante] = { id, nome, turnos };
    } else {
        base.participantes.push({ id, nome, turnos });
    }
    base.atualizadoEm = Date.now();
    salvarBaseSorteioOffline(base);
}

function nomesElegiveisNaBase(base, turno) {
    if (!base) return [];
    return base.participantes
        .filter(participante => turno === 'qualquer' ? participante.turnos.length : participante.turnos.includes(turno))
        .map(participante => participante.nome);
}

function consultarInscritosComLimite(tempoMaximo = 6000) {
    if (!navigator.onLine) return Promise.reject(new Error('Sem conexão.'));
    return Promise.race([
        getDocs(collection(db, 'inscritos')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('A consulta on-line demorou demais.')), tempoMaximo))
    ]);
}

function atualizarStatusTelaoOffline(base = carregarBaseSorteioOffline(), estado = '') {
    if (!statusTelaoOffline || !btnPrepararTelaoOffline) return;
    if (!base) {
        statusTelaoOffline.textContent = 'Ainda não preparado neste dispositivo.';
        statusTelaoOffline.dataset.estado = estado;
        btnPrepararTelaoOffline.dataset.pronto = 'false';
        return;
    }
    const data = new Date(base.atualizadoEm);
    const horario = data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const elegibilidade = base.participantes.length === 1 ? 'participante elegível' : 'participantes elegíveis';
    statusTelaoOffline.textContent = `Pronto para uso offline · ${base.participantes.length} ${elegibilidade} · atualizado em ${horario}.`;
    statusTelaoOffline.dataset.estado = 'pronto';
    btnPrepararTelaoOffline.dataset.pronto = 'true';
    if (!btnPrepararTelaoOffline.disabled) {
        btnPrepararTelaoOffline.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i> Atualizar preparo offline';
    }
}

async function prepararArquivosTelaoOffline() {
    if (!('serviceWorker' in navigator)) throw new Error('Este navegador não oferece o modo offline necessário.');
    const registro = await navigator.serviceWorker.ready;
    await registro.update().catch(() => {});
    const trabalhador = registro.waiting || registro.active || navigator.serviceWorker.controller;
    if (!trabalhador) throw new Error('O aplicativo offline ainda não está ativo. Atualize a página e tente novamente.');

    await new Promise((resolve, reject) => {
        const canal = new MessageChannel();
        const limite = setTimeout(() => reject(new Error('A preparação dos slides demorou demais. Tente novamente com uma conexão estável.')), 60000);
        canal.port1.onmessage = evento => {
            clearTimeout(limite);
            if (evento.data?.ok) resolve(evento.data);
            else reject(new Error(evento.data?.mensagem || 'Não foi possível salvar os slides.'));
        };
        trabalhador.postMessage({ tipo: 'preparar-telao-offline' }, [canal.port2]);
    });
}

if (btnPrepararTelaoOffline) {
    atualizarStatusTelaoOffline();
    btnPrepararTelaoOffline.addEventListener('click', async () => {
        const textoOriginal = btnPrepararTelaoOffline.innerHTML;
        btnPrepararTelaoOffline.disabled = true;
        btnPrepararTelaoOffline.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Preparando telão...';
        if (statusTelaoOffline) {
            statusTelaoOffline.dataset.estado = '';
            statusTelaoOffline.textContent = 'Salvando slides e atualizando os participantes elegíveis...';
        }
        try {
            const [querySnapshot] = await Promise.all([
                getDocs(collection(db, 'inscritos')),
                prepararArquivosTelaoOffline()
            ]);
            salvarBaseSorteioOffline(montarBaseSorteioOffline(querySnapshot.docs));
            btnPrepararTelaoOffline.innerHTML = '<i class="ph-bold ph-check-circle"></i> Telão preparado';
        } catch (error) {
            console.error('Erro ao preparar telão offline:', error);
            if (statusTelaoOffline) {
                statusTelaoOffline.dataset.estado = 'erro';
                statusTelaoOffline.textContent = error?.message || 'Não foi possível preparar o telão. Confira a internet e tente novamente.';
            }
            btnPrepararTelaoOffline.innerHTML = textoOriginal;
        } finally {
            btnPrepararTelaoOffline.disabled = false;
        }
    });
}

function publicarNoTelao(mensagem) {
    canalSorteio?.postMessage(mensagem);
    localStorage.setItem('semau-sorteio-mensagem', JSON.stringify({ ...mensagem, enviadoEm: Date.now() }));
}

function atualizarStatusTelao(conectado) {
    telaoConectado = conectado;
    if (!statusTelao) return;
    statusTelao.textContent = conectado ? 'Tela do telão conectada' : 'Tela do telão desconectada';
    statusTelao.style.color = conectado ? '#218653' : '#888';
}

function receberMensagemTelao(dados) {
    if (dados?.tipo === 'tela-pronta') atualizarStatusTelao(true);
    if (dados?.tipo === 'tela-fechada') atualizarStatusTelao(false);
}

if (canalSorteio) canalSorteio.onmessage = evento => receberMensagemTelao(evento.data);
window.addEventListener('storage', evento => {
    if (evento.key !== 'semau-sorteio-mensagem' || !evento.newValue) return;
    try { receberMensagemTelao(JSON.parse(evento.newValue)); } catch (error) { console.error(error); }
});

if (btnAbrirTelao) {
    btnAbrirTelao.addEventListener('click', () => {
        janelaTelao = window.open('sorteio-telao.html', 'semau-sorteio-telao', 'width=1280,height=720,resizable=yes');
        if (!janelaTelao) {
            alert('O navegador bloqueou a nova janela. Autorize pop-ups para abrir a tela do sorteio.');
            return;
        }
        janelaTelao.focus();
        if (statusTelao) statusTelao.textContent = 'Conectando ao telão...';
    });
}

if (btnAbrirTelaoEvento) {
    btnAbrirTelaoEvento.addEventListener('click', () => {
        const janelaTelaoEvento = window.open('telao-evento.html', 'semau-telao-evento', 'width=1600,height=900,resizable=yes');
        if (!janelaTelaoEvento) {
            alert('O navegador bloqueou a nova janela. Autorize pop-ups para abrir o telão do evento.');
            return;
        }
        janelaTelaoEvento.focus();
    });
}

const selectSorteioTurno = document.getElementById('select-sorteio-turno');

if (btnAdminSortear) {
    btnAdminSortear.addEventListener('click', async () => {
        sorteioResultado.innerHTML = '<p style="color: #888; font-size: 14px;"><i class="ph-bold ph-hourglass-high"></i> Misturando os nomes...</p>';
        btnAdminSortear.disabled = true;
        
        const turnoEscolhido = selectSorteioTurno ? selectSorteioTurno.value : 'qualquer';
        let usandoBaseOffline = false;

        try {
            let baseSorteio;
            try {
                const querySnapshot = await consultarInscritosComLimite();
                baseSorteio = montarBaseSorteioOffline(querySnapshot.docs);
                salvarBaseSorteioOffline(baseSorteio);
            } catch (erroRede) {
                baseSorteio = carregarBaseSorteioOffline();
                usandoBaseOffline = Boolean(baseSorteio);
                if (!baseSorteio) throw erroRede;
            }
            const listaSorteaveis = nomesElegiveisNaBase(baseSorteio, turnoEscolhido);
            
            if (listaSorteaveis.length === 0) {
                sorteioResultado.innerHTML = `<div style="background: #fffaf9; color: #e06d53; padding: 16px; border-radius: 12px; border: 1px solid #ffebeb; font-weight: 600; font-size: 14px;"><i class="ph-bold ph-warning-circle"></i> Ninguém com presença confirmada neste turno!</div>`;
                return;
            }
            
            const ganhador = listaSorteaveis[Math.floor(Math.random() * listaSorteaveis.length)];
            const turnoTexto = selectSorteioTurno?.selectedOptions[0]?.textContent || '';
            publicarNoTelao({ tipo: 'sortear', nomes: listaSorteaveis, ganhador, turno: turnoTexto });
            sorteioResultado.innerHTML = `
                <div style="background: #f2fbf5; padding: 24px; border-radius: 16px; border: 1px solid #c3ebd2; margin-top: 10px;">
                    ${usandoBaseOffline ? '<p style="margin:0 0 10px;color:#8a6816;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;"><i class="ph-bold ph-cloud-slash"></i> Sorteio realizado com a base offline salva</p>' : ''}
                    <p style="font-size: 12px; color: #27ae60; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;"><i class="ph-bold ph-confetti"></i> Ganhador(a)</p>
                    <strong style="font-size: 24px; color: var(--cor-primaria); font-weight: 800; word-break: break-word; line-height: 1.2;">${ganhador}</strong>
                </div>
            `;
            
        } catch (error) {
            sorteioResultado.textContent = "Sem conexão e sem uma base offline preparada. Conecte-se ou use o botão de preparação do telão.";
        } finally {
            btnAdminSortear.disabled = false;
        }
    });
}

// ==========================================
// 5. NAVEGAÇÃO E CONFIGURAÇÕES
// ==========================================
btnSalvarFase.addEventListener('click', async () => {
    const faseEscolhida = selectFase.value;
    if(confirm(`Tem certeza que deseja mudar o site para a fase: ${faseEscolhida}?`)) {
        try {
            await setDoc(doc(db, "configuracoes", "geral"), { faseAtual: faseEscolhida }, { merge: true });
            alert("✅ Site atualizado com sucesso!");
        } catch (error) { alert("Erro ao mudar a fase."); }
    }
});

const docGeralRef = doc(db, "configuracoes", "geral");

onSnapshot(docGeralRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const configuracao = docSnap.data();
    if (selectFase && configuracao.faseAtual) selectFase.value = configuracao.faseAtual;
    if (selectLoteAtivo) {
        const loteLegado = ({ 1: 'primeiro', 2: 'segundo' })[Number(configuracao.loteAtivo)];
        selectLoteAtivo.value = ['social', 'primeiro', 'segundo'].includes(configuracao.loteIngressosAtivo)
            ? configuracao.loteIngressosAtivo
            : loteLegado || 'social';
    }
    if (toggleLojinhaVisivel) toggleLojinhaVisivel.checked = configuracao.lojinhaVisivel !== false;
});

if (btnSalvarLote) {
    btnSalvarLote.addEventListener('click', async () => {
        const loteIngressosAtivo = selectLoteAtivo.value;
        const nomesLotes = { social: 'Lote Social', primeiro: '1º lote', segundo: '2º lote' };
        if (!nomesLotes[loteIngressosAtivo]) return;
        try {
            btnSalvarLote.disabled = true;
            const loteAtivo = ({ social: 0, primeiro: 1, segundo: 2 })[loteIngressosAtivo];
            await setDoc(docGeralRef, { loteIngressosAtivo, loteAtivo }, { merge: true });
            alert(nomesLotes[loteIngressosAtivo] + ' ativado na página de ingressos.');
        } catch (error) {
            console.error('Erro ao ativar lote:', error);
            alert('Não foi possível atualizar o lote.');
        } finally {
            btnSalvarLote.disabled = false;
        }
    });
}


if (btnSalvarLojinha) {
    btnSalvarLojinha.addEventListener('click', async () => {
        btnSalvarLojinha.disabled = true;
        const textoOriginal = btnSalvarLojinha.textContent;
        btnSalvarLojinha.textContent = 'Salvando...';
        try {
            await setDoc(docGeralRef, { lojinhaVisivel: toggleLojinhaVisivel.checked }, { merge: true });
            alert(toggleLojinhaVisivel.checked ? 'Produtos da lojinha publicados.' : 'Lojinha alterada para Em breve.');
        } catch (error) {
            console.error('Erro ao atualizar a lojinha:', error);
            alert('Não foi possível atualizar a lojinha.');
        } finally {
            btnSalvarLojinha.disabled = false;
            btnSalvarLojinha.textContent = textoOriginal;
        }
    });
}

const docEmailIngressoRef = doc(db, "configuracoes", "emailIngresso");
let configuracaoEmailIngresso = null;

function mostrarStatusEmailjs(mensagem, sucesso = false) {
    if (!statusEmailjs) return;
    statusEmailjs.style.display = 'block';
    statusEmailjs.style.background = sucesso ? '#eaf8ef' : '#fff1ec';
    statusEmailjs.style.color = sucesso ? '#217a43' : '#a6522b';
    statusEmailjs.textContent = mensagem;
}

onSnapshot(docEmailIngressoRef, (snapshot) => {
    const dados = snapshot.data() || {};
    configuracaoEmailIngresso = {
        publicKey: String(dados.publicKey || '').trim(),
        serviceId: String(dados.serviceId || 'default_service').trim(),
        templateId: String(dados.templateId || 'template_ingresso_semau').trim(),
        ativo: dados.ativo === true
    };
    if (emailjsPublicKey) emailjsPublicKey.value = configuracaoEmailIngresso.publicKey;
    if (emailjsServiceId) emailjsServiceId.value = configuracaoEmailIngresso.serviceId;
    if (emailjsTemplateId) emailjsTemplateId.value = configuracaoEmailIngresso.templateId;
    if (toggleEmailjsAtivo) toggleEmailjsAtivo.checked = configuracaoEmailIngresso.ativo;
    if (configuracaoEmailIngresso.publicKey && window.emailjs) window.emailjs.init(configuracaoEmailIngresso.publicKey);
}, (error) => {
    console.error('Erro ao carregar configuração do EmailJS:', error);
    mostrarStatusEmailjs('Não foi possível carregar a configuração do e-mail.');
});

if (btnSalvarEmailjs) {
    btnSalvarEmailjs.addEventListener('click', async () => {
        const configuracao = {
            publicKey: emailjsPublicKey.value.trim(),
            serviceId: emailjsServiceId.value.trim() || 'default_service',
            templateId: emailjsTemplateId.value.trim() || 'template_ingresso_semau',
            ativo: toggleEmailjsAtivo.checked
        };
        if (configuracao.ativo && !configuracao.publicKey) {
            mostrarStatusEmailjs('Informe a Public Key antes de ativar os envios.');
            emailjsPublicKey.focus();
            return;
        }

        btnSalvarEmailjs.disabled = true;
        const textoOriginal = btnSalvarEmailjs.innerHTML;
        btnSalvarEmailjs.textContent = 'Salvando...';
        try {
            await setDoc(docEmailIngressoRef, { ...configuracao, atualizadoEm: serverTimestamp() }, { merge: true });
            configuracaoEmailIngresso = configuracao;
            if (configuracao.publicKey && window.emailjs) window.emailjs.init(configuracao.publicKey);
            mostrarStatusEmailjs(configuracao.ativo
                ? 'Envio automático ativado. O botão de reenvio da base também usará este modelo.'
                : 'Configuração salva. O envio automático permanece desativado.', true);
        } catch (error) {
            console.error('Erro ao salvar configuração do EmailJS:', error);
            mostrarStatusEmailjs('Não foi possível salvar a configuração do e-mail.');
        } finally {
            btnSalvarEmailjs.disabled = false;
            btnSalvarEmailjs.innerHTML = textoOriginal;
        }
    });
}
if (btnCopiarTemplateEmail) {
    btnCopiarTemplateEmail.addEventListener('click', async () => {
        try {
            const resposta = await fetch('email-templates/ingresso-xvi-semau.html', { cache: 'no-store' });
            if (!resposta.ok) throw new Error('Modelo indisponível');
            const html = await resposta.text();
            await navigator.clipboard.writeText(html);
            mostrarStatusEmailjs('HTML do modelo copiado. Agora é só colar no editor do EmailJS.', true);
        } catch (error) {
            console.error('Erro ao copiar modelo:', error);
            mostrarStatusEmailjs('Não foi possível copiar automaticamente. Use o link “Visualizar modelo”.');
        }
    });
}
const docConvidadosRef = doc(db, "configuracoes", "anuncios");
const checkboxesConvidados = document.querySelectorAll('.toggle-convidado');

onSnapshot(docConvidadosRef, (docSnap) => {
    if (docSnap.exists()) {
        const ativos = docSnap.data().ativos || []; 
        checkboxesConvidados.forEach(chk => { chk.checked = ativos.includes(chk.value); });
    }
});

checkboxesConvidados.forEach(chk => {
    chk.addEventListener('change', async () => {
        const listaAtualizada = Array.from(checkboxesConvidados).filter(box => box.checked).map(box => box.value);
        try { await setDoc(docConvidadosRef, { ativos: listaAtualizada }, { merge: true }); } catch (error) {}
    });
});

const selectModoCronograma = document.getElementById('select-modo-cronograma');
const btnSalvarModoCronograma = document.getElementById('btn-salvar-modo-cronograma');

onSnapshot(docConvidadosRef, (docSnap) => {
    if (docSnap.exists() && docSnap.data().modo) {
        if (selectModoCronograma) selectModoCronograma.value = docSnap.data().modo;
    }
});

if (btnSalvarModoCronograma) {
    btnSalvarModoCronograma.addEventListener('click', async () => {
        const modoEscolhido = selectModoCronograma.value;
        if (confirm(`Deseja alterar a visualização do app?`)) {
            try {
                await setDoc(docConvidadosRef, { modo: modoEscolhido }, { merge: true });
                alert("✅ Modo atualizado!");
            } catch (error) { alert("Erro ao salvar configuração."); }
        }
    });
}

const viewAdCadastro = document.getElementById('view-admin-cadastro');
const viewAdPresenca = document.getElementById('view-admin-presenca');
const viewAdLista = document.getElementById('view-admin-lista');
const viewAdConfigs = document.getElementById('view-admin-configs');

const navAdCadastro = document.getElementById('nav-ad-cadastro');
const navAdPresenca = document.getElementById('nav-ad-presenca');
const navAdLista = document.getElementById('nav-ad-lista');
const navAdConfigs = document.getElementById('nav-ad-configs');

function showAdminView(viewToShow, navItemToHighlight) {
    document.querySelectorAll('#app-container > .view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    document.querySelectorAll('#bottom-nav .nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    viewToShow.style.display = 'block';
    viewToShow.classList.add('active');
    navItemToHighlight.classList.add('active');
}

if(navAdCadastro) navAdCadastro.addEventListener('click', () => showAdminView(viewAdCadastro, navAdCadastro));
if(navAdPresenca) navAdPresenca.addEventListener('click', () => showAdminView(viewAdPresenca, navAdPresenca));
if(navAdLista) navAdLista.addEventListener('click', () => {
    showAdminView(viewAdLista, navAdLista);
    carregarListaInscritos(); 
});
if(navAdConfigs) navAdConfigs.addEventListener('click', () => showAdminView(viewAdConfigs, navAdConfigs));

// ==========================================
// 6. LISTA DE INSCRITOS (NOVO VISUAL)
// ==========================================
const containerListaInscritos = document.getElementById('container-lista-inscritos');
const adminBuscaLista = document.getElementById('admin-busca-lista');
const adminFiltroModalidade = document.getElementById('admin-filtro-modalidade');
const adminOrdenacaoLista = document.getElementById('admin-ordenacao-lista');
const adminListaResultado = document.getElementById('admin-lista-resultado');
const adminListaFiltroVazio = document.getElementById('admin-lista-filtro-vazio');
const dashTotal = document.getElementById('dash-total');
const btnExportarExcel = document.getElementById('btn-exportar-excel');
const estoqueKitSegundo = document.getElementById('estoque-kit-segundo');
const estoqueKitVendidos = document.getElementById('estoque-kit-vendidos');
const estoqueKitLimite = document.getElementById('estoque-kit-limite');
const estoqueKitStatus = document.getElementById('estoque-kit-status');
const adminPagamentosProblemas = document.getElementById('admin-pagamentos-problemas');
const estoqueResumoVendidos = document.getElementById('estoque-resumo-vendidos');
const estoqueResumoLimite = document.getElementById('estoque-resumo-limite');
const btnAbrirEstoque = document.getElementById('btn-abrir-estoque');
const modalEstoque = document.getElementById('modal-estoque');
const btnFecharEstoque = document.getElementById('btn-fechar-estoque');
const btnEditarLimiteEstoque = document.getElementById('btn-editar-limite-estoque');
const formLimiteEstoque = document.getElementById('form-limite-estoque');
const inputLimiteEstoque = document.getElementById('input-limite-estoque');
const senhaLimiteEstoque = document.getElementById('senha-limite-estoque');
const btnCancelarLimiteEstoque = document.getElementById('btn-cancelar-limite-estoque');
const btnSalvarLimiteEstoque = document.getElementById('btn-salvar-limite-estoque');
const statusLimiteEstoque = document.getElementById('status-limite-estoque');

let dadosParaExcel = [];
const inscritosPorId = new Map();
const pedidosPorId = new Map();
let estadoEstoqueKit = { vendidos: 0, limite: 70, reservados: 0 };
let rolagemAntesDoEstoque = 0;
let focoAntesDoEstoque = null;
const TURNOS_PRESENCA = ['d21_m', 'd21_t', 'd22_m', 'd23_m', 'd23_t', 'd24_m', 'd25_m'];
const NOMES_TURNOS = {
    d21_m: '21/Set · Manhã', d21_t: '21/Set · Tarde',
    d22_m: '22/Set · Manhã',
    d23_m: '23/Set · Manhã', d23_t: '23/Set · Tarde',
    d24_m: '24/Set · Manhã',
    d25_m: '25/Set · Manhã'
};

const modalFichaInscrito = document.getElementById('modal-ficha-inscrito');
const modalFichaNome = document.getElementById('modal-ficha-nome');
const btnFecharFicha = document.getElementById('btn-fechar-ficha');
const btnCancelarFicha = document.getElementById('btn-cancelar-ficha');
const btnSalvarFicha = document.getElementById('btn-salvar-ficha');
const formFichaInscrito = document.getElementById('form-ficha-inscrito');
const fichaStatus = document.getElementById('ficha-status');
const fichaDadosPessoais = document.getElementById('ficha-dados-pessoais');
const fichaAjusteCategoria = document.getElementById('ficha-ajuste-categoria');
const fichaSenhaCategoria = document.getElementById('ficha-senha-categoria');
const fichaMotivoCategoria = document.getElementById('ficha-motivo-categoria');
const fichaDadosIngresso = document.getElementById('ficha-dados-ingresso');
const fichaResumoPresenca = document.getElementById('ficha-resumo-presenca');
const fichaDadosEvento = document.getElementById('ficha-dados-evento');
let focoAntesDaFicha = null;
let idFichaInscritoAtual = null;

onSnapshot(docCronogramaOficinasRefAdmin, snapshot => {
    const dados = snapshot.data();
    const programacaoRemota = normalizarProgramacao(dados?.programacao);
    const programacao = dados?.versaoConteudo === VERSAO_CONTEUDO_CRONOGRAMA && temProgramacaoValida(programacaoRemota)
        ? programacaoRemota
        : clonarProgramacao(PROGRAMACAO_AO_VIVO_PADRAO);
    catalogoOficinasAdmin = montarCatalogoIngressosOficinas(programacao);
    atualizarNomesOficinasCheckin();
    if (alunoCheckinAtual) atualizarGradeCheckin(alunoCheckinAtual, credencialCheckinAtual);
    if (idFichaInscritoAtual && inscritosPorId.has(idFichaInscritoAtual)) {
        renderizarOficinasFicha(inscritosPorId.get(idFichaInscritoAtual).oficinas);
    }
}, error => console.warn('Não foi possível sincronizar as oficinas no painel.', error));

// O aplicativo recebe zoom responsivo no celular. Fora desse contêiner, a camada
// fixa volta a usar a janela inteira como referência e cobre toda a tela.
if (modalFichaInscrito && modalFichaInscrito.parentElement !== document.body) {
    document.body.appendChild(modalFichaInscrito);
}

// O modal precisa ficar fora do contêiner responsivo do aplicativo para que o
// fundo escuro cubra a janela inteira em qualquer celular.
if (modalEstoque && modalEstoque.parentElement !== document.body) {
    document.body.appendChild(modalEstoque);
}

function limparFormularioLimiteEstoque() {
    if (formLimiteEstoque) formLimiteEstoque.hidden = true;
    if (senhaLimiteEstoque) senhaLimiteEstoque.value = '';
    if (statusLimiteEstoque) {
        statusLimiteEstoque.textContent = '';
        statusLimiteEstoque.style.color = '';
    }
}

function abrirModalEstoque() {
    if (!modalEstoque || !modalEstoque.hidden) return;
    focoAntesDoEstoque = document.activeElement;
    rolagemAntesDoEstoque = window.scrollY || window.pageYOffset || 0;
    document.body.style.setProperty('--estoque-scroll-top', `-${rolagemAntesDoEstoque}px`);
    document.documentElement.classList.add('estoque-modal-aberta');
    document.body.classList.add('estoque-modal-aberta');
    modalEstoque.hidden = false;
    limparFormularioLimiteEstoque();
    requestAnimationFrame(() => btnFecharEstoque?.focus());
}

function fecharModalEstoque() {
    if (!modalEstoque || modalEstoque.hidden) return;
    modalEstoque.hidden = true;
    document.documentElement.classList.remove('estoque-modal-aberta');
    document.body.classList.remove('estoque-modal-aberta');
    document.body.style.removeProperty('--estoque-scroll-top');
    limparFormularioLimiteEstoque();
    window.scrollTo(0, rolagemAntesDoEstoque);
    focoAntesDoEstoque?.focus?.();
}

btnAbrirEstoque?.addEventListener('click', abrirModalEstoque);
btnFecharEstoque?.addEventListener('click', fecharModalEstoque);
modalEstoque?.addEventListener('click', event => {
    if (event.target === modalEstoque) fecharModalEstoque();
});

btnEditarLimiteEstoque?.addEventListener('click', () => {
    if (!formLimiteEstoque || !inputLimiteEstoque) return;
    formLimiteEstoque.hidden = false;
    inputLimiteEstoque.min = String(estadoEstoqueKit.vendidos + estadoEstoqueKit.reservados);
    inputLimiteEstoque.value = String(estadoEstoqueKit.limite);
    if (senhaLimiteEstoque) senhaLimiteEstoque.value = '';
    if (statusLimiteEstoque) statusLimiteEstoque.textContent = '';
    inputLimiteEstoque.focus();
});

btnCancelarLimiteEstoque?.addEventListener('click', limparFormularioLimiteEstoque);

formLimiteEstoque?.addEventListener('submit', async event => {
    event.preventDefault();
    const novoLimite = Number(inputLimiteEstoque?.value);
    const senha = senhaLimiteEstoque?.value || '';
    const ocupados = estadoEstoqueKit.vendidos + estadoEstoqueKit.reservados;

    if (!Number.isInteger(novoLimite) || novoLimite < 0 || novoLimite > 999) {
        statusLimiteEstoque.textContent = 'Informe um número inteiro entre 0 e 999.';
        statusLimiteEstoque.style.color = '#b63a32';
        return;
    }
    if (novoLimite < ocupados) {
        statusLimiteEstoque.textContent = `O limite mínimo agora é ${ocupados}, considerando vendas e reservas.`;
        statusLimiteEstoque.style.color = '#b63a32';
        return;
    }
    if (!senha) {
        statusLimiteEstoque.textContent = 'Digite a senha do painel para confirmar.';
        statusLimiteEstoque.style.color = '#b63a32';
        senhaLimiteEstoque?.focus();
        return;
    }
    if (novoLimite === estadoEstoqueKit.limite) {
        statusLimiteEstoque.textContent = 'O limite informado já está em uso.';
        statusLimiteEstoque.style.color = '#6f7077';
        return;
    }
    if (!confirm(`Confirma a alteração do limite de ${estadoEstoqueKit.limite} para ${novoLimite}?`)) return;

    const textoOriginal = btnSalvarLimiteEstoque?.innerHTML;
    if (btnSalvarLimiteEstoque) {
        btnSalvarLimiteEstoque.disabled = true;
        btnSalvarLimiteEstoque.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Validando...';
    }
    statusLimiteEstoque.textContent = 'Validando senha e disponibilidade no servidor...';
    statusLimiteEstoque.style.color = '#6f7077';

    try {
        const resposta = await atualizarLimiteEstoqueSeguro({ novoLimite, senha });
        const limiteSalvo = Number(resposta.data?.limite);
        statusLimiteEstoque.textContent = `Limite alterado com segurança para ${limiteSalvo}.`;
        statusLimiteEstoque.style.color = '#218653';
        if (senhaLimiteEstoque) senhaLimiteEstoque.value = '';
        if (inputLimiteEstoque) inputLimiteEstoque.value = String(limiteSalvo);
        setTimeout(() => {
            if (formLimiteEstoque) formLimiteEstoque.hidden = true;
        }, 900);
    } catch (error) {
        console.error('Erro ao alterar limite do estoque:', error);
        const codigo = String(error?.code || '');
        statusLimiteEstoque.textContent = codigo.includes('permission-denied')
            ? 'Senha incorreta. O limite não foi alterado.'
            : error?.message || 'Não foi possível alterar o limite agora.';
        statusLimiteEstoque.style.color = '#b63a32';
        senhaLimiteEstoque?.focus();
        if (senhaLimiteEstoque) senhaLimiteEstoque.select();
    } finally {
        if (btnSalvarLimiteEstoque) {
            btnSalvarLimiteEstoque.disabled = false;
            btnSalvarLimiteEstoque.innerHTML = textoOriginal;
        }
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modalEstoque && !modalEstoque.hidden) fecharModalEstoque();
});

if (btnRecuperarEmails) {
    btnRecuperarEmails.addEventListener('click', async () => {
        if (!configuracaoEmailIngresso?.ativo || !configuracaoEmailIngresso?.publicKey || !window.emailjs) {
            mostrarStatusEmailjs('Ative e salve a configuração do EmailJS antes de recuperar os envios.');
            return;
        }

        btnRecuperarEmails.disabled = true;
        const textoOriginal = btnRecuperarEmails.innerHTML;
        btnRecuperarEmails.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Verificando pendências...';
        try {
            const snapshot = await getDocs(collection(db, 'inscritos'));
            const pendentes = snapshot.docs
                .map((item) => ({ id: item.id, ...item.data() }))
                .filter((item) => item.pedidoId && item.ingressoAtivo === true && item.statusPagamento === 'approved')
                .filter((item) => item.emailIngressoStatus !== 'enviado' && !item.emailIngressoEnviadoEm)
                .filter((item) => item.nome && item.email && item.token);

            if (!pendentes.length) {
                mostrarStatusEmailjs('Não há ingressos aprovados aguardando envio.', true);
                return;
            }
            if (!confirm(`Foram encontrados ${pendentes.length} ingressos aprovados sem confirmação de envio. Deseja enviar agora?`)) return;

            window.emailjs.init(configuracaoEmailIngresso.publicKey);
            let enviados = 0;
            let falhas = 0;
            for (const item of pendentes) {
                btnRecuperarEmails.innerHTML = `<i class="ph-bold ph-envelope-simple"></i> Enviando ${enviados + falhas + 1} de ${pendentes.length}...`;
                try {
                    await window.emailjs.send(configuracaoEmailIngresso.serviceId, configuracaoEmailIngresso.templateId, {
                        to_name: item.nome,
                        to_email: item.email,
                        user_token: item.token,
                        site_url: 'https://semau.space',
                        instagram_url: 'https://www.instagram.com/semauufrrj/'
                    });
                    await updateDoc(doc(db, 'inscritos', item.id), {
                        emailIngressoStatus: 'enviado',
                        emailIngressoEnviadoEm: serverTimestamp(),
                        emailIngressoErro: deleteField(),
                        atualizadoEm: serverTimestamp()
                    });
                    enviados += 1;
                } catch (error) {
                    falhas += 1;
                    await updateDoc(doc(db, 'inscritos', item.id), {
                        emailIngressoStatus: 'falhou',
                        emailIngressoErro: String(error?.text || error?.message || 'Falha no envio').slice(0, 240),
                        atualizadoEm: serverTimestamp()
                    }).catch(() => {});
                }
                await new Promise((resolve) => setTimeout(resolve, 1100));
            }
            mostrarStatusEmailjs(`${enviados} ingresso(s) enviado(s).${falhas ? ` ${falhas} envio(s) ainda falharam.` : ''}`, falhas === 0);
            carregarListaInscritos();
        } catch (error) {
            console.error('Erro ao recuperar e-mails pendentes:', error);
            mostrarStatusEmailjs('Não foi possível concluir a recuperação dos envios.');
        } finally {
            btnRecuperarEmails.disabled = false;
            btnRecuperarEmails.innerHTML = textoOriginal;
        }
    });
}

const NOMES_LOTES = {
    social: 'Lote Social',
    primeiro: '1º Lote',
    segundo: '2º Lote'
};

const NOMES_MODALIDADES = {
    normal: 'Ingresso sem kit',
    kit: 'Ingresso com kit'
};

function pedidoComCategoriaEfetiva(pedido = {}) {
    const ajusteValido = pedido.ajusteManualCategoriaAtivo === true &&
        ['primeiro', 'segundo'].includes(pedido.loteIngressoEfetivo) &&
        ['normal', 'kit'].includes(pedido.tipoIngressoEfetivo);
    if (!ajusteValido) return pedido;
    return {
        ...pedido,
        _loteIngressoOriginal: pedido.loteIngresso,
        _nomeLoteOriginal: pedido.nomeLote,
        _tipoIngressoOriginal: pedido.tipoIngresso,
        _nomeIngressoOriginal: pedido.nomeIngresso,
        loteIngresso: pedido.loteIngressoEfetivo,
        nomeLote: pedido.nomeLoteEfetivo || NOMES_LOTES[pedido.loteIngressoEfetivo],
        tipoIngresso: pedido.tipoIngressoEfetivo,
        nomeIngresso: pedido.nomeIngressoEfetivo || NOMES_MODALIDADES[pedido.tipoIngressoEfetivo]
    };
}

const CATEGORIAS_INSCRITOS = [
    'social-kit', 'social-normal',
    'primeiro-kit', 'primeiro-normal',
    'segundo-kit', 'segundo-normal',
    'outros'
];

const NOMES_CATEGORIAS_INSCRITOS = {
    'social-kit': 'Social · com kit',
    'social-normal': 'Social · sem kit',
    'primeiro-kit': '1º lote · com kit',
    'primeiro-normal': '1º lote · sem kit',
    'segundo-kit': '2º lote · com kit',
    'segundo-normal': '2º lote · sem kit',
    outros: 'Outros / não informado'
};

function textoNormalizadoParaFiltro(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function loteNormalizadoDoInscrito(dados = {}) {
    const lote = textoNormalizadoParaFiltro(dados.loteIngresso ?? dados.lote ?? dados.nomeLote);
    if (lote === '0' || lote.includes('social')) return 'social';
    if (lote === '1' || lote.includes('primeiro') || lote.startsWith('1º') || lote.startsWith('1°')) return 'primeiro';
    if (lote === '2' || lote.includes('segundo') || lote.startsWith('2º') || lote.startsWith('2°')) return 'segundo';
    return '';
}

function tipoNormalizadoDoInscrito(dados = {}) {
    const tipo = textoNormalizadoParaFiltro(dados.tipoIngresso ?? dados.tipo ?? dados.modalidade ?? dados.nomeIngresso);
    if (tipo === 'normal' || tipo.includes('sem kit')) return 'normal';
    if (tipo === 'kit' || tipo.includes('com kit')) return 'kit';
    return '';
}

function categoriaDoInscrito(dados = {}) {
    const lote = loteNormalizadoDoInscrito(dados);
    const tipo = tipoNormalizadoDoInscrito(dados);
    return lote && tipo ? `${lote}-${tipo}` : 'outros';
}

function contagensVaziasDeInscritos() {
    return Object.fromEntries(CATEGORIAS_INSCRITOS.map(categoria => [categoria, 0]));
}

function atualizarResumoModalidades(contagens = contagensVaziasDeInscritos()) {
    document.querySelectorAll('[data-total-categoria]').forEach(elemento => {
        elemento.textContent = contagens[elemento.dataset.totalCategoria] || 0;
    });
}

function dataEmMilissegundos(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === 'function') return valor.toMillis();
    if (typeof valor.toDate === 'function') return valor.toDate().getTime();
    if (Number.isFinite(valor.seconds)) return (valor.seconds * 1000) + Math.floor((valor.nanoseconds || 0) / 1e6);
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}

function compararNomeDosCards(cardA, cardB) {
    return (cardA.dataset.nome || '').localeCompare(cardB.dataset.nome || '', 'pt-BR', { sensitivity: 'base' });
}

function ordenarCardsDaLista(cards) {
    const ordenacao = adminOrdenacaoLista?.value || 'inscricao-desc';
    return cards.sort((cardA, cardB) => {
        if (ordenacao === 'nome-asc') return compararNomeDosCards(cardA, cardB);
        if (ordenacao === 'pontos-desc') {
            const diferenca = Number(cardB.dataset.pontos || 0) - Number(cardA.dataset.pontos || 0);
            return diferenca || compararNomeDosCards(cardA, cardB);
        }

        const dataA = Number(cardA.dataset.inscricao || 0);
        const dataB = Number(cardB.dataset.inscricao || 0);
        if (!dataA && dataB) return 1;
        if (dataA && !dataB) return -1;
        const diferenca = ordenacao === 'inscricao-asc' ? dataA - dataB : dataB - dataA;
        return diferenca || compararNomeDosCards(cardA, cardB);
    });
}

function aplicarFiltrosDaLista() {
    const termo = textoNormalizadoParaFiltro(adminBuscaLista?.value);
    const categoriaSelecionada = adminFiltroModalidade?.value || 'todos';
    let visiveis = 0;
    const cards = ordenarCardsDaLista([...document.querySelectorAll('.card-aluno-lista')]);

    cards.forEach(card => containerListaInscritos?.appendChild(card));

    cards.forEach(card => {
        const correspondeBusca = !termo || textoNormalizadoParaFiltro(`${card.dataset.nome} ${card.dataset.email}`).includes(termo);
        const correspondeCategoria = categoriaSelecionada === 'todos' || card.dataset.categoria === categoriaSelecionada;
        const visivel = correspondeBusca && correspondeCategoria;
        card.style.display = visivel ? 'flex' : 'none';
        if (visivel) visiveis++;
    });

    const total = cards.length;
    if (adminListaResultado) {
        adminListaResultado.textContent = categoriaSelecionada === 'todos' && !termo
            ? `${total} ${total === 1 ? 'inscrito' : 'inscritos'} na base`
            : `${visiveis} de ${total} ${total === 1 ? 'inscrito' : 'inscritos'} exibidos`;
    }
    if (adminListaFiltroVazio) adminListaFiltroVazio.hidden = visiveis > 0 || total === 0;
}

function textoDisponivel(valor, padrao = 'Não informado') {
    const texto = String(valor ?? '').trim();
    return texto || padrao;
}

function escaparHtml(valor) {
    return String(valor ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatarDataRegistro(valor) {
    if (!valor) return 'Não registrado';
    const data = typeof valor.toDate === 'function' ? valor.toDate() : new Date(valor);
    if (Number.isNaN(data.getTime())) return 'Não registrado';
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function nomeDoLote(dados) {
    if (dados.nomeLote) return dados.nomeLote;
    return NOMES_LOTES[dados.loteIngresso] || 'Não informado';
}

function nomeDoTipo(dados) {
    return NOMES_MODALIDADES[dados.tipoIngresso]
        || textoDisponivel(dados.nomeIngresso);
}

function nomeDoStatusPagamento(status) {
    return ({
        approved: 'Aprovado', pending: 'Pendente', in_process: 'Em análise', rejected: 'Recusado',
        cancelled: 'Cancelado', expired: 'Expirado', refunded: 'Reembolsado', charged_back: 'Contestado',
        manual_review: 'Revisão manual', manual_refund_required: 'Estorno manual necessário'
    })[status] || textoDisponivel(status);
}

function nomeDoDetalhePagamento(detalhe) {
    return ({
        accredited: 'Pagamento aprovado e creditado',
        pending_waiting_payment: 'Aguardando pagamento',
        waiting_payment: 'Aguardando pagamento',
        checkout_expired: 'Checkout expirado',
        high_risk: 'Recusado por risco',
        cc_rejected_high_risk: 'Recusado por risco',
        rejected_by_issuer: 'Recusado pelo banco emissor',
        cc_rejected_duplicated_payment: 'Tentativa considerada duplicada',
        duplicated_payment: 'Tentativa considerada duplicada',
        cc_rejected_max_attempts: 'Limite de tentativas excedido',
        max_attempts_exceeded: 'Limite de tentativas excedido',
        insufficient_amount: 'Limite ou saldo insuficiente',
        cc_rejected_insufficient_amount: 'Limite ou saldo insuficiente',
        bad_filled_card_data: 'Dados do cartão incorretos'
    })[String(detalhe || '').toLowerCase()] || textoDisponivel(detalhe);
}

function renderizarProblemasDePagamento(pedidos = []) {
    if (!adminPagamentosProblemas) return;
    const agora = Date.now();
    const itens = pedidos
        .filter(pedido => ['pending', 'rejected', 'expired', 'manual_refund_required'].includes(String(pedido.status || '')))
        .sort((a, b) => dataEmMilissegundos(b.atualizadoEm || b.criadoEm) - dataEmMilissegundos(a.atualizadoEm || a.criadoEm))
        .slice(0, 10);
    if (!itens.length) {
        adminPagamentosProblemas.innerHTML = '<p style="margin:0;color:#718078;font-size:12px;">Nenhuma tentativa recente precisa de atenção.</p>';
        return;
    }
    adminPagamentosProblemas.innerHTML = itens.map(pedido => {
        const expiraEm = Number(pedido.checkoutExpiraEm || pedido.reservaExpiraEm || 0);
        const status = pedido.status === 'pending' && expiraEm && expiraEm <= agora ? 'Pendente vencido' : nomeDoStatusPagamento(pedido.status);
        return `<article class="pagamento-problema"><strong>${escaparHtml(textoDisponivel(pedido.nome, 'Comprador sem nome'))} · ${escaparHtml(status)}</strong><span>${escaparHtml(textoDisponivel(pedido.email, 'E-mail não informado'))} · ${escaparHtml(nomeDoDetalhePagamento(pedido.paymentStatusDetail))}</span></article>`;
    }).join('');
}

onSnapshot(doc(db, 'configuracoes', 'estoqueIngressos'), snapshot => {
    const segundo = snapshot.data()?.segundo || {};
    const vendidos = Math.max(0, Number(segundo.kitVendidos) || 0);
    const limite = Math.max(0, Number(segundo.kitLimite) || 70);
    const reservados = Object.values(segundo.reservas || {}).filter(reserva => Number(reserva?.expiraEm || 0) > Date.now()).length;
    const disponiveis = Math.max(0, limite - vendidos - reservados);
    estadoEstoqueKit = { vendidos, limite, reservados };
    if (estoqueKitVendidos) estoqueKitVendidos.textContent = vendidos;
    if (estoqueKitLimite) estoqueKitLimite.textContent = limite;
    if (estoqueResumoVendidos) estoqueResumoVendidos.textContent = vendidos;
    if (estoqueResumoLimite) estoqueResumoLimite.textContent = limite;
    if (inputLimiteEstoque) inputLimiteEstoque.min = String(vendidos + reservados);
    if (estoqueKitStatus) estoqueKitStatus.textContent = disponiveis > 0
        ? `${disponiveis} ingresso${disponiveis === 1 ? '' : 's'} ${disponiveis === 1 ? 'disponível' : 'disponíveis'}${reservados ? ` · ${reservados} em reserva temporária` : ''}.`
        : 'Esgotado. A compra com kit está bloqueada automaticamente.';
    if (estoqueKitSegundo) estoqueKitSegundo.dataset.esgotado = String(disponiveis <= 0);
}, () => {
    if (estoqueKitStatus) estoqueKitStatus.textContent = 'Não foi possível consultar o estoque agora.';
    if (estoqueResumoVendidos) estoqueResumoVendidos.textContent = '—';
    if (estoqueResumoLimite) estoqueResumoLimite.textContent = '—';
});

function nomeDoStatusEmail(status) {
    return ({ enviado: 'Enviado', enviando: 'Enviando', falhou: 'Falhou' })[status] || 'Ainda não enviado';
}
function adicionarCampoFicha(container, rotulo, valor, opcoes = {}) {
    const campo = document.createElement(opcoes.editavel ? 'label' : 'div');
    campo.className = `ficha-campo${opcoes.largo ? ' ficha-campo-largo' : ''}`;
    const legenda = document.createElement('span');
    legenda.textContent = rotulo;

    if (opcoes.editavel) {
        const entrada = opcoes.opcoes ? document.createElement('select') : document.createElement('input');
        entrada.dataset.campo = opcoes.campo;
        entrada.value = String(valor ?? '');
        if (!opcoes.opcoes) {
            entrada.type = opcoes.tipo || 'text';
            if (opcoes.placeholder) entrada.placeholder = opcoes.placeholder;
            if (opcoes.autocomplete) entrada.autocomplete = opcoes.autocomplete;
        } else {
            opcoes.opcoes.forEach(item => {
                const option = document.createElement('option');
                option.value = item.valor;
                option.textContent = item.rotulo;
                entrada.appendChild(option);
            });
            entrada.value = String(valor ?? '');
        }
        if (opcoes.obrigatorio) entrada.required = true;
        campo.append(legenda, entrada);
        container.appendChild(campo);
        return;
    }

    const conteudo = document.createElement('strong');
    conteudo.textContent = textoDisponivel(valor);
    if (opcoes.token) conteudo.classList.add('ficha-token');
    campo.append(legenda, conteudo);
    container.appendChild(campo);
}

function atualizarCamposVinculoFicha() {
    const seletorVinculo = formFichaInscrito?.querySelector('[data-campo="vinculoAcademico"]');
    const semVinculo = seletorVinculo?.value === 'sem_vinculo';
    ['instituicao', 'matricula', 'curso', 'periodo'].forEach(campo => {
        const entrada = formFichaInscrito?.querySelector(`[data-campo="${campo}"]`);
        if (!entrada) return;
        entrada.disabled = semVinculo;
        entrada.closest('.ficha-campo').hidden = semVinculo;
    });
    ['escolaridade', 'profissao', 'comoConheceu'].forEach(campo => {
        const entrada = formFichaInscrito?.querySelector(`[data-campo="${campo}"]`);
        if (!entrada) return;
        entrada.disabled = !semVinculo;
        entrada.closest('.ficha-campo').hidden = !semVinculo;
    });
}

function atualizarSegurancaCategoriaFicha() {
    if (!formFichaInscrito || !fichaAjusteCategoria) return;
    const pedidoPago = formFichaInscrito.dataset.pedidoPago === 'true';
    const loteAtual = valorEditavelFicha('loteIngresso');
    const tipoAtual = valorEditavelFicha('tipoIngresso');
    const alterou = pedidoPago && (
        loteAtual !== formFichaInscrito.dataset.loteInicial ||
        tipoAtual !== formFichaInscrito.dataset.tipoInicial
    );
    fichaAjusteCategoria.hidden = !alterou;
    if (fichaSenhaCategoria) fichaSenhaCategoria.required = alterou;
    if (!alterou && fichaSenhaCategoria) fichaSenhaCategoria.value = '';
}

function renderizarOficinasFicha(oficinasSelecionadas = []) {
    if (!fichaOficinas) return;
    const selecionadas = new Set(Array.isArray(oficinasSelecionadas) ? oficinasSelecionadas.map(String) : []);
    fichaOficinas.replaceChildren();

    Object.keys(catalogoOficinasAdmin).sort().forEach(idOficina => {
        const oficina = dadosOficina(idOficina);
        const opcao = document.createElement('label');
        opcao.className = 'ficha-oficina-opcao';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = idOficina;
        checkbox.dataset.fichaOficina = '';
        checkbox.checked = selecionadas.has(idOficina);
        checkbox.addEventListener('change', () => {
            const acao = checkbox.checked ? 'INSCREVER o participante em' : 'REMOVER o participante de';
            if (!confirm(`Tem certeza que deseja ${acao} ${rotuloOficina(idOficina)}?`)) {
                checkbox.checked = !checkbox.checked;
            }
        });

        const textos = document.createElement('span');
        const titulo = document.createElement('strong');
        titulo.textContent = `${idOficina} · ${oficina.titulo}`;
        const detalhes = document.createElement('small');
        detalhes.textContent = `${oficina.data} · ${oficina.ministrante}`;
        textos.append(titulo, detalhes);
        opcao.append(checkbox, textos);
        fichaOficinas.appendChild(opcao);
    });
}

function abrirFichaInscrito(idInscrito) {
    const dados = inscritosPorId.get(idInscrito);
    if (!dados || !modalFichaInscrito) return;
    const pedidoPago = dados._pedido?.status === 'approved';
    const loteExibido = pedidoPago ? dados._pedido.loteIngresso : dados.loteIngresso;
    const tipoExibido = pedidoPago ? dados._pedido.tipoIngresso : dados.tipoIngresso;

    idFichaInscritoAtual = idInscrito;
    modalFichaNome.textContent = textoDisponivel(dados.nome, 'Inscrito sem nome');
    if (fichaStatus) {
        fichaStatus.textContent = '';
        fichaStatus.style.color = '';
    }
    fichaDadosPessoais.replaceChildren();
    fichaDadosIngresso.replaceChildren();
    fichaDadosEvento.replaceChildren();
    formFichaInscrito.dataset.pedidoPago = String(pedidoPago);
    formFichaInscrito.dataset.loteInicial = loteExibido || '';
    formFichaInscrito.dataset.tipoInicial = tipoExibido || '';
    if (fichaSenhaCategoria) fichaSenhaCategoria.value = '';
    if (fichaMotivoCategoria) fichaMotivoCategoria.value = dados._pedido?.ajusteManualMotivo || '';
    renderizarOficinasFicha(dados.oficinas);

    adicionarCampoFicha(fichaDadosPessoais, 'Nome completo', dados.nome, { editavel: true, campo: 'nome', largo: true, obrigatorio: true, autocomplete: 'name' });
    adicionarCampoFicha(fichaDadosPessoais, 'E-mail', dados.email, { editavel: true, campo: 'email', tipo: 'email', largo: true, obrigatorio: true, autocomplete: 'email' });
    adicionarCampoFicha(fichaDadosPessoais, 'Telefone', dados.telefone, { editavel: true, campo: 'telefone', tipo: 'tel', autocomplete: 'tel' });
    adicionarCampoFicha(fichaDadosPessoais, 'Vínculo acadêmico', dados.semVinculoAcademico === true ? 'sem_vinculo' : 'academico', {
        editavel: true,
        campo: 'vinculoAcademico',
        largo: true,
        opcoes: [
            { valor: 'academico', rotulo: 'Possui vínculo acadêmico' },
            { valor: 'sem_vinculo', rotulo: 'Não possui vínculo acadêmico atualmente' }
        ]
    });
    adicionarCampoFicha(fichaDadosPessoais, 'Instituição', dados.instituicao, { editavel: true, campo: 'instituicao' });
    adicionarCampoFicha(fichaDadosPessoais, 'Matrícula', dados.matricula, { editavel: true, campo: 'matricula' });
    adicionarCampoFicha(fichaDadosPessoais, 'Curso', dados.curso, { editavel: true, campo: 'curso' });
    adicionarCampoFicha(fichaDadosPessoais, 'Período', dados.periodo, { editavel: true, campo: 'periodo' });
    adicionarCampoFicha(fichaDadosPessoais, 'Escolaridade', dados.escolaridade, {
        editavel: true,
        campo: 'escolaridade',
        opcoes: [
            { valor: '', rotulo: 'Não informada' },
            { valor: 'fundamental', rotulo: 'Ensino fundamental' },
            { valor: 'medio', rotulo: 'Ensino médio' },
            { valor: 'tecnico', rotulo: 'Ensino técnico' },
            { valor: 'graduacao_incompleta', rotulo: 'Graduação incompleta' },
            { valor: 'graduacao_completa', rotulo: 'Graduação completa' },
            { valor: 'especializacao', rotulo: 'Especialização / pós-graduação' },
            { valor: 'mestrado', rotulo: 'Mestrado' },
            { valor: 'doutorado', rotulo: 'Doutorado' },
            { valor: 'nao_informar', rotulo: 'Prefere não informar' }
        ]
    });
    adicionarCampoFicha(fichaDadosPessoais, 'Profissão ou área de atuação', dados.profissao, { editavel: true, campo: 'profissao', largo: true });
    adicionarCampoFicha(fichaDadosPessoais, 'Como conheceu a SEMAU', dados.comoConheceu, {
        editavel: true,
        campo: 'comoConheceu',
        largo: true,
        opcoes: [
            { valor: '', rotulo: 'Não informado' },
            { valor: 'instagram', rotulo: 'Instagram da SEMAU' },
            { valor: 'indicacao', rotulo: 'Indicação de amigo(a) ou colega' },
            { valor: 'professor_instituicao', rotulo: 'Professor(a) ou instituição de ensino' },
            { valor: 'outra_edicao', rotulo: 'Já participou de outra edição' },
            { valor: 'parceiro', rotulo: 'Parceiro, patrocinador ou apoiador' },
            { valor: 'pesquisa_internet', rotulo: 'Pesquisa na internet' },
            { valor: 'outro', rotulo: 'Outra forma' }
        ]
    });
    formFichaInscrito.querySelector('[data-campo="vinculoAcademico"]')?.addEventListener('change', atualizarCamposVinculoFicha);
    atualizarCamposVinculoFicha();
    adicionarCampoFicha(fichaDadosPessoais, 'Lote', loteExibido, {
        editavel: true,
        campo: 'loteIngresso',
        opcoes: [
            { valor: '', rotulo: 'Não informado' },
            ...(!pedidoPago ? [{ valor: 'social', rotulo: NOMES_LOTES.social }] : []),
            { valor: 'primeiro', rotulo: NOMES_LOTES.primeiro },
            { valor: 'segundo', rotulo: NOMES_LOTES.segundo }
        ],
        obrigatorio: pedidoPago
    });
    adicionarCampoFicha(fichaDadosPessoais, 'Modalidade', tipoExibido, {
        editavel: true,
        campo: 'tipoIngresso',
        opcoes: [
            { valor: '', rotulo: 'Não informada' },
            { valor: 'normal', rotulo: NOMES_MODALIDADES.normal },
            { valor: 'kit', rotulo: NOMES_MODALIDADES.kit }
        ],
        obrigatorio: pedidoPago
    });
    formFichaInscrito.querySelector('[data-campo="loteIngresso"]')?.addEventListener('change', atualizarSegurancaCategoriaFicha);
    formFichaInscrito.querySelector('[data-campo="tipoIngresso"]')?.addEventListener('change', atualizarSegurancaCategoriaFicha);
    atualizarSegurancaCategoriaFicha();

    adicionarCampoFicha(fichaDadosIngresso, 'Token', dados.token, { token: true });
    adicionarCampoFicha(fichaDadosIngresso, 'Pagamento', nomeDoStatusPagamento(dados.statusPagamento));
    adicionarCampoFicha(fichaDadosIngresso, 'Detalhe do pagamento', nomeDoDetalhePagamento(dados.paymentStatusDetail));
    adicionarCampoFicha(fichaDadosIngresso, 'E-mail do ingresso', nomeDoStatusEmail(dados.emailIngressoStatus));
    adicionarCampoFicha(fichaDadosIngresso, 'E-mail enviado em', formatarDataRegistro(dados.emailIngressoEnviadoEm));
    adicionarCampoFicha(fichaDadosIngresso, 'Ingresso ativo', dados.ingressoAtivo === false ? 'Não' : dados.ingressoAtivo === true ? 'Sim' : 'Não informado');
    adicionarCampoFicha(fichaDadosIngresso, 'Origem', dados.pedidoId ? 'Compra pelo site' : 'Cadastro manual');
    if (dados._pedido?.ajusteManualCategoriaAtivo === true) {
        const compraOriginal = `${NOMES_LOTES[dados._pedido._loteIngressoOriginal] || textoDisponivel(dados._pedido._nomeLoteOriginal)} · ${NOMES_MODALIDADES[dados._pedido._tipoIngressoOriginal] || textoDisponivel(dados._pedido._nomeIngressoOriginal)}`;
        adicionarCampoFicha(fichaDadosIngresso, 'Compra original no Mercado Pago', compraOriginal, { largo: true });
        adicionarCampoFicha(fichaDadosIngresso, 'Ajuste autorizado', textoDisponivel(dados._pedido.ajusteManualMotivo, 'Modalidade alterada pela organização'), { largo: true });
    }
    adicionarCampoFicha(fichaDadosIngresso, 'ID do pedido', dados.pedidoId, { largo: true });
    adicionarCampoFicha(fichaDadosIngresso, 'ID do pagamento', dados.paymentId, { largo: true });

    const presencasConfirmadas = TURNOS_PRESENCA.filter(turno => dados[turno] === true);
    const porcentagem = Math.round((presencasConfirmadas.length / TURNOS_PRESENCA.length) * 100);
    fichaResumoPresenca.replaceChildren();
    const legendaPresenca = document.createElement('span');
    legendaPresenca.textContent = 'Presença confirmada';
    const valorPresenca = document.createElement('strong');
    valorPresenca.textContent = `${porcentagem}% (${presencasConfirmadas.length}/${TURNOS_PRESENCA.length})`;
    fichaResumoPresenca.append(legendaPresenca, valorPresenca);

    adicionarCampoFicha(fichaDadosEvento, 'Turnos presentes', presencasConfirmadas.map(turno => NOMES_TURNOS[turno]).join(' · ') || 'Nenhum', { largo: true });
    const oficinasComPresenca = Array.isArray(dados.oficinasPresenca) ? dados.oficinasPresenca : [];
    adicionarCampoFicha(fichaDadosEvento, 'Presenças em oficinas', oficinasComPresenca.length ? oficinasComPresenca.map(rotuloOficina).join(' · ') : 'Nenhuma', { largo: true });
    adicionarCampoFicha(fichaDadosEvento, 'Cadastro criado em', formatarDataRegistro(dados.criadoEm));
    adicionarCampoFicha(fichaDadosEvento, 'Última atualização', formatarDataRegistro(dados.atualizadoEm));

    focoAntesDaFicha = document.activeElement;
    modalFichaInscrito.hidden = false;
    document.documentElement.classList.add('ficha-modal-aberta');
    document.body.classList.add('ficha-modal-aberta');
    btnFecharFicha?.focus();
}

function fecharFichaInscrito() {
    if (!modalFichaInscrito || modalFichaInscrito.hidden) return;
    modalFichaInscrito.hidden = true;
    document.documentElement.classList.remove('ficha-modal-aberta');
    document.body.classList.remove('ficha-modal-aberta');
    idFichaInscritoAtual = null;
    focoAntesDaFicha?.focus?.();
}

btnFecharFicha?.addEventListener('click', fecharFichaInscrito);
btnCancelarFicha?.addEventListener('click', fecharFichaInscrito);
modalFichaInscrito?.addEventListener('click', event => {
    if (event.target === modalFichaInscrito) fecharFichaInscrito();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modalFichaInscrito && !modalFichaInscrito.hidden) fecharFichaInscrito();
});

function valorEditavelFicha(campo) {
    return formFichaInscrito?.querySelector(`[data-campo="${campo}"]`)?.value.trim() || '';
}

function atribuirCampoOpcional(atualizacao, campo, valor) {
    atualizacao[campo] = valor || deleteField();
}

formFichaInscrito?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!idFichaInscritoAtual || !formFichaInscrito.reportValidity()) return;

    const nome = valorEditavelFicha('nome');
    const email = valorEditavelFicha('email').toLowerCase();
    const loteIngresso = valorEditavelFicha('loteIngresso');
    const tipoIngresso = valorEditavelFicha('tipoIngresso');
    const semVinculoAcademico = valorEditavelFicha('vinculoAcademico') === 'sem_vinculo';
    const idInscrito = idFichaInscritoAtual;
    const dadosAtuais = inscritosPorId.get(idInscrito) || {};
    const pedidoPago = dadosAtuais._pedido?.status === 'approved';
    const categoriaPagamentoAlterada = pedidoPago && (
        loteIngresso !== (dadosAtuais._pedido?.loteIngresso || '') ||
        tipoIngresso !== (dadosAtuais._pedido?.tipoIngresso || '')
    );
    const senhaCategoria = fichaSenhaCategoria?.value || '';
    const motivoCategoria = fichaMotivoCategoria?.value.trim() || '';
    if (categoriaPagamentoAlterada && !senhaCategoria) {
        atualizarSegurancaCategoriaFicha();
        if (fichaStatus) {
            fichaStatus.textContent = 'Confirme a senha do painel para alterar o lote ou a modalidade.';
            fichaStatus.style.color = '#b66b22';
        }
        fichaSenhaCategoria?.focus();
        return;
    }
    if (categoriaPagamentoAlterada && !confirm('Confirma a alteração do lote/modalidade? O estoque será atualizado e a compra original do Mercado Pago será preservada no histórico.')) {
        return;
    }
    const oficinas = fichaOficinas
        ? [...fichaOficinas.querySelectorAll('[data-ficha-oficina]:checked')].map(campo => campo.value)
        : [];

    const atualizacao = {
        nome,
        email,
        semVinculoAcademico,
        oficinas,
        atualizadoEm: serverTimestamp()
    };

    ['telefone'].forEach(campo => {
        atribuirCampoOpcional(atualizacao, campo, valorEditavelFicha(campo));
    });
    const camposAcademicos = ['instituicao', 'matricula', 'curso', 'periodo'];
    const camposNaoAcademicos = ['escolaridade', 'profissao', 'comoConheceu'];
    camposAcademicos.forEach(campo => {
        atualizacao[campo] = semVinculoAcademico ? deleteField() : (valorEditavelFicha(campo) || deleteField());
    });
    camposNaoAcademicos.forEach(campo => {
        atualizacao[campo] = semVinculoAcademico ? (valorEditavelFicha(campo) || deleteField()) : deleteField();
    });
    if (!pedidoPago) {
        atribuirCampoOpcional(atualizacao, 'loteIngresso', loteIngresso);
        atribuirCampoOpcional(atualizacao, 'nomeLote', NOMES_LOTES[loteIngresso] || '');
        atribuirCampoOpcional(atualizacao, 'tipoIngresso', tipoIngresso);
        atribuirCampoOpcional(atualizacao, 'nomeIngresso', NOMES_MODALIDADES[tipoIngresso] || '');
    }

    const textoOriginal = btnSalvarFicha?.innerHTML || 'Salvar alterações';
    if (btnSalvarFicha) {
        btnSalvarFicha.disabled = true;
        btnSalvarFicha.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Salvando...';
    }
    if (fichaStatus) {
        fichaStatus.textContent = 'Salvando os dados...';
        fichaStatus.style.color = '#6f7077';
    }

    try {
        if (categoriaPagamentoAlterada) {
            await atualizarCategoriaIngressoSeguro({
                inscritoId: idInscrito,
                loteIngresso,
                tipoIngresso,
                senha: senhaCategoria,
                motivo: motivoCategoria
            });
        }
        await updateDoc(doc(db, 'inscritos', idInscrito), atualizacao);
        await carregarListaInscritos();
        abrirFichaInscrito(idInscrito);
        if (fichaStatus) {
            fichaStatus.textContent = 'Dados atualizados com sucesso.';
            fichaStatus.style.color = '#218653';
        }
    } catch (error) {
        console.error('Erro ao atualizar a ficha:', error);
        if (fichaStatus) {
            fichaStatus.textContent = error?.message || 'Não foi possível salvar. Tente novamente.';
            fichaStatus.style.color = '#b63a32';
        }
    } finally {
        if (btnSalvarFicha) {
            btnSalvarFicha.disabled = false;
            btnSalvarFicha.innerHTML = textoOriginal;
        }
    }
});

async function carregarListaInscritos() {
    if (!containerListaInscritos) return;
    
    // Novo estado de carregamento elegante
    containerListaInscritos.innerHTML = '<div style="text-align:center; padding: 40px 20px; background: #fff; border-radius: 20px; border: 1px solid #e8e8eb;"><p style="color: #888; font-size: 14px; font-weight: 600; margin:0;"><i class="ph-bold ph-hourglass-high" style="margin-right: 8px;"></i> Carregando base de dados...</p></div>';
    dadosParaExcel = [];
    inscritosPorId.clear();
    pedidosPorId.clear();
    atualizarResumoModalidades();

    try {
        const [querySnapshot, pedidosSnapshot] = await Promise.all([
            getDocs(collection(db, "inscritos")),
            getDocs(collection(db, "pedidos"))
        ]);
        const pedidos = pedidosSnapshot.docs.map(documento => pedidoComCategoriaEfetiva({ id: documento.id, ...documento.data() }));
        pedidos.forEach(pedido => pedidosPorId.set(pedido.id, pedido));
        renderizarProblemasDePagamento(pedidos);
        
        if (querySnapshot.empty) {
            containerListaInscritos.innerHTML = '<div style="text-align:center; padding: 40px 20px; background: #fff; border-radius: 20px; border: 1px dashed #e8e8eb;"><i class="ph-bold ph-users-slash" style="font-size: 32px; color: #ccc; margin-bottom: 12px; display: block;"></i><p style="color: #888; font-weight: 600; font-size: 14px; margin:0;">Nenhum inscrito encontrado.</p></div>';
            if(dashTotal) dashTotal.textContent = "0";
            if (adminListaResultado) adminListaResultado.textContent = 'Nenhum inscrito na base';
            return;
        }

        containerListaInscritos.innerHTML = ''; 
        let totalInscritos = 0;
        const contagensModalidades = contagensVaziasDeInscritos();

        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const pedido = pedidosPorId.get(dados.pedidoId || docSnap.id);
            const dadosAutoritativos = pedido?.status === 'approved'
                ? { ...dados, loteIngresso: pedido.loteIngresso, nomeLote: pedido.nomeLote, tipoIngresso: pedido.tipoIngresso, nomeIngresso: pedido.nomeIngresso }
                : dados;
            const categoria = categoriaDoInscrito(dadosAutoritativos);
            inscritosPorId.set(docSnap.id, {
                id: docSnap.id,
                ...dados,
                _pedido: pedido || null,
                paymentStatusDetail: pedido?.paymentStatusDetail || dados.paymentStatusDetail || null
            });
            totalInscritos++;
            contagensModalidades[categoria]++;
            const nomeSeguro = textoDisponivel(dados.nome, 'Inscrito sem nome');
            const emailSeguro = textoDisponivel(dados.email, 'E-mail não informado');
            const tokenSeguro = textoDisponivel(dados.token, '-----');
            const pontos = Math.max(0, Number(dados.pontos) || 0);
            const dataInscricao = dataEmMilissegundos(dados.criadoEm);
            const emailJaEnviado = dados.emailIngressoStatus === 'enviado' || Boolean(dados.emailIngressoEnviadoEm);
            
            let presencasConfirmadas = 0;
            TURNOS_PRESENCA.forEach(t => { if(dados[t] === true) presencasConfirmadas++; });

            const porcentagem = Math.round((presencasConfirmadas / TURNOS_PRESENCA.length) * 100);
            const corPorcentagem = porcentagem >= 75 ? '#2ecc71' : '#e06d53';
            const oficinasFormatadas = dados.oficinas && dados.oficinas.length > 0 ? dados.oficinas.join(' | ') : 'Nenhuma';
            
            dadosParaExcel.push({
                "Nome Completo": dados.nome, "E-mail": dados.email, "Token": dados.token, "Pontos": pontos,
                "Oficinas Inscritas": oficinasFormatadas, "Presença (%)": porcentagem + "%",
                "21/Set (Manhã)": dados.d21_m ? "Presente" : "Falta", "21/Set (Tarde)": dados.d21_t ? "Presente" : "Falta",
                "22/Set (Manhã)": dados.d22_m ? "Presente" : "Falta",
                "23/Set (Manhã)": dados.d23_m ? "Presente" : "Falta", "23/Set (Tarde)": dados.d23_t ? "Presente" : "Falta",
                "24/Set (Manhã)": dados.d24_m ? "Presente" : "Falta",
                "25/Set (Manhã)": dados.d25_m ? "Presente" : "Falta"
            });

            // NOVO HTML DO CARTÃO - Estilo Minimalista
            const cardHTML = `
                <div class="card-aluno-lista" data-inscrito-id="${escaparHtml(docSnap.id)}" data-nome="${escaparHtml(nomeSeguro.toLowerCase())}" data-email="${escaparHtml(emailSeguro.toLowerCase())}" data-categoria="${categoria}" data-pontos="${pontos}" data-inscricao="${dataInscricao}" style="background: #fff; border: 1px solid #e8e8eb; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: var(--cor-primaria); line-height: 1.2; word-break: break-word;">${escaparHtml(nomeSeguro)}</p>
                        <button class="btn-excluir" style="background: #fffaf9; border: 1px solid #ffebeb; color: #e06d53; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; transition: 0.2s;" title="Excluir Aluno">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                    <span class="inscrito-categoria${categoria === 'outros' ? ' inscrito-categoria-outros' : ''}">${NOMES_CATEGORIAS_INSCRITOS[categoria]}</span>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-envelope-simple"></i> ${escaparHtml(emailSeguro)}</p>
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-key"></i> Token: <strong style="color: var(--cor-secundaria); font-family: var(--fonte-textos); letter-spacing: 2px;">${escaparHtml(tokenSeguro)}</strong></p>
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-star"></i> Pontos: <strong style="color: var(--cor-primaria); font-family: var(--fonte-textos);">${pontos}</strong></p>
                    </div>
                    
                    <div style="background: #f9f9fb; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #f0f0f5;">
                        <span style="font-size: 13px; font-weight: 600; color: #888;">📊 Presença</span>
                        <strong style="color: ${corPorcentagem}; font-size: 14px;">${porcentagem}% <span style="font-size: 11px; opacity: 0.6; font-weight: 600;">(${presencasConfirmadas}/${TURNOS_PRESENCA.length})</span></strong>
                    </div>
                    
                    <button type="button" class="btn-ficha-inscrito" data-inscrito-id="${docSnap.id}">
                        <i class="ph-bold ph-identification-card"></i> Ver ficha completa
                    </button>
                    <button type="button" id="btn-email-${escaparHtml(docSnap.id)}" class="btn-email-inscrito${emailJaEnviado ? ' btn-email-reenviar' : ''}" data-inscrito-id="${escaparHtml(docSnap.id)}">
                        <i class="ph-bold ${emailJaEnviado ? 'ph-arrow-clockwise' : 'ph-paper-plane-tilt'}"></i> ${emailJaEnviado ? 'Enviar novamente' : 'Enviar ingresso'}
                    </button>
                </div>
            `;
            containerListaInscritos.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        if (dashTotal) dashTotal.textContent = totalInscritos;
        atualizarResumoModalidades(contagensModalidades);
        aplicarFiltrosDaLista();

    } catch (error) {
        containerListaInscritos.innerHTML = '<p style="color: #e06d53; text-align:center; font-weight: bold;">Erro ao carregar a lista.</p>';
    }
}

// ==========================================
// 7. EVENTOS GERAIS
// ==========================================
if (btnExportarExcel) {
    btnExportarExcel.addEventListener('click', () => {
        if (dadosParaExcel.length === 0) return alert("Não há dados para exportar.");
        const cabecalhos = Object.keys(dadosParaExcel[0]).join(";");
        const linhas = dadosParaExcel.map(linha => Object.values(linha).map(valor => `"${valor}"`).join(";")).join("\n");
        const csvContent = "\uFEFF" + cabecalhos + "\n" + linhas;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "XVI_SEMAU_Relatorio.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

if (adminBuscaLista) {
    adminBuscaLista.addEventListener('input', aplicarFiltrosDaLista);
}

adminFiltroModalidade?.addEventListener('change', aplicarFiltrosDaLista);
adminOrdenacaoLista?.addEventListener('change', aplicarFiltrosDaLista);

if (containerListaInscritos) {
    containerListaInscritos.addEventListener('click', async (e) => {
        const btnFicha = e.target.closest('.btn-ficha-inscrito');
        if (btnFicha) {
            abrirFichaInscrito(btnFicha.dataset.inscritoId);
            return;
        }

        const btnEmail = e.target.closest('.btn-email-inscrito');
        if (btnEmail) {
            const idInscrito = btnEmail.dataset.inscritoId;
            const dados = inscritosPorId.get(idInscrito);
            if (dados) window.dispararEmail(idInscrito, dados.nome, dados.email, dados.token);
            return;
        }

        const btnClicado = e.target.closest('.btn-excluir');
        if (btnClicado) {
            const cardPai = btnClicado.closest('.card-aluno-lista');
            const idDocumento = cardPai.dataset.inscritoId;
            
            if (confirm("🚨 ATENÇÃO: Tem certeza que deseja EXCLUIR este inscrito permanentemente?")) {
                try {
                    await deleteDoc(doc(db, "inscritos", idDocumento));
                    carregarListaInscritos(); 
                } catch (error) { alert("Erro ao excluir do banco de dados."); }
            }
        }
    });
}

// EMAIL JS - COM ESTADOS VISUAIS NOVOS
window.dispararEmail = function(idBotao, nomeAluno, emailAluno, tokenAluno) {
    const botao = document.getElementById(`btn-email-${idBotao}`);
    const dadosAntesDoEnvio = inscritosPorId.get(idBotao);
    const jaEnviadoAntes = dadosAntesDoEnvio?.emailIngressoStatus === 'enviado' || Boolean(dadosAntesDoEnvio?.emailIngressoEnviadoEm);
    if (!configuracaoEmailIngresso?.publicKey || !configuracaoEmailIngresso?.serviceId || !configuracaoEmailIngresso?.templateId || !window.emailjs) {
        alert('Configure o EmailJS na aba de configurações antes de enviar o ingresso.');
        return;
    }

    window.emailjs.init(configuracaoEmailIngresso.publicKey);
    if(botao) {
        botao.disabled = true;
        botao.style.backgroundColor = "#f4f5f7";
        botao.style.color = "#888";
        botao.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Enviando...';
    }

    const parametros = { to_name: nomeAluno, to_email: emailAluno, user_token: tokenAluno };

    window.emailjs.send(configuracaoEmailIngresso.serviceId, configuracaoEmailIngresso.templateId, parametros)
        .then(async function() {
            if(botao){
                botao.disabled = false;
                botao.style.removeProperty('background-color');
                botao.style.removeProperty('color');
                botao.classList.add('btn-email-reenviar');
                botao.innerHTML = '<i class="ph-bold ph-arrow-clockwise"></i> Enviar novamente';
            }
            await updateDoc(doc(db, "inscritos", idBotao), {
                emailIngressoStatus: 'enviado',
                emailIngressoEnviadoEm: serverTimestamp(),
                emailIngressoErro: deleteField(),
                atualizadoEm: serverTimestamp()
            });
            const dadosAtuais = inscritosPorId.get(idBotao);
            if (dadosAtuais) inscritosPorId.set(idBotao, { ...dadosAtuais, emailIngressoStatus: 'enviado', emailIngressoEnviadoEm: new Date() });
        }, function(error) {
            if(botao){
                botao.disabled = false;
                botao.style.removeProperty('background-color');
                botao.style.removeProperty('color');
                botao.classList.toggle('btn-email-reenviar', jaEnviadoAntes);
                botao.innerHTML = jaEnviadoAntes
                    ? '<i class="ph-bold ph-arrow-clockwise"></i> Enviar novamente'
                    : '<i class="ph-bold ph-warning-circle"></i> Erro. Tentar de novo';
            }
            updateDoc(doc(db, "inscritos", idBotao), {
                emailIngressoStatus: 'falhou',
                emailIngressoErro: String(error?.text || error?.message || 'Falha no envio').slice(0, 240),
                atualizadoEm: serverTimestamp()
            }).catch(() => {});
            const dadosAtuais = inscritosPorId.get(idBotao);
            if (dadosAtuais) inscritosPorId.set(idBotao, { ...dadosAtuais, emailIngressoStatus: 'falhou' });
        });
}

// ==========================================
// 8. LOGIN / LOGOUT
// ==========================================
const adminLoginOverlay = document.getElementById('admin-login-overlay');
const adminSenhaInput = document.getElementById('admin-senha-input');
const btnAdminLogin = document.getElementById('btn-admin-login');

if (sessionStorage.getItem('adminLogado') === 'true') {
    if(adminLoginOverlay) adminLoginOverlay.style.display = 'none';
}

if (btnAdminLogin) {
    btnAdminLogin.addEventListener('click', async () => {
        const senhaDigitada = adminSenhaInput.value.trim();
        if (!senhaDigitada) return;

        btnAdminLogin.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Verificando...';
        btnAdminLogin.disabled = true;

        try {
            const docSnap = await getDoc(doc(db, "configuracoes", "seguranca"));
            if (docSnap.exists() && senhaDigitada === docSnap.data().senhaAdmin) {
                sessionStorage.setItem('adminLogado', 'true');
                adminLoginOverlay.style.display = 'none';
            } else {
                alert("Senha incorreta! ❌");
                adminSenhaInput.value = "";
                adminSenhaInput.focus();
            }
        } catch (error) { alert("Erro ao conectar com o banco."); } 
        finally {
            btnAdminLogin.textContent = "Acessar Painel";
            btnAdminLogin.disabled = false;
        }
    });

    adminSenhaInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdminLogin.click(); });
}

if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
        if (confirm("Deseja sair do painel?")) {
            sessionStorage.removeItem('adminLogado');
            if (adminLoginOverlay) {
                adminLoginOverlay.style.display = 'flex';
                adminSenhaInput.value = "";
            }
        }
    });
}
