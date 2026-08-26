import { db } from './firebase-config.js';
import { collection, doc, addDoc, getDocs, updateDoc, query, where, arrayUnion, arrayRemove, setDoc, onSnapshot, deleteDoc, getDoc, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const adminBuscaPax = document.getElementById('admin-busca-pax');
const btnAdminBuscar = document.getElementById('btn-admin-buscar');
const adminResultadoBusca = document.getElementById('admin-resultado-busca');
const paxNome = document.getElementById('pax-nome');
const btnAbrirCamera = document.getElementById('btn-abrir-camera');
const leitorQrcodeDiv = document.getElementById('leitor-qrcode');
let leitor = null; 

const botoesPresenca = document.querySelectorAll('.btn-presenca');
const botoesOficinaAdmin = document.querySelectorAll('.btn-oficina-admin');

const btnAdminSortear = document.getElementById('btn-admin-sortear');
const sorteioResultado = document.getElementById('sorteio-resultado');
const btnAbrirTelao = document.getElementById('btn-abrir-telao');
const statusTelao = document.getElementById('status-telao');

let idAlunoSelecionado = null;
let ultimaBuscaPorQr = false;
const INTERVALO_QR_MS = 30000;
const adminQrStatus = document.getElementById('admin-qr-status');

function interpretarConteudoQr(valor) {
    const texto = String(valor || '').trim();
    if (!texto.startsWith('SEMAU|')) return { valido: true, busca: texto.toLowerCase(), origemQr: false };
    const partes = texto.split('|');
    const token = partes[1]?.trim().toUpperCase();
    const slot = Number(partes[2]);
    const slotAtual = Math.floor(Date.now() / INTERVALO_QR_MS);
    if (!/^[A-Z0-9]{5}$/.test(token) || !Number.isInteger(slot)) return { valido: false, mensagem: 'QR Code inválido.' };
    if (Math.abs(slotAtual - slot) > 1) return { valido: false, mensagem: 'Este QR Code expirou. Peça ao participante para atualizar o ingresso.' };
    return { valido: true, busca: token.toLowerCase(), origemQr: true, geradoEm: new Date(slot * INTERVALO_QR_MS) };
}

function mostrarStatusQr(mensagem, valido) {
    if (!adminQrStatus) return;
    adminQrStatus.style.display = 'block';
    adminQrStatus.style.background = valido ? '#e9f7ee' : '#fdeceb';
    adminQrStatus.style.color = valido ? '#217a43' : '#a33a32';
    adminQrStatus.textContent = mensagem;
}

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
                d21_m: false, d21_t: false,
                d22_m: false, d22_t: false,
                d23_m: false, d23_t: false,
                d24_m: false, d24_t: false,
                d25_m: false, d25_t: false
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

if (btnAbrirCamera) {
    btnAbrirCamera.addEventListener('click', () => {
        modalCamera.style.display = 'flex';
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
        leitor.stop().then(() => { modalCamera.style.display = 'none'; }).catch(err => { modalCamera.style.display = 'none'; });
    } else {
        modalCamera.style.display = 'none';
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
            ultimaBuscaPorQr = false;
            mostrarStatusQr(leitura.mensagem, false);
            adminResultadoBusca.style.display = 'none';
            return;
        }
        const busca = leitura.busca;
        if (!busca) return;
        ultimaBuscaPorQr = leitura.origemQr;
        if (leitura.origemQr) {
            const horario = leitura.geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            mostrarStatusQr('QR válido, gerado às ' + horario + '.', true);
            adminBuscaPax.value = leitura.busca.toUpperCase();
        } else if (adminQrStatus) {
            adminQrStatus.style.display = 'none';
        }

        adminResultadoBusca.style.display = 'none';
        idAlunoSelecionado = null;

        try {
            const inscritosRef = collection(db, "inscritos");
            const querySnapshot = await getDocs(inscritosRef);
            let alunoAchado = null;

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                if (dados.email === busca || dados.token.toLowerCase() === busca) {
                    alunoAchado = { id: docSnap.id, ...dados };
                }
            });

            if (alunoAchado) {
                idAlunoSelecionado = alunoAchado.id;
                paxNome.textContent = alunoAchado.nome;
                
                botoesPresenca.forEach(botao => {
                    const campoNoBanco = botao.dataset.campo;
                    atualizarBotaoPresenca(botao, alunoAchado[campoNoBanco], alunoAchado[campoNoBanco + "_checkinEm"]);
                });

                const oficinasAtuais = alunoAchado.oficinas || [];
                botoesOficinaAdmin.forEach(botao => {
                    const idOficina = botao.dataset.oficina;
                    if (oficinasAtuais.includes(idOficina)) {
                        botao.classList.add('ativo');
                        botao.style.backgroundColor = "var(--cor-secundaria)";
                        botao.style.color = "#fff";
                        botao.style.border = "1px solid var(--cor-secundaria)";
                    } else {
                        botao.classList.remove('ativo');
                        botao.style.backgroundColor = "#f4f5f7";
                        botao.style.color = "#666";
                        botao.style.border = "1px solid #e8e8eb";
                    }
                });

                adminResultadoBusca.style.display = 'block';
            } else {
                alert("Nenhum participante encontrado.");
            }
        } catch (error) {
            console.error("Erro na busca:", error);
        }
    });
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

