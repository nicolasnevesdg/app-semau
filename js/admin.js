import { db } from './firebase-config.js';
import { collection, doc, addDoc, getDocs, updateDoc, query, where, arrayUnion, arrayRemove, setDoc, onSnapshot, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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

const adminBuscaPax = document.getElementById('admin-busca-pax');
const btnAdminBuscar = document.getElementById('btn-admin-buscar');
const adminResultadoBusca = document.getElementById('admin-resultado-busca');
const paxNome = document.getElementById('pax-nome');
const btnAbrirCamera = document.getElementById('btn-abrir-camera');
const leitorQrcodeDiv = document.getElementById('leitor-qrcode');
let leitor = null; // Essa variável vai guardar a "sessão" da câmera ligada

// Puxa TODOS os 10 botões de presença de uma vez só
const botoesPresenca = document.querySelectorAll('.btn-presenca');
const botoesOficinaAdmin = document.querySelectorAll('.btn-oficina-admin');

const btnAdminSortear = document.getElementById('btn-admin-sortear');
const sorteioResultado = document.getElementById('sorteio-resultado');


let idAlunoSelecionado = null;

// Esconde o aviso de sucesso se começar a digitar novo nome
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
        btnAdminCadastrar.textContent = "Salvando...";

        try {
            await addDoc(collection(db, "inscritos"), {
                nome: nome,
                email: email,
                token: tokenGerado,
                pontos: 0,
                // Criando a grade de presença do aluno no Firebase zerada
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
// 1.5 SCANNER DE CÂMERA (EM TELA INTEIRA)
// ==========================================
const modalCamera = document.getElementById('modal-camera');
const btnFecharCamera = document.getElementById('btn-fechar-camera');

if (btnAbrirCamera) {
    btnAbrirCamera.addEventListener('click', () => {
        // 1. Mostra a tela escura
        modalCamera.style.display = 'flex';
        
        // 2. Prepara a câmera (a variável 'leitor' já está no topo do arquivo)
        if (!leitor) {
            leitor = new Html5Qrcode("leitor-qrcode");
        }
        
        // 3. Liga a câmera do celular
        leitor.start(
            { facingMode: "environment" }, 
            {
                fps: 10,    
                qrbox: { width: 250, height: 250 } 
            },
            (textoDecodificado) => {
                // SUCESSO! Leu o código.
                if (navigator.vibrate) navigator.vibrate(200); // Vibra no Android
                
                // Preenche a barra de pesquisa e clica em buscar automaticamente
                adminBuscaPax.value = textoDecodificado;
                btnAdminBuscar.click();

                // Desliga a câmera e fecha o modal
                desligarCamera();
            },
            (erroDeLeitura) => { /* Fica em silêncio enquanto procura o QR */ }
        ).catch((err) => {
            console.error("Erro ao iniciar a câmera:", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
            desligarCamera();
        });
    });
}

// Função para desligar a câmera e fechar a tela preta
function desligarCamera() {
    if (leitor) {
        leitor.stop().then(() => {
            modalCamera.style.display = 'none';
        }).catch(err => {
            console.error("Erro ao parar a câmera", err);
            modalCamera.style.display = 'none';
        });
    } else {
        modalCamera.style.display = 'none';
    }
}

// Evento do botão vermelho de fechar
if (btnFecharCamera) {
    btnFecharCamera.addEventListener('click', desligarCamera);
}

// ==========================================
// 2. BUSCAR ALUNO E PREENCHER A GRADE
// ==========================================
if (btnAdminBuscar) {
    btnAdminBuscar.addEventListener('click', async () => {
        const busca = adminBuscaPax.value.trim().toLowerCase();
        if (!busca) return;

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
                
                // Mágica: O script passa por todos os 10 botões e pinta de acordo com o banco
                botoesPresenca.forEach(botao => {
                    const campoNoBanco = botao.dataset.campo;
                    atualizarBotaoPresenca(botao, alunoAchado[campoNoBanco]);
                });

                // 👇 NOVO: Pinta as oficinas de laranja se o aluno já estiver nelas
                const oficinasAtuais = alunoAchado.oficinas || [];
                botoesOficinaAdmin.forEach(botao => {
                    const idOficina = botao.dataset.oficina;
                    
                    if (oficinasAtuais.includes(idOficina)) {
                        botao.classList.add('ativo');
                        botao.style.backgroundColor = "var(--cor-secundaria)"; // Laranja
                        botao.style.color = "#fff";
                    } else {
                        botao.classList.remove('ativo');
                        botao.style.backgroundColor = "#e0e0e0"; // Cinza
                        botao.style.color = "#333";
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

// Função visual para pintar o botão de verde ou cinza
function atualizarBotaoPresenca(botao, status) {
    if (status) {
        botao.classList.add('confirmado');
        botao.textContent = "✓ Confirmado";
        botao.style.backgroundColor = "var(--cor-primaria)";
        botao.style.color = "#fff";
    } else {
        botao.classList.remove('confirmado');
        // Se o data-campo terminar em "_m", escreve Manhã, senão Tarde
        botao.textContent = botao.dataset.campo.endsWith('_m') ? "Manhã" : "Tarde";
        botao.style.backgroundColor = "#e0e0e0";
        botao.style.color = "#333";
    }
}

// ==========================================
// 3. DAR PRESENÇA AO CLICAR NOS BOTÕES
// ==========================================
const togglePresenca = async (campo, botao) => {
    if (!idAlunoSelecionado) return;

    const jaTemPresenca = botao.classList.contains('confirmado');
    const novoStatus = !jaTemPresenca;

    try {
        const alunoRef = doc(db, "inscritos", idAlunoSelecionado);
        await updateDoc(alunoRef, {
            [campo]: novoStatus
        });
        atualizarBotaoPresenca(botao, novoStatus);
    } catch (error) {
        console.error("Erro ao atualizar presença:", error);
    }
};

// Dá vida aos 10 botões ao mesmo tempo COM CONFIRMAÇÃO
botoesPresenca.forEach(botao => {
    botao.addEventListener('click', () => {
        // Verifica se a ação é dar ou tirar presença para mudar o texto
        const acao = botao.classList.contains('confirmado') ? "REMOVER a presença" : "CONFIRMAR a presença";
        
        // Abre o alerta na tela
        if (confirm(`Tem certeza que deseja ${acao} neste turno?`)) {
            togglePresenca(botao.dataset.campo, botao);
        }
    });
});

// 3.5 SELECIONAR/REMOVER OFICINAS DO ALUNO
// ==========================================
botoesOficinaAdmin.forEach(botao => {
    botao.addEventListener('click', async () => {
        if (!idAlunoSelecionado) return;

        const idOficina = botao.dataset.oficina;
        const jaEstaAtivo = botao.classList.contains('ativo');
        
        // 👇 NOVO: A mensagem muda se ele está colocando ou tirando a oficina
        const acao = jaEstaAtivo ? "REMOVER o aluno da" : "INSCREVER o aluno na";
        
        // 👇 NOVO: A trava! Se a pessoa clicar em "Cancelar", o 'return' cancela tudo.
        if (!confirm(`Tem certeza que deseja ${acao} ${idOficina}?`)) {
            return; 
        }

        const alunoRef = doc(db, "inscritos", idAlunoSelecionado);

        try {
            if (jaEstaAtivo) {
                // Se já estava ativo, o clique remove do array no Firebase
                await updateDoc(alunoRef, {
                    oficinas: arrayRemove(idOficina)
                });
                botao.classList.remove('ativo');
                botao.style.backgroundColor = "#e0e0e0";
                botao.style.color = "#333";
            } else {
                // Se não estava ativo, o clique adiciona no array do Firebase
                await updateDoc(alunoRef, {
                    oficinas: arrayUnion(idOficina)
                });
                botao.classList.add('ativo');
                botao.style.backgroundColor = "var(--cor-secundaria)";
                botao.style.color = "#fff";
            }
        } catch (error) {
            console.error("Erro ao atualizar oficinas do aluno:", error);
        }
    });
});

// ==========================================
// 4. O SORTEADOR (Com filtro de turno)
// ==========================================
// Apenas declaramos a nova variável, as outras já estão no topo do ficheiro!
const selectSorteioTurno = document.getElementById('select-sorteio-turno'); 

if (btnAdminSortear) {
    btnAdminSortear.addEventListener('click', async () => {
        sorteioResultado.innerHTML = "Sorteando... 🎲";
        btnAdminSortear.disabled = true;
        
        // Pega o turno que você selecionou na tela
        const turnoEscolhido = selectSorteioTurno ? selectSorteioTurno.value : 'qualquer';

        try {
            const inscritosRef = collection(db, "inscritos");
            const querySnapshot = await getDocs(inscritosRef);
            
            let listaSorteaveis = [];
            
            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                let temPresenca = false;

                if (turnoEscolhido === 'qualquer') {
                    // Mantém a regra antiga se você quiser sortear entre todos que pisaram no evento
                    temPresenca = dados.d21_m || dados.d21_t || dados.d22_m || dados.d22_t || 
                                  dados.d23_m || dados.d23_t || dados.d24_m || dados.d24_t || 
                                  dados.d25_m || dados.d25_t;
                } else {
                    // MÁGICA: Ele checa dinamicamente apenas o campo que você escolheu (ex: dados["d21_m"])
                    temPresenca = dados[turnoEscolhido] === true;
                }
                
                // Se a pessoa passou no teste de presença, entra pra urna
                if (temPresenca) {
                    listaSorteaveis.push(dados.nome);
                }
            });
            
            if (listaSorteaveis.length === 0) {
                sorteioResultado.innerHTML = `<span style="color: #e06d53;">Ninguém com presença confirmada neste turno! ❌</span>`;
                return;
            }
            
            // Sorteia o nome
            const ganhador = listaSorteaveis[Math.floor(Math.random() * listaSorteaveis.length)];
            sorteioResultado.innerHTML = `🎉 Vencedor(a):<br><strong style="font-size: 22px;">${ganhador}</strong>`;
            
        } catch (error) {
            console.error("Erro no sorteio:", error);
            sorteioResultado.textContent = "Erro ao sortear.";
        } finally {
            btnAdminSortear.disabled = false;
        }
    });
}

btnSalvarFase.addEventListener('click', async () => {
    const faseEscolhida = selectFase.value;
    
    if(confirm(`Tem certeza que deseja mudar o site para a fase: ${faseEscolhida}?`)) {
        try {
            // Cria ou atualiza o documento de configuração geral
            await setDoc(doc(db, "configuracoes", "geral"), {
                faseAtual: faseEscolhida
            }, { merge: true }); // O merge garante que não apague outras configs
            
            alert("✅ Site atualizado com sucesso! O botão já mudou para todos os alunos.");
        } catch (error) {
            console.error("Erro ao mudar fase:", error);
            alert("Erro ao mudar a fase.");
        }
    }
});


// Referência do documento no banco de dados onde vamos guardar a lista de ativos
const docConvidadosRef = doc(db, "configuracoes", "anuncios");

// Seleciona todos os checkboxes que acabamos de criar
const checkboxesConvidados = document.querySelectorAll('.toggle-convidado');

// Lógica 1: Ficar de olho no Firebase e manter os botões sincronizados
onSnapshot(docConvidadosRef, (docSnap) => {
    if (docSnap.exists()) {
        // Pega a lista (array) de IDs que estão ativos no banco
        const ativos = docSnap.data().ativos || []; 

        // Marca ou desmarca os botões da tela do admin baseado no banco
        checkboxesConvidados.forEach(chk => {
            chk.checked = ativos.includes(chk.value);
        });
    }
});

// Lógica 2: Quando você clicar em um botão, atualiza o Firebase
checkboxesConvidados.forEach(chk => {
    chk.addEventListener('change', async () => {
        // Varre todos os checkboxes e pega o 'value' apenas dos que estão marcados
        const listaAtualizada = Array.from(checkboxesConvidados)
                                     .filter(box => box.checked)
                                     .map(box => box.value);
        
        try {
            await setDoc(docConvidadosRef, {
                ativos: listaAtualizada
            }, { merge: true });
            
            console.log("Anúncios atualizados no Firebase!");
        } catch (error) {
            console.error("Erro ao atualizar: ", error);
        }
    });
});

// Elementos do controle de modo
const selectModoCronograma = document.getElementById('select-modo-cronograma');
const btnSalvarModoCronograma = document.getElementById('btn-salvar-modo-cronograma');

// Sincroniza o select ao carregar a página com o valor atual do banco
onSnapshot(docConvidadosRef, (docSnap) => {
    if (docSnap.exists() && docSnap.data().modo) {
        if (selectModoCronograma) selectModoCronograma.value = docSnap.data().modo;
    }
});

// Salva a alteração de fase
if (btnSalvarModoCronograma) {
    btnSalvarModoCronograma.addEventListener('click', async () => {
        const modoEscolhido = selectModoCronograma.value;
        const acaoTexto = modoEscolhido === 'fase1' ? "Fase 1 (Anúncios)" : "Fase 2 (Cronograma Oficial)";
        
        if (confirm(`Deseja alterar a visualização do app para: ${acaoTexto}?`)) {
            try {
                await setDoc(docConvidadosRef, {
                    modo: modoEscolhido
                }, { merge: true });
                alert("✅ Modo de visualização atualizado com sucesso!");
            } catch (error) {
                console.error("Erro ao atualizar modo:", error);
                alert("Erro ao salvar configuração.");
            }
        }
    });
}

// ==========================================
// 5. NAVEGAÇÃO DO PAINEL ADMIN (MENU INFERIOR)
// ==========================================
const viewAdCadastro = document.getElementById('view-admin-cadastro');
const viewAdPresenca = document.getElementById('view-admin-presenca');
const viewAdLista = document.getElementById('view-admin-lista');
const viewAdConfigs = document.getElementById('view-admin-configs');

const navAdCadastro = document.getElementById('nav-ad-cadastro');
const navAdPresenca = document.getElementById('nav-ad-presenca');
const navAdLista = document.getElementById('nav-ad-lista');
const navAdConfigs = document.getElementById('nav-ad-configs');

function showAdminView(viewToShow, navItemToHighlight) {
    // Esconde todas as telas
    document.querySelectorAll('#app-container > .view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });
    
    // Tira o "active" (cor laranja) de todos os botões do menu
    document.querySelectorAll('#bottom-nav .nav-item').forEach(nav => {
        nav.classList.remove('active');
    });

    // Mostra a tela desejada e pinta o ícone selecionado
    viewToShow.style.display = 'block';
    viewToShow.classList.add('active');
    navItemToHighlight.classList.add('active');
}

// Eventos de clique nos ícones
if(navAdCadastro) navAdCadastro.addEventListener('click', () => showAdminView(viewAdCadastro, navAdCadastro));
if(navAdPresenca) navAdPresenca.addEventListener('click', () => showAdminView(viewAdPresenca, navAdPresenca));
if(navAdLista) navAdLista.addEventListener('click', () => {
    showAdminView(viewAdLista, navAdLista);
    carregarListaInscritos(); // Puxa os dados atualizados do Firebase na mesma hora!
});
if(navAdConfigs) navAdConfigs.addEventListener('click', () => showAdminView(viewAdConfigs, navAdConfigs));

// ==========================================
// 6. LISTA DE INSCRITOS, DASHBOARD E EXCEL
// ==========================================
const containerListaInscritos = document.getElementById('container-lista-inscritos');
const adminBuscaLista = document.getElementById('admin-busca-lista');
const dashTotal = document.getElementById('dash-total');
const btnExportarExcel = document.getElementById('btn-exportar-excel');

let dadosParaExcel = []; // Matriz global que vai guardar os dados mastigados para a planilha

async function carregarListaInscritos() {
    if (!containerListaInscritos) return;
    
    containerListaInscritos.innerHTML = '<p style="text-align:center; padding: 20px;">Carregando inscritos...</p>';
    dadosParaExcel = []; // Limpa a matriz sempre que recarregar a tela
    
    try {
        const inscritosRef = collection(db, "inscritos");
        const querySnapshot = await getDocs(inscritosRef);
        
        if (querySnapshot.empty) {
            containerListaInscritos.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum inscrito encontrado.</p>';
            if(dashTotal) dashTotal.textContent = "0";
            return;
        }

        containerListaInscritos.innerHTML = ''; 
        let totalInscritos = 0;

        querySnapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            totalInscritos++;
            
            // --- CÁLCULO DE PRESENÇA ---
            const turnos = ['d21_m', 'd21_t', 'd22_m', 'd22_t', 'd23_m', 'd23_t', 'd24_m', 'd24_t', 'd25_m', 'd25_t'];
            let presencasConfirmadas = 0;
            turnos.forEach(t => { if(dados[t] === true) presencasConfirmadas++; });
            
            const porcentagem = (presencasConfirmadas / 10) * 100;
            const corPorcentagem = porcentagem >= 75 ? '#2ecc71' : '#e06d53';

            // --- ALIMENTAR A MATRIZ DO EXCEL ---
            const oficinasFormatadas = dados.oficinas && dados.oficinas.length > 0 ? dados.oficinas.join(' | ') : 'Nenhuma';
            
            dadosParaExcel.push({
                "Nome Completo": dados.nome,
                "E-mail": dados.email,
                "Token": dados.token,
                "Oficinas Inscritas": oficinasFormatadas,
                "Presença (%)": porcentagem + "%",
                "Pontos no App": dados.pontos || 0,
                "21/Set (Manhã)": dados.d21_m ? "Presente" : "Falta",
                "21/Set (Tarde)": dados.d21_t ? "Presente" : "Falta",
                "22/Set (Manhã)": dados.d22_m ? "Presente" : "Falta",
                "22/Set (Tarde)": dados.d22_t ? "Presente" : "Falta",
                "23/Set (Manhã)": dados.d23_m ? "Presente" : "Falta",
                "23/Set (Tarde)": dados.d23_t ? "Presente" : "Falta",
                "24/Set (Manhã)": dados.d24_m ? "Presente" : "Falta",
                "24/Set (Tarde)": dados.d24_t ? "Presente" : "Falta",
                "25/Set (Manhã)": dados.d25_m ? "Presente" : "Falta",
                "25/Set (Tarde)": dados.d25_t ? "Presente" : "Falta"
            });

            // --- PREPARAÇÃO DO E-MAIL AUTOMÁTICO ---
            const assunto = encodeURIComponent("Seu Ingresso para a XVI SEMAU UFRRJ");
            const corpoEmail = encodeURIComponent(
                `Olá, ${dados.nome}!\n\nSua inscrição foi confirmada com sucesso na XVI SEMAU UFRRJ - O espaço que nos habita.\n\nGuarde seus dados de acesso:\nE-mail: ${dados.email}\nToken de Acesso: ${dados.token}\n\nAcesse o app do evento para ver o cronograma e acumular pontos: https://semau.spacennNos vemos lá!`
            );
            const linkMailTo = `mailto:${dados.email}?subject=${assunto}&body=${corpoEmail}`;

            // --- MONTAGEM DO CARD NA TELA ---
            const cardHTML = `
                <div class="card-aluno-lista" data-nome="${dados.nome.toLowerCase()}" data-email="${dados.email.toLowerCase()}" style="background: #f8f9fa; border: 1px solid #eee; border-radius: 12px; padding: 15px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; position: relative;">
                    
                    <button onclick="window.excluirInscrito('${docSnap.id}')" style="position: absolute;top: 5px;right: 15px;background: transparent;border: none;font-size: 20px;cursor: pointer;padding: 5px;line-height: 1;width: inherit;" title="Excluir Aluno">🗑️</button>
                    
                    <p style="margin: 0; font-size: 16px; font-weight: bold; color: var(--cor-primaria); padding-right: 45px; line-height: 1.3; word-break: break-word;">${dados.nome}</p>
                    
                    <p style="margin: 0; font-size: 13px; color: #666;">📧 ${dados.email}</p>
                    <p style="margin: 0; font-size: 13px; color: #666;">🔑 Token: <strong style="color: var(--cor-secundaria); font-family: var(--fonte-textos); letter-spacing: 2px;">${dados.token}</strong></p>
                    
                    <p style="margin: 0; font-size: 13px; color: #666;">
                        📊 Presença: <strong style="color: ${corPorcentagem};">${porcentagem}%</strong> (${presencasConfirmadas}/10 turnos)
                    </p>
                    
                    <button id="btn-email-${docSnap.id}" onclick="window.dispararEmail('${docSnap.id}', '${dados.nome}', '${dados.email}', '${dados.token}')" style="margin-top: 5px; background: var(--cor-secundaria); color: #fff; text-align: center; padding: 10px; border: none; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s;">
                        ✉️ Disparar E-mail Automático
                    </button>
                </div>
            `;
            containerListaInscritos.insertAdjacentHTML('beforeend', cardHTML);
        });
        
        // Atualiza a Dashboard (Apenas o total)
        if (dashTotal) dashTotal.textContent = totalInscritos;

    } catch (error) {
        console.error("Erro ao carregar lista de inscritos:", error);
        containerListaInscritos.innerHTML = '<p style="color: red; text-align:center;">Erro ao carregar a lista.</p>';
    }
}

// ==========================================
// FUNÇÃO DE DISPARO DE E-MAIL (EmailJS)
// ==========================================
window.dispararEmail = function(idBotao, nomeAluno, emailAluno, tokenAluno) {
    const botao = document.getElementById(`btn-email-${idBotao}`);
    
    // Feedback visual para não clicar duas vezes
    botao.disabled = true;
    botao.style.backgroundColor = "#ccc";
    botao.innerHTML = "⏳ Enviando...";

    // Aqui configuramos as variáveis que o seu template lá no EmailJS vai receber
    const parametros = {
        to_name: nomeAluno,
        to_email: emailAluno,
        user_token: tokenAluno
    };

    // Parâmetros: 'ID_DO_SERVICO', 'ID_DO_TEMPLATE', dados
    emailjs.send('SEU_SERVICE_ID', 'SEU_TEMPLATE_ID', parametros)
        .then(function(response) {
            console.log('E-mail enviado com sucesso!', response.status, response.text);
            botao.style.backgroundColor = "#2ecc71"; // Fica Verde
            botao.innerHTML = "✅ E-mail Enviado!";
        }, function(error) {
            console.error('Falha ao enviar e-mail...', error);
            botao.disabled = false;
            botao.style.backgroundColor = "#e06d53"; // Fica Vermelho
            botao.innerHTML = "❌ Erro. Tentar de novo";
            alert("Erro ao enviar o e-mail. Verifique o console.");
        });
}

// ==========================================
// 0. LOGIN DO ADMIN (Segurança via Firebase)
// ==========================================
const adminLoginOverlay = document.getElementById('admin-login-overlay');
const adminSenhaInput = document.getElementById('admin-senha-input');
const btnAdminLogin = document.getElementById('btn-admin-login');

// 1. Verifica se já tem sessão iniciada
if (sessionStorage.getItem('adminLogado') === 'true') {
    if(adminLoginOverlay) adminLoginOverlay.style.display = 'none';
}

// 2. Lógica de validação do botão com a base de dados
if (btnAdminLogin) {
    btnAdminLogin.addEventListener('click', async () => {
        const senhaDigitada = adminSenhaInput.value.trim();
        
        if (!senhaDigitada) return;

        // Feedback visual enquanto aguarda o servidor
        btnAdminLogin.textContent = "A verificar... ⏳";
        btnAdminLogin.disabled = true;

        try {
            // Vai ao Firebase na coleção "configuracoes", documento "seguranca"
            const docRef = doc(db, "configuracoes", "seguranca");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const senhaDoBanco = docSnap.data().senhaAdmin;

                if (senhaDigitada === senhaDoBanco) {
                    // Senha Correta!
                    sessionStorage.setItem('adminLogado', 'true');
                    adminLoginOverlay.style.display = 'none';
                } else {
                    // Senha Errada
                    alert("Senha incorreta! ❌");
                    adminSenhaInput.value = "";
                    adminSenhaInput.focus();
                }
            } else {
                console.error("Documento de segurança não encontrado.");
                alert("Erro: O documento 'seguranca' não existe na base de dados.");
            }
        } catch (error) {
            console.error("Erro ao verificar senha:", error);
            alert("Erro ao ligar à base de dados. Verifique a consola.");
        } finally {
            // Devolve o botão ao estado normal
            btnAdminLogin.textContent = "Entrar no Painel";
            btnAdminLogin.disabled = false;
        }
    });

    // 3. Permite entrar premindo a tecla "Enter"
    adminSenhaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnAdminLogin.click();
        }
    });

    // 4. Lógica de Logout (Sair)
    if (btnAdminLogout) {
        btnAdminLogout.addEventListener('click', () => {
            if (confirm("Deseja realmente sair do painel?")) {
                // Remove a chave de acesso da memória
                sessionStorage.removeItem('adminLogado');
                
                // Volta a tela escura e limpa o input
                if (adminLoginOverlay) {
                    adminLoginOverlay.style.display = 'flex';
                    adminSenhaInput.value = "";
                }
            }
        });
    }
    }