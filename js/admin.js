import { db } from './firebase-config.js';
import { collection, doc, addDoc, getDocs, updateDoc, query, where, arrayUnion, arrayRemove, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
// 1.5 SCANNER DE CÂMERA (WEB RTC)
// ==========================================
if (btnAbrirCamera) {
    btnAbrirCamera.addEventListener('click', () => {
        // REGRA 1: Se a câmera já estiver ligada, o botão serve para desligar
        if (leitor) {
            leitor.stop().then(() => {
                leitor = null;
                leitorQrcodeDiv.style.display = 'none';
                btnAbrirCamera.innerHTML = "📷 Ligar Câmera";
                btnAbrirCamera.style.backgroundColor = "var(--cor-eixo-rua)";
                btnAbrirCamera.style.color = "#0d372b";
            }).catch(err => console.error("Erro ao parar a câmera", err));
            return;
        }

        // REGRA 2: Ligar a câmera
        leitorQrcodeDiv.style.display = 'block';
        btnAbrirCamera.innerHTML = "Carregando... ⏳"; // Feedback visual
        
        leitor = new Html5Qrcode("leitor-qrcode");
        
        leitor.start(
            { facingMode: "environment" }, // Força a usar a câmera traseira do celular
            {
                fps: 10,    // Lê 10 quadros por segundo
                qrbox: { width: 220, height: 220 } // O quadradinho de foco
            },
            (textoDecodificado) => {
                // SUCESSO! ELE ACHOU O QR CODE!
                
                // Faz o celular dar uma vibradinha (funciona no Android)
                if (navigator.vibrate) navigator.vibrate(200);
                
                // Joga o token lido no input de busca
                adminBuscaPax.value = textoDecodificado;
                
                // Clica no botão de buscar automaticamente (como se fosse um humano)
                btnAdminBuscar.click();

                // Desliga a câmera para a equipe confirmar os dados na tela
                leitor.stop().then(() => {
                    leitor = null;
                    leitorQrcodeDiv.style.display = 'none';
                    btnAbrirCamera.innerHTML = "📷 Ligar Câmera";
                    btnAbrirCamera.style.backgroundColor = "var(--cor-eixo-rua)";
                    btnAbrirCamera.style.color = "#0d372b";
                });
            },
            (erroDeLeitura) => {
                // Como ele lê 10 vezes por segundo, ele dá erro até achar o QR Code.
                // É normal, então deixamos isso em silêncio.
            }
        ).then(() => {
            // Câmera abriu e está rodando! Muda o botão para "Desligar" vermelho
            btnAbrirCamera.innerHTML = "🚫 Desligar Câmera";
            btnAbrirCamera.style.backgroundColor = "#e06d53"; 
            btnAbrirCamera.style.color = "#fff";
        }).catch((err) => {
            console.error("Erro ao iniciar a câmera:", err);
            alert("Não foi possível acessar a câmera. Verifique se você deu permissão no navegador!");
            leitor = null;
            leitorQrcodeDiv.style.display = 'none';
            btnAbrirCamera.innerHTML = "📷 Ligar Câmera";
        });
    });
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
// 4. O SORTEADOR (Qualquer presença vale)
// ==========================================
if (btnAdminSortear) {
    btnAdminSortear.addEventListener('click', async () => {
        sorteioResultado.textContent = "Sorteando... 🌀";
        btnAdminSortear.disabled = true;
        
        try {
            const inscritosRef = collection(db, "inscritos");
            const querySnapshot = await getDocs(inscritosRef);
            let listaSorteaveis = [];

            querySnapshot.forEach((docSnap) => {
                const dados = docSnap.data();
                // Regra: Se a pessoa tem true em QUALQUER um dos dias/turnos, ela entra pro sorteio
                const temPresenca = dados.d21_m || dados.d21_t || dados.d22_m || dados.d22_t || 
                                    dados.d23_m || dados.d23_t || dados.d24_m || dados.d24_t || 
                                    dados.d25_m || dados.d25_t;
                
                if (temPresenca) {
                    listaSorteaveis.push(dados.nome);
                }
            });

            if (listaSorteaveis.length === 0) {
                sorteioResultado.innerHTML = `<span style="color: #e06d53;">Ninguém na urna ainda! 😢</span>`;
                return;
            }

            const ganhador = listaSorteaveis[Math.floor(Math.random() * listaSorteaveis.length)];
            sorteioResultado.innerHTML = `🎉 <strong>${ganhador}</strong> 🎉`;

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