// ==========================================
// 3. DAR PRESENÇA E OFICINAS
// ==========================================
const togglePresenca = async (campo, botao) => {
    if (!idAlunoSelecionado) return;
    const jaTemPresenca = botao.classList.contains('confirmado');
    const novoStatus = !jaTemPresenca;
    try {
        const atualizacao = novoStatus ? {
            [campo]: true,
            [campo + '_checkinEm']: serverTimestamp(),
            [campo + '_origem']: ultimaBuscaPorQr ? 'qr_dinamico' : 'manual'
        } : {
            [campo]: false,
            [campo + '_checkinEm']: deleteField(),
            [campo + '_origem']: deleteField()
        };
        await updateDoc(doc(db, "inscritos", idAlunoSelecionado), atualizacao);
        atualizarBotaoPresenca(botao, novoStatus, novoStatus ? new Date() : null);
    } catch (error) { console.error("Erro ao atualizar presença:", error); }
};

botoesPresenca.forEach(botao => {
    botao.addEventListener('click', () => {
        const acao = botao.classList.contains('confirmado') ? "REMOVER a presença" : "CONFIRMAR a presença";
        if (confirm(`Tem certeza que deseja ${acao} neste turno?`)) {
            togglePresenca(botao.dataset.campo, botao);
        }
    });
});

botoesOficinaAdmin.forEach(botao => {
    botao.addEventListener('click', async () => {
        if (!idAlunoSelecionado) return;
        const idOficina = botao.dataset.oficina;
        const jaEstaAtivo = botao.classList.contains('ativo');
        const acao = jaEstaAtivo ? "REMOVER o aluno da" : "INSCREVER o aluno na";
        
        if (!confirm(`Tem certeza que deseja ${acao} ${idOficina}?`)) return; 

        const alunoRef = doc(db, "inscritos", idAlunoSelecionado);
        try {
            if (jaEstaAtivo) {
                await updateDoc(alunoRef, { oficinas: arrayRemove(idOficina) });
                botao.classList.remove('ativo');
                botao.style.backgroundColor = "#f4f5f7";
                botao.style.color = "#666";
                botao.style.border = "1px solid #e8e8eb";
            } else {
                await updateDoc(alunoRef, { oficinas: arrayUnion(idOficina) });
                botao.classList.add('ativo');
                botao.style.backgroundColor = "var(--cor-secundaria)";
                botao.style.color = "#fff";
                botao.style.border = "1px solid var(--cor-secundaria)";
            }
        } catch (error) { console.error("Erro:", error); }
    });
});

// ==========================================
// 4. O SORTEADOR
// ==========================================
const canalSorteio = 'BroadcastChannel' in window ? new BroadcastChannel('semau-sorteio') : null;
let janelaTelao = null;
let telaoConectado = false;

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

const selectSorteioTurno = document.getElementById('select-sorteio-turno'); 

