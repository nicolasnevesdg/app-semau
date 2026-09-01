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
const emailjsPublicKey = document.getElementById('emailjs-public-key');
const emailjsServiceId = document.getElementById('emailjs-service-id');
const emailjsTemplateId = document.getElementById('emailjs-template-id');
const toggleEmailjsAtivo = document.getElementById('toggle-emailjs-ativo');
const btnSalvarEmailjs = document.getElementById('btn-salvar-emailjs');
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

const btnAdminSortear = document.getElementById('btn-admin-sortear');
const sorteioResultado = document.getElementById('sorteio-resultado');
const btnAbrirTelao = document.getElementById('btn-abrir-telao');
const btnAbrirTelaoEvento = document.getElementById('btn-abrir-telao-evento');
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
const dashTotal = document.getElementById('dash-total');
const btnExportarExcel = document.getElementById('btn-exportar-excel');

let dadosParaExcel = [];
const inscritosPorId = new Map();
const TURNOS_PRESENCA = ['d21_m', 'd21_t', 'd22_m', 'd22_t', 'd23_m', 'd23_t', 'd24_m', 'd24_t', 'd25_m', 'd25_t'];
const NOMES_TURNOS = {
    d21_m: '21/Set · Manhã', d21_t: '21/Set · Tarde',
    d22_m: '22/Set · Manhã', d22_t: '22/Set · Tarde',
    d23_m: '23/Set · Manhã', d23_t: '23/Set · Tarde',
    d24_m: '24/Set · Manhã', d24_t: '24/Set · Tarde',
    d25_m: '25/Set · Manhã', d25_t: '25/Set · Tarde'
};

const modalFichaInscrito = document.getElementById('modal-ficha-inscrito');
const modalFichaNome = document.getElementById('modal-ficha-nome');
const btnFecharFicha = document.getElementById('btn-fechar-ficha');
const btnCancelarFicha = document.getElementById('btn-cancelar-ficha');
const btnSalvarFicha = document.getElementById('btn-salvar-ficha');
const formFichaInscrito = document.getElementById('form-ficha-inscrito');
const fichaStatus = document.getElementById('ficha-status');
const fichaDadosPessoais = document.getElementById('ficha-dados-pessoais');
const fichaDadosIngresso = document.getElementById('ficha-dados-ingresso');
const fichaResumoPresenca = document.getElementById('ficha-resumo-presenca');
const fichaDadosEvento = document.getElementById('ficha-dados-evento');
let focoAntesDaFicha = null;
let idFichaInscritoAtual = null;

// O aplicativo recebe zoom responsivo no celular. Fora desse contêiner, a camada
// fixa volta a usar a janela inteira como referência e cobre toda a tela.
if (modalFichaInscrito && modalFichaInscrito.parentElement !== document.body) {
    document.body.appendChild(modalFichaInscrito);
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
        cancelled: 'Cancelado', refunded: 'Reembolsado', charged_back: 'Contestado', manual_review: 'Revisão manual'
    })[status] || textoDisponivel(status);
}

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