if (btnAdminSortear) {
    btnAdminSortear.addEventListener('click', async () => {
        sorteioResultado.innerHTML = '<p style="color: #888; font-size: 14px;"><i class="ph-bold ph-hourglass-high"></i> Misturando os nomes...</p>';
        btnAdminSortear.disabled = true;
        
        const turnoEscolhido = selectSorteioTurno ? selectSorteioTurno.value : 'qualquer';

        try {
            const querySnapshot = await getDocs(collection(db, "inscritos"));
            let listaSorteaveis = [];
            
            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                let temPresenca = false;

                if (turnoEscolhido === 'qualquer') {
                    temPresenca = dados.d21_m || dados.d21_t || dados.d22_m || dados.d22_t || dados.d23_m || dados.d23_t || dados.d24_m || dados.d24_t || dados.d25_m || dados.d25_t;
                } else {
                    temPresenca = dados[turnoEscolhido] === true;
                }
                
                if (temPresenca) listaSorteaveis.push(dados.nome);
            });
            
            if (listaSorteaveis.length === 0) {
                sorteioResultado.innerHTML = `<div style="background: #fffaf9; color: #e06d53; padding: 16px; border-radius: 12px; border: 1px solid #ffebeb; font-weight: 600; font-size: 14px;"><i class="ph-bold ph-warning-circle"></i> Ninguém com presença confirmada neste turno!</div>`;
                return;
            }
            
            const ganhador = listaSorteaveis[Math.floor(Math.random() * listaSorteaveis.length)];
            const turnoTexto = selectSorteioTurno?.selectedOptions[0]?.textContent || '';
            publicarNoTelao({ tipo: 'sortear', nomes: listaSorteaveis, ganhador, turno: turnoTexto });
            sorteioResultado.innerHTML = `
                <div style="background: #f2fbf5; padding: 24px; border-radius: 16px; border: 1px solid #c3ebd2; margin-top: 10px;">
                    <p style="font-size: 12px; color: #27ae60; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;"><i class="ph-bold ph-confetti"></i> Ganhador(a)</p>
                    <strong style="font-size: 24px; color: var(--cor-primaria); font-weight: 800; word-break: break-word; line-height: 1.2;">${ganhador}</strong>
                </div>
            `;
            
        } catch (error) {
            sorteioResultado.textContent = "Erro ao sortear.";
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
const dashTotal = document.getElementById('dash-total');
const btnExportarExcel = document.getElementById('btn-exportar-excel');

let dadosParaExcel = []; 

async function carregarListaInscritos() {
    if (!containerListaInscritos) return;
    
    // Novo estado de carregamento elegante
    containerListaInscritos.innerHTML = '<div style="text-align:center; padding: 40px 20px; background: #fff; border-radius: 20px; border: 1px solid #e8e8eb;"><p style="color: #888; font-size: 14px; font-weight: 600; margin:0;"><i class="ph-bold ph-hourglass-high" style="margin-right: 8px;"></i> Carregando base de dados...</p></div>';
    dadosParaExcel = []; 
    
    try {
        const querySnapshot = await getDocs(collection(db, "inscritos"));
        
        if (querySnapshot.empty) {
            containerListaInscritos.innerHTML = '<div style="text-align:center; padding: 40px 20px; background: #fff; border-radius: 20px; border: 1px dashed #e8e8eb;"><i class="ph-bold ph-users-slash" style="font-size: 32px; color: #ccc; margin-bottom: 12px; display: block;"></i><p style="color: #888; font-weight: 600; font-size: 14px; margin:0;">Nenhum inscrito encontrado.</p></div>';
            if(dashTotal) dashTotal.textContent = "0";
            return;
        }

        containerListaInscritos.innerHTML = ''; 
        let totalInscritos = 0;

        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            totalInscritos++;
            
            const turnos = ['d21_m', 'd21_t', 'd22_m', 'd22_t', 'd23_m', 'd23_t', 'd24_m', 'd24_t', 'd25_m', 'd25_t'];
            let presencasConfirmadas = 0;
            turnos.forEach(t => { if(dados[t] === true) presencasConfirmadas++; });
            
            const porcentagem = (presencasConfirmadas / 10) * 100;
            const corPorcentagem = porcentagem >= 75 ? '#2ecc71' : '#e06d53';
            const oficinasFormatadas = dados.oficinas && dados.oficinas.length > 0 ? dados.oficinas.join(' | ') : 'Nenhuma';
            
            dadosParaExcel.push({
                "Nome Completo": dados.nome, "E-mail": dados.email, "Token": dados.token,
                "Oficinas Inscritas": oficinasFormatadas, "Presença (%)": porcentagem + "%",
                "21/Set (Manhã)": dados.d21_m ? "Presente" : "Falta", "21/Set (Tarde)": dados.d21_t ? "Presente" : "Falta",
                "22/Set (Manhã)": dados.d22_m ? "Presente" : "Falta", "22/Set (Tarde)": dados.d22_t ? "Presente" : "Falta",
                "23/Set (Manhã)": dados.d23_m ? "Presente" : "Falta", "23/Set (Tarde)": dados.d23_t ? "Presente" : "Falta",
                "24/Set (Manhã)": dados.d24_m ? "Presente" : "Falta", "24/Set (Tarde)": dados.d24_t ? "Presente" : "Falta",
                "25/Set (Manhã)": dados.d25_m ? "Presente" : "Falta", "25/Set (Tarde)": dados.d25_t ? "Presente" : "Falta"
            });

            // NOVO HTML DO CARTÃO - Estilo Minimalista
            const cardHTML = `
                <div class="card-aluno-lista" data-nome="${dados.nome.toLowerCase()}" data-email="${dados.email.toLowerCase()}" style="background: #fff; border: 1px solid #e8e8eb; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: var(--cor-primaria); line-height: 1.2; word-break: break-word;">${dados.nome}</p>
                        <button class="btn-excluir" style="background: #fffaf9; border: 1px solid #ffebeb; color: #e06d53; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; transition: 0.2s;" title="Excluir Aluno">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-envelope-simple"></i> ${dados.email}</p>
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-key"></i> Token: <strong style="color: var(--cor-secundaria); font-family: var(--fonte-textos); letter-spacing: 2px;">${dados.token}</strong></p>
                    </div>
                    
                    <div style="background: #f9f9fb; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #f0f0f5;">
                        <span style="font-size: 13px; font-weight: 600; color: #888;">📊 Presença</span>
                        <strong style="color: ${corPorcentagem}; font-size: 14px;">${porcentagem}% <span style="font-size: 11px; opacity: 0.6; font-weight: 600;">(${presencasConfirmadas}/10)</span></strong>
                    </div>
                    
                    <button id="btn-email-${docSnap.id}" onclick="window.dispararEmail('${docSnap.id}', '${dados.nome}', '${dados.email}', '${dados.token}')" style="background: var(--cor-secundaria); color: #fff; text-align: center; padding: 14px; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; display: flex; justify-content: center; align-items: center; gap: 8px;">
                        <i class="ph-bold ph-paper-plane-tilt"></i> Enviar Ingresso
                    </button>
                </div>
            `;
            containerListaInscritos.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        if (dashTotal) dashTotal.textContent = totalInscritos;

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
    adminBuscaLista.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        document.querySelectorAll('.card-aluno-lista').forEach(card => {
            const nome = card.getAttribute('data-nome');
            const email = card.getAttribute('data-email');
            card.style.display = (nome.includes(termo) || email.includes(termo)) ? 'flex' : 'none';
        });
    });
}

if (containerListaInscritos) {
    containerListaInscritos.addEventListener('click', async (e) => {
        const btnClicado = e.target.closest('.btn-excluir');
        if (btnClicado) {
            const cardPai = btnClicado.closest('.card-aluno-lista');
            const idDocumento = cardPai.querySelector(`button[id^='btn-email-']`).id.replace('btn-email-', ''); 
            
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
    
    if(botao) {
        botao.disabled = true;
        botao.style.backgroundColor = "#f4f5f7";
        botao.style.color = "#888";
        botao.innerHTML = '<i class="ph-bold ph-hourglass-high"></i> Enviando...';
    }

    const parametros = { to_name: nomeAluno, to_email: emailAluno, user_token: tokenAluno };

    emailjs.send('SEU_SERVICE_ID', 'SEU_TEMPLATE_ID', parametros)
        .then(function() {
            if(botao){
                botao.style.backgroundColor = "#2ecc71";
                botao.style.color = "#fff";
                botao.innerHTML = '<i class="ph-bold ph-check-circle"></i> Ingresso Enviado!';
            }
        }, function(error) {
            if(botao){
                botao.disabled = false;
                botao.style.backgroundColor = "#e06d53";
                botao.style.color = "#fff";
                botao.innerHTML = '<i class="ph-bold ph-warning-circle"></i> Erro. Tentar de novo';
            }
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