function abrirFichaInscrito(idInscrito) {
    const dados = inscritosPorId.get(idInscrito);
    if (!dados || !modalFichaInscrito) return;

    idFichaInscritoAtual = idInscrito;
    modalFichaNome.textContent = textoDisponivel(dados.nome, 'Inscrito sem nome');
    if (fichaStatus) {
        fichaStatus.textContent = '';
        fichaStatus.style.color = '';
    }
    fichaDadosPessoais.replaceChildren();
    fichaDadosIngresso.replaceChildren();
    fichaDadosEvento.replaceChildren();

    adicionarCampoFicha(fichaDadosPessoais, 'Nome completo', dados.nome, { editavel: true, campo: 'nome', largo: true, obrigatorio: true, autocomplete: 'name' });
    adicionarCampoFicha(fichaDadosPessoais, 'E-mail', dados.email, { editavel: true, campo: 'email', tipo: 'email', largo: true, obrigatorio: true, autocomplete: 'email' });
    adicionarCampoFicha(fichaDadosPessoais, 'Telefone', dados.telefone, { editavel: true, campo: 'telefone', tipo: 'tel', autocomplete: 'tel' });
    adicionarCampoFicha(fichaDadosPessoais, 'Instituição', dados.instituicao, { editavel: true, campo: 'instituicao' });
    adicionarCampoFicha(fichaDadosPessoais, 'Matrícula', dados.matricula, { editavel: true, campo: 'matricula' });
    adicionarCampoFicha(fichaDadosPessoais, 'Curso', dados.curso, { editavel: true, campo: 'curso' });
    adicionarCampoFicha(fichaDadosPessoais, 'Período', dados.periodo, { editavel: true, campo: 'periodo' });
    adicionarCampoFicha(fichaDadosPessoais, 'Lote', dados.loteIngresso, {
        editavel: true,
        campo: 'loteIngresso',
        opcoes: [
            { valor: '', rotulo: 'Não informado' },
            { valor: 'social', rotulo: NOMES_LOTES.social },
            { valor: 'primeiro', rotulo: NOMES_LOTES.primeiro },
            { valor: 'segundo', rotulo: NOMES_LOTES.segundo }
        ]
    });
    adicionarCampoFicha(fichaDadosPessoais, 'Modalidade', dados.tipoIngresso, {
        editavel: true,
        campo: 'tipoIngresso',
        opcoes: [
            { valor: '', rotulo: 'Não informada' },
            { valor: 'normal', rotulo: NOMES_MODALIDADES.normal },
            { valor: 'kit', rotulo: NOMES_MODALIDADES.kit }
        ]
    });

    adicionarCampoFicha(fichaDadosIngresso, 'Token', dados.token, { token: true });
    adicionarCampoFicha(fichaDadosIngresso, 'Pagamento', nomeDoStatusPagamento(dados.statusPagamento));
    adicionarCampoFicha(fichaDadosIngresso, 'E-mail do ingresso', nomeDoStatusEmail(dados.emailIngressoStatus));
    adicionarCampoFicha(fichaDadosIngresso, 'E-mail enviado em', formatarDataRegistro(dados.emailIngressoEnviadoEm));
    adicionarCampoFicha(fichaDadosIngresso, 'Ingresso ativo', dados.ingressoAtivo === false ? 'Não' : dados.ingressoAtivo === true ? 'Sim' : 'Não informado');
    adicionarCampoFicha(fichaDadosIngresso, 'Origem', dados.pedidoId ? 'Compra pelo site' : 'Cadastro manual');
    adicionarCampoFicha(fichaDadosIngresso, 'ID do pedido', dados.pedidoId, { largo: true });
    adicionarCampoFicha(fichaDadosIngresso, 'ID do pagamento', dados.paymentId, { largo: true });

    const presencasConfirmadas = TURNOS_PRESENCA.filter(turno => dados[turno] === true);
    const porcentagem = (presencasConfirmadas.length / TURNOS_PRESENCA.length) * 100;
    fichaResumoPresenca.replaceChildren();
    const legendaPresenca = document.createElement('span');
    legendaPresenca.textContent = 'Presença confirmada';
    const valorPresenca = document.createElement('strong');
    valorPresenca.textContent = `${porcentagem}% (${presencasConfirmadas.length}/10)`;
    fichaResumoPresenca.append(legendaPresenca, valorPresenca);

    adicionarCampoFicha(fichaDadosEvento, 'Turnos presentes', presencasConfirmadas.map(turno => NOMES_TURNOS[turno]).join(' · ') || 'Nenhum', { largo: true });
    adicionarCampoFicha(fichaDadosEvento, 'Oficinas inscritas', Array.isArray(dados.oficinas) && dados.oficinas.length ? dados.oficinas.join(' · ') : 'Nenhuma', { largo: true });
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
    const idInscrito = idFichaInscritoAtual;

    const atualizacao = {
        nome,
        email,
        atualizadoEm: serverTimestamp()
    };

    ['telefone', 'instituicao', 'matricula', 'curso', 'periodo'].forEach(campo => {
        atribuirCampoOpcional(atualizacao, campo, valorEditavelFicha(campo));
    });
    atribuirCampoOpcional(atualizacao, 'loteIngresso', loteIngresso);
    atribuirCampoOpcional(atualizacao, 'nomeLote', NOMES_LOTES[loteIngresso] || '');
    atribuirCampoOpcional(atualizacao, 'tipoIngresso', tipoIngresso);
    atribuirCampoOpcional(atualizacao, 'nomeIngresso', NOMES_MODALIDADES[tipoIngresso] || '');

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
            fichaStatus.textContent = 'Não foi possível salvar. Tente novamente.';
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
            inscritosPorId.set(docSnap.id, { id: docSnap.id, ...dados });
            totalInscritos++;
            const nomeSeguro = textoDisponivel(dados.nome, 'Inscrito sem nome');
            const emailSeguro = textoDisponivel(dados.email, 'E-mail não informado');
            const tokenSeguro = textoDisponivel(dados.token, '-----');
            const emailJaEnviado = dados.emailIngressoStatus === 'enviado' || Boolean(dados.emailIngressoEnviadoEm);
            
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
                <div class="card-aluno-lista" data-inscrito-id="${escaparHtml(docSnap.id)}" data-nome="${escaparHtml(nomeSeguro.toLowerCase())}" data-email="${escaparHtml(emailSeguro.toLowerCase())}" style="background: #fff; border: 1px solid #e8e8eb; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <p style="margin: 0; font-size: 18px; font-weight: 800; color: var(--cor-primaria); line-height: 1.2; word-break: break-word;">${escaparHtml(nomeSeguro)}</p>
                        <button class="btn-excluir" style="background: #fffaf9; border: 1px solid #ffebeb; color: #e06d53; border-radius: 10px; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; transition: 0.2s;" title="Excluir Aluno">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-envelope-simple"></i> ${escaparHtml(emailSeguro)}</p>
                        <p style="margin: 0; font-size: 13px; color: #666; display: flex; align-items: center; gap: 6px;"><i class="ph-bold ph-key"></i> Token: <strong style="color: var(--cor-secundaria); font-family: var(--fonte-textos); letter-spacing: 2px;">${escaparHtml(tokenSeguro)}</strong></p>
                    </div>
                    
                    <div style="background: #f9f9fb; border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #f0f0f5;">
                        <span style="font-size: 13px; font-weight: 600; color: #888;">📊 Presença</span>
                        <strong style="color: ${corPorcentagem}; font-size: 14px;">${porcentagem}% <span style="font-size: 11px; opacity: 0.6; font-weight: 600;">(${presencasConfirmadas}/10)</span></strong>
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
