const API_URL = 'http://localhost:8080/api/alunos';
const CONFIG_URL = 'http://localhost:8080/api/config';
const LOGIN_URL = 'http://localhost:8080/api/auth/login';
const WHATSAPP_STATUS_URL = 'http://localhost:3000/api/whatsapp/status';

// ---------- Autenticação (JWT) ----------
// O token fica em memória + localStorage (só este processo Electron tem acesso
// a ele; não é exposto a nenhuma página web de terceiros).
let tokenAtual = localStorage.getItem('vft_token') || null;
let usuarioAtual = localStorage.getItem('vft_username') || null;
let papelAtual = localStorage.getItem('vft_role') || null;

function salvarSessao(token, username, role) {
    tokenAtual = token;
    usuarioAtual = username;
    papelAtual = role;
    localStorage.setItem('vft_token', token);
    localStorage.setItem('vft_username', username);
    localStorage.setItem('vft_role', role);
}

function limparSessao() {
    tokenAtual = null;
    usuarioAtual = null;
    papelAtual = null;
    localStorage.removeItem('vft_token');
    localStorage.removeItem('vft_username');
    localStorage.removeItem('vft_role');
}

// Envolve o fetch nativo para sempre mandar o header Authorization e para
// tratar de forma centralizada um token expirado/inválido (401 do backend).
async function apiFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (tokenAtual) headers['Authorization'] = `Bearer ${tokenAtual}`;

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        limparSessao();
        Toast.fire({ icon: 'warning', title: 'Sessão expirada. Faça login novamente.' });
        mostrarTelaLogin();
    }

    return response;
}

function mostrarTelaLogin() {
    document.getElementById('appConteudo').classList.add('d-none');
    document.getElementById('telaLogin').classList.remove('d-none');
}

function mostrarApp() {
    document.getElementById('telaLogin').classList.add('d-none');
    document.getElementById('appConteudo').classList.remove('d-none');
}

async function fazerLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const erroEl = document.getElementById('loginErro');
    erroEl.classList.add('d-none');

    try {
        const response = await fetch(LOGIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            erroEl.innerText = 'Usuário ou senha inválidos.';
            erroEl.classList.remove('d-none');
            return;
        }

        const dados = await response.json();
        salvarSessao(dados.token, dados.username, dados.role);
        mostrarApp();
        await iniciarApp();
    } catch {
        erroEl.innerText = 'Não foi possível conectar à API. Verifique se o backend está rodando.';
        erroEl.classList.remove('d-none');
    }
}

function sair() {
    limparSessao();
    mostrarTelaLogin();
}

let cpfsRegistados = [];

// Guarda a última lista de alunos já processada (com valor de mensalidade e
// status de pagamento calculados) para permitir buscar/filtrar sem precisar
// buscar tudo de novo na API a cada tecla digitada.
let ultimaListaProcessada = [];

// Valores de mensalidade: vêm da API (endpoint /api/config), não ficam mais
// fixos no JavaScript. Esses aqui só servem de fallback caso a API esteja
// fora do ar quando a tela carrega.
let precos = { valorMensalidadeNovato: 80, valorMensalidadeVeterano: 70 };

const cpfMask = IMask(document.getElementById('cpf'), { mask: '000.000.000-00' });
const celularMask = IMask(document.getElementById('celular'), { mask: '(00) 00000-0000' });
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1a1a', color: '#fff' });

// Mesma regra usada no backend (CPFValidator.java): confere os dígitos
// verificadores, não só o tamanho. Duplicada aqui só para dar feedback
// instantâneo; a validação de verdade continua acontecendo na API.
function cpfValido(cpf) {
    if (!/^\d{11}$/.test(cpf)) return false;
    if (new Set(cpf.split('')).size === 1) return false; // sequência repetida, ex: 00000000000

    const digitoVerificador = (tamanhoBase) => {
        let soma = 0;
        let multiplicador = tamanhoBase + 1;
        for (let i = 0; i < tamanhoBase; i++) soma += Number(cpf[i]) * multiplicador--;
        const resto = soma % 11;
        const esperado = resto < 2 ? 0 : 11 - resto;
        return esperado === Number(cpf[tamanhoBase]);
    };

    return digitoVerificador(9) && digitoVerificador(10);
}

// Valida um campo ao perder o foco e mostra o feedback na hora, em vez de
// só descobrir o erro depois de tentar salvar o formulário.
function validarCampoAoPerderFoco(inputId, feedbackId, validador, mensagemErro) {
    const input = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    input.addEventListener('blur', () => {
        if (input.value.trim() === '') {
            input.classList.remove('is-invalid', 'is-valid');
            return;
        }
        const valido = validador();
        input.classList.toggle('is-invalid', !valido);
        input.classList.toggle('is-valid', valido);
        feedback.innerText = valido ? '' : mensagemErro;
    });
    // Assim que o usuário corrige o campo, tira o erro sem esperar sair do campo de novo
    input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
            input.classList.remove('is-invalid');
            feedback.innerText = '';
        }
    });
}

validarCampoAoPerderFoco('cpf', 'cpfFeedback', () => {
    const cpf = cpfMask.unmaskedValue;
    if (cpfsRegistados.includes(cpf)) return false;
    return cpfValido(cpf);
}, 'CPF inválido ou já cadastrado.');

validarCampoAoPerderFoco('celular', 'celularFeedback', () => {
    return celularMask.unmaskedValue.length === 11;
}, 'Celular deve ter DDD + 9 dígitos.');

// Alternar entre abas
function mudarAba(abaId, elementoClicado) {
    document.querySelectorAll('.tab-content').forEach(aba => aba.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    elementoClicado.classList.add('active');
}

// Calcula idade
document.getElementById('dataNascimento').addEventListener('change', function() {
    const dataNasc = new Date(this.value);
    if (isNaN(dataNasc.getTime())) return;
    const hoje = new Date();
    let idadeCalculada = hoje.getFullYear() - dataNasc.getFullYear();
    if (hoje.getMonth() - dataNasc.getMonth() < 0 || (hoje.getMonth() === dataNasc.getMonth() && hoje.getDate() < dataNasc.getDate())) idadeCalculada--;
    document.getElementById('idade').value = idadeCalculada < 0 ? 0 : idadeCalculada;
});

// Lê a mensagem de erro devolvida pelo GlobalExceptionHandler da API.
// Pode vir como { campo: "mensagem" } (erro de validação) ou { erro: "mensagem" } (ex.: CPF duplicado).
async function extrairMensagemDeErro(response, mensagemPadrao) {
    try {
        const corpo = await response.json();
        const primeiraMensagem = corpo.erro || Object.values(corpo)[0];
        return primeiraMensagem || mensagemPadrao;
    } catch {
        return mensagemPadrao;
    }
}

// Busca os valores de mensalidade configurados no backend.
async function carregarConfiguracoes() {
    try {
        const response = await apiFetch(CONFIG_URL);
        if (response.ok) {
            precos = await response.json();
        }
    } catch (error) {
        console.error('Não foi possível buscar /api/config, usando valores padrão:', error);
        Toast.fire({ icon: 'warning', title: 'Não foi possível carregar as configurações agora. Usando os valores padrão.' });
    }
    atualizarLabelsTipoMatricula();
    document.getElementById('configValorNovato').value = precos.valorMensalidadeNovato;
    document.getElementById('configValorVeterano').value = precos.valorMensalidadeVeterano;
}

// Mostra o preço de cada opção direto no botão, para não precisar decorar
// "quanto é o novato mesmo?" — o valor está sempre visível ali.
function atualizarLabelsTipoMatricula() {
    document.getElementById('labelTipoNovato').innerText = `Novato — ${precos.valorMensalidadeNovato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    document.getElementById('labelTipoVeterano').innerText = `Veterano — ${precos.valorMensalidadeVeterano.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}

// Salva os novos valores de mensalidade na tela de Configurações
document.getElementById('formConfiguracoes').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSalvarConfiguracoes');
    btn.disabled = true;

    const corpo = {
        valorMensalidadeNovato: parseFloat(document.getElementById('configValorNovato').value),
        valorMensalidadeVeterano: parseFloat(document.getElementById('configValorVeterano').value)
    };

    try {
        const response = await apiFetch(CONFIG_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
        if (response.ok) {
            precos = await response.json();
            atualizarLabelsTipoMatricula();
            Toast.fire({ icon: 'success', title: 'Valores atualizados!' });
            carregarAlunos(); // recalcula o caixa e a tabela com os novos valores
        } else {
            const mensagem = await extrairMensagemDeErro(response, 'Não foi possível salvar os novos valores.');
            Toast.fire({ icon: 'error', title: mensagem });
        }
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Não foi possível conectar ao sistema. Tente novamente em instantes.' });
    }
    btn.disabled = false;
});

// Consulta se o robô do WhatsApp está rodando/conectado e atualiza o badge + botões no topo da tela.
async function verificarStatusWhatsapp() {
    const badge = document.getElementById('statusWhatsapp');
    const btnIniciar = document.getElementById('btnIniciarWhatsapp');
    const btnVerQrCode = document.getElementById('btnVerQrCode');
    try {
        const response = await fetch(WHATSAPP_STATUS_URL);
        const dados = await response.json();
        btnIniciar.classList.add('d-none'); // se respondeu, o processo já está rodando

        if (dados.conectado) {
            badge.className = 'status-whatsapp conectado';
            badge.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Robô do WhatsApp conectado';
            btnVerQrCode.classList.add('d-none');
        } else {
            badge.className = 'status-whatsapp aguardando';
            badge.innerHTML = '<i class="fa-solid fa-qrcode"></i> Aguardando leitura do QR code';
            btnVerQrCode.classList.remove('d-none');
        }
    } catch (error) {
        // Não respondeu: o processo do worker nem está rodando
        badge.className = 'status-whatsapp desconectado';
        badge.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> Robô do WhatsApp não iniciado';
        btnIniciar.classList.remove('d-none');
        btnVerQrCode.classList.add('d-none');
    }
}

// Liga o worker do WhatsApp como processo filho do app desktop (via Electron).
// O QR code aparece numa janela própria (qr.html) — a tela principal do app
// fica limpa, sem log nenhum aparecendo nela.
async function iniciarRoboWhatsapp() {
    if (!window.electronAPI) {
        Toast.fire({ icon: 'error', title: 'Essa ação só funciona no app desktop instalado.' });
        return;
    }
    const btn = document.getElementById('btnIniciarWhatsapp');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>Iniciando...';

    const resultado = await window.electronAPI.iniciarWhatsApp();

    if (resultado.erro) {
        Toast.fire({ icon: 'error', title: resultado.erro });
    } else if (!resultado.jaEstavaRodando) {
        Toast.fire({ icon: 'success', title: 'Robô iniciado! Uma janela com o QR code vai abrir.' });
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-power-off me-1"></i>Iniciar Robô';
}

// Calcula o status de vencimento para diferenciar quem venceu de quem está
// só chegando perto da data, em vez do antigo "pago/pendente" binário.
function calcularStatusVencimento(aluno, pagouEsteMes, hoje) {
    if (pagouEsteMes) {
        return { classe: 'bg-success', icone: 'fa-solid fa-check', texto: new Date(aluno.ultimoPagamento + 'T12:00:00').toLocaleDateString('pt-BR') };
    }

    // Nem todo mês tem o dia de vencimento cadastrado (ex.: vencimento dia 31
    // não existe em abril/junho/setembro/novembro; dia 29/30/31 não existe em
    // fevereiro). Nesses meses, o vencimento "cai" no último dia do mês.
    const ultimoDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diaVencimentoEfetivo = Math.min(aluno.diaVencimento, ultimoDiaDoMes);
    const diasParaVencer = diaVencimentoEfetivo - hoje.getDate();

    if (diasParaVencer < 0) {
        return { classe: 'bg-danger', icone: 'fa-solid fa-triangle-exclamation', texto: 'Vencido' };
    }
    if (diasParaVencer <= 6) {
        return { classe: 'bg-warning', icone: 'fa-solid fa-clock', texto: 'Vence em breve' };
    }
    return { classe: 'bg-secondary', icone: 'fa-regular fa-clock', texto: 'Aguardando' };
}

// Processa a resposta da API: calcula valor de mensalidade e status de
// pagamento de cada aluno, e os totais do dashboard financeiro.
function processarAlunos(alunos) {
    let arrecadado = 0;
    let esperado = 0;
    let pagantes = 0;
    let pendentes = 0;

    const hoje = new Date();
    const anoMesAtual = hoje.toISOString().substring(0, 7);

    const processados = alunos.map(aluno => {
        const valorMensalidade = aluno.tipoMatricula === 'NOVATO'
            ? precos.valorMensalidadeNovato
            : precos.valorMensalidadeVeterano;
        esperado += valorMensalidade;

        const pagouEsteMes = !!(aluno.ultimoPagamento && aluno.ultimoPagamento.substring(0, 7) === anoMesAtual);
        if (pagouEsteMes) {
            arrecadado += valorMensalidade;
            pagantes++;
        } else {
            pendentes++;
        }

        return { ...aluno, valorMensalidade, pagouEsteMes, statusVencimento: calcularStatusVencimento(aluno, pagouEsteMes, hoje) };
    });

    document.getElementById('valorCaixa').innerText = arrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('valorEsperado').innerText = esperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('qtdPagantes').innerText = pagantes;
    document.getElementById('qtdPendentes').innerText = pendentes;

    return processados;
}

// Formata o celular salvo (com DDI 55 + 11 dígitos) para exibição: (81) 99999-9999
function formatarCelular(celularBruto) {
    let cel = celularBruto.replace(/^55/, '');
    if (cel.length === 11) cel = `(${cel.substring(0,2)}) ${cel.substring(2,7)}-${cel.substring(7)}`;
    return cel;
}

// Aplica a busca por nome e o filtro "só pendentes", ordena pendentes
// primeiro, e desenha a tabela. Não busca nada na API — só reprocessa o
// que já está em memória (ultimaListaProcessada).
function renderizarTabela() {
    const termoBusca = document.getElementById('buscaAluno').value.trim().toLowerCase();
    const somentePendentes = document.getElementById('filtroPendentes').checked;

    let lista = ultimaListaProcessada.filter(aluno => {
        const bateNome = aluno.nomeCompleto.toLowerCase().includes(termoBusca);
        const batePendencia = !somentePendentes || !aluno.pagouEsteMes;
        return bateNome && batePendencia;
    });

    // Pendentes primeiro: quem precisa de atenção aparece no topo
    lista = lista.slice().sort((a, b) => Number(a.pagouEsteMes) - Number(b.pagouEsteMes));

    const tabela = document.getElementById('tabelaAlunos');
    tabela.innerHTML = '';

    if (lista.length === 0) {
        const mensagem = ultimaListaProcessada.length === 0
            ? 'Nenhum atleta cadastrado ainda. Use o formulário ao lado para matricular o primeiro.'
            : 'Nenhum atleta encontrado com esse filtro.';
        tabela.innerHTML = `<tr class="tabela-vazia"><td colspan="5"><i class="fa-solid fa-user-slash"></i>${mensagem}</td></tr>`;
        return;
    }

    lista.forEach(aluno => {
        const status = aluno.statusVencimento;

        let cel = formatarCelular(aluno.celular);
        const celSomenteDigitos = aluno.celular.replace(/\D/g, '');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-white">${aluno.nomeCompleto}</td>
            <td style="color: var(--text-muted);">
                <a href="https://wa.me/${celSomenteDigitos}" target="_blank" style="color: inherit; text-decoration: none;" title="Abrir conversa no WhatsApp">
                    <i class="fa-brands fa-whatsapp me-1 opacity-50"></i>${cel}
                </a>
            </td>
            <td><span style="color: var(--text-muted);">Dia</span> <strong class="text-white">${aluno.diaVencimento}</strong></td>
            <td><span class="badge ${status.classe}"><i class="${status.icone} me-1"></i>${status.texto}</span></td>
            <td class="text-end acoes-aluno">
                <button class="btn btn-outline-success btn-action" onclick="registrarPagamento('${aluno.cpf}')" title="Receber pagamento">
                    <i class="fa-solid fa-dollar-sign"></i>
                </button>
                <button class="btn btn-outline-success btn-action" onclick="cobrarAgora('${aluno.cpf}')" title="Cobrar agora pelo WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
                <button class="btn btn-outline-light btn-action somente-admin" onclick="iniciarEdicao('${aluno.cpf}')" title="Editar dados do atleta">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-outline-light btn-action" onclick="verHistorico('${aluno.cpf}')" title="Ver histórico de pagamentos">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </button>
                <button class="btn btn-outline-danger btn-action somente-admin" onclick="removerAluno('${aluno.cpf}')" title="Inativar atleta">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tabela.appendChild(tr);
    });

    aplicarRestricoesDePapel();
}

// Função Principal de Carregamento
async function carregarAlunos() {
    try {
        const response = await apiFetch(API_URL);
        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }
        const alunos = await response.json();

        const hoje = new Date();
        const nomesMeses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
        document.getElementById('mesAtualNome').innerText = nomesMeses[hoje.getMonth()];

        cpfsRegistados = alunos.map(aluno => aluno.cpf);
        ultimaListaProcessada = processarAlunos(alunos);
        renderizarTabela();

    } catch (error) {
        console.error('Erro de conexão:', error);
        Toast.fire({ icon: 'error', title: 'Não foi possível carregar os dados. Tente novamente em instantes.' });
    }
}

// Busca e filtro reagem na hora, sem precisar recarregar a lista
document.getElementById('buscaAluno').addEventListener('input', renderizarTabela);
document.getElementById('filtroPendentes').addEventListener('change', renderizarTabela);

// Abre uma janela (modal) para editar os dados de um aluno já cadastrado.
// O CPF nunca é editável (é a chave do aluno no backend), então aparece travado.
async function iniciarEdicao(cpf) {
    const aluno = ultimaListaProcessada.find(a => a.cpf === cpf);
    if (!aluno) return;

    const cpfFormatado = aluno.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const celularSemDDI = aluno.celular.replace(/^55/, '');

    let maskCelularModal;

    const { value: dados } = await Swal.fire({
        title: 'Editar Atleta',
        width: 480,
        background: '#141414', color: '#fff',
        confirmButtonColor: '#E60000', cancelButtonColor: 'transparent',
        showCancelButton: true, confirmButtonText: 'Salvar Alterações', cancelButtonText: 'Cancelar',
        focusConfirm: false,
        html: `
            <div class="swal-form-editar text-start">
                <label class="form-label">CPF (não editável)</label>
                <input id="swalCpf" class="form-control mb-3" value="${cpfFormatado}" disabled>

                <label class="form-label">Nome completo</label>
                <input id="swalNome" class="form-control mb-3" value="${aluno.nomeCompleto}">

                <label class="form-label">Celular</label>
                <input id="swalCelular" class="form-control mb-3" placeholder="(00) 00000-0000">

                <div class="row">
                    <div class="col-6">
                        <label class="form-label">Idade</label>
                        <input id="swalIdade" type="number" class="form-control mb-3" value="${aluno.idade}">
                    </div>
                    <div class="col-6">
                        <label class="form-label">Dia vencimento</label>
                        <input id="swalDiaVencimento" type="number" min="1" max="31" class="form-control mb-3" value="${aluno.diaVencimento}">
                    </div>
                </div>

                <label class="form-label">Tipo de Matrícula</label>
                <div class="btn-group w-100" role="group">
                    <input type="radio" class="btn-check" name="swalTipoMatricula" id="swalTipoNovato" value="NOVATO" ${aluno.tipoMatricula === 'NOVATO' ? 'checked' : ''}>
                    <label class="btn btn-outline-light" for="swalTipoNovato">Novato — ${precos.valorMensalidadeNovato.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</label>

                    <input type="radio" class="btn-check" name="swalTipoMatricula" id="swalTipoVeterano" value="VETERANO" ${aluno.tipoMatricula !== 'NOVATO' ? 'checked' : ''}>
                    <label class="btn btn-outline-light" for="swalTipoVeterano">Veterano — ${precos.valorMensalidadeVeterano.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</label>
                </div>
            </div>
        `,
        didOpen: () => {
            maskCelularModal = IMask(document.getElementById('swalCelular'), { mask: '(00) 00000-0000' });
            maskCelularModal.value = celularSemDDI;
        },
        preConfirm: () => {
            const nomeCompleto = document.getElementById('swalNome').value.trim();
            const celularPuro = maskCelularModal.unmaskedValue;
            const idade = parseInt(document.getElementById('swalIdade').value);
            const diaVencimento = parseInt(document.getElementById('swalDiaVencimento').value);
            const tipoMatricula = document.querySelector('input[name="swalTipoMatricula"]:checked').value;

            if (!nomeCompleto) { Swal.showValidationMessage('Informe o nome completo.'); return false; }
            if (celularPuro.length !== 11) { Swal.showValidationMessage('Celular deve ter DDD + 9 dígitos.'); return false; }
            if (!diaVencimento || diaVencimento < 1 || diaVencimento > 31) { Swal.showValidationMessage('Dia de vencimento inválido.'); return false; }

            return { nomeCompleto, celularPuro, idade, diaVencimento, tipoMatricula };
        }
    });

    if (!dados) return; // cancelou o modal

    const payload = {
        cpf: aluno.cpf,
        nomeCompleto: dados.nomeCompleto,
        celular: '55' + dados.celularPuro,
        idade: dados.idade,
        diaVencimento: dados.diaVencimento,
        tipoMatricula: dados.tipoMatricula,
        ativo: true,
        dataMatricula: aluno.dataMatricula
    };

    try {
        const response = await apiFetch(`${API_URL}/${cpf}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) {
            Toast.fire({ icon: 'success', title: 'Dados atualizados!' });
            carregarAlunos();
        } else {
            const mensagem = await extrairMensagemDeErro(response, 'Não foi possível salvar as alterações.');
            Toast.fire({ icon: 'error', title: mensagem });
        }
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Não foi possível conectar ao sistema. Tente novamente em instantes.' });
    }
}

// Salvar (cadastro de novo aluno — a edição de alunos existentes tem sua própria janela, iniciarEdicao)
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;

    const cpfPuro = cpfMask.unmaskedValue;
    const celularPuro = celularMask.unmaskedValue;

    if (cpfsRegistados.includes(cpfPuro) || !cpfValido(cpfPuro) || celularPuro.length !== 11) {
        Toast.fire({ icon: 'error', title: 'Dados inválidos ou CPF já em uso.' });
        document.getElementById('cpf').classList.add('is-invalid');
        btnSalvar.disabled = false;
        return;
    }

    const aluno = {
        cpf: cpfPuro,
        nomeCompleto: document.getElementById('nomeCompleto').value,
        celular: '55' + celularPuro,
        idade: parseInt(document.getElementById('idade').value),
        diaVencimento: parseInt(document.getElementById('dataVencimento').value.split('-')[2]),
        tipoMatricula: document.querySelector('input[name="tipoMatricula"]:checked').value,
        ativo: true,
        dataMatricula: new Date().toISOString().split('T')[0] // Manda a data de hoje direto para o Java!
    };

    try {
        const response = await apiFetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aluno) });
        if (response.ok) {
            document.getElementById('formAluno').reset();
            cpfMask.value = ''; celularMask.value = '';
            document.getElementById('cpf').classList.remove('is-valid', 'is-invalid');
            document.getElementById('celular').classList.remove('is-valid', 'is-invalid');
            Toast.fire({ icon: 'success', title: 'Atleta matriculado!' });
            carregarAlunos();
        } else {
            const mensagem = await extrairMensagemDeErro(response, 'Não foi possível cadastrar o atleta.');
            Toast.fire({ icon: 'error', title: mensagem });
        }
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Não foi possível conectar ao sistema. Tente novamente em instantes.' });
    }
    btnSalvar.disabled = false;
});

async function registrarPagamento(cpf) {
    if ((await Swal.fire({title: 'Renovar?', icon: 'question', showCancelButton: true, confirmButtonColor: '#E60000', background: '#141414', color: '#fff'})).isConfirmed) {
        try {
            const response = await apiFetch(`${API_URL}/${cpf}/pagar`, { method: 'PUT' });
            if (!response.ok) {
                Toast.fire({ icon: 'error', title: 'Não foi possível registrar o pagamento.' });
                return;
            }
            Toast.fire({ icon: 'success', title: 'Pagamento registrado!' });
            carregarAlunos();
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Não foi possível conectar ao sistema. Tente novamente em instantes.' });
        }
    }
}

async function removerAluno(cpf) {
    if ((await Swal.fire({title: 'Inativar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#E60000', background: '#141414', color: '#fff'})).isConfirmed) {
        try {
            const response = await apiFetch(`${API_URL}/${cpf}`, { method: 'DELETE' });
            if (!response.ok) {
                Toast.fire({ icon: 'error', title: 'Não foi possível inativar o atleta.' });
                return;
            }
            Toast.fire({ icon: 'success', title: 'Atleta inativado.' });
            carregarAlunos();
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Não foi possível conectar ao sistema. Tente novamente em instantes.' });
        }
    }
}

async function verHistorico(cpf) {
    const aluno = ultimaListaProcessada.find(a => a.cpf === cpf);
    const nome = aluno ? aluno.nomeCompleto : '';

    try {
        const response = await apiFetch(`${API_URL}/${cpf}/pagamentos`);
        if (!response.ok) {
            Toast.fire({ icon: 'error', title: 'Não foi possível buscar o histórico.' });
            return;
        }
        const pagamentos = await response.json();

        const corpoTabela = pagamentos.length === 0
            ? '<p class="text-muted text-center my-3">Nenhum pagamento registrado ainda.</p>'
            : `<table class="tabela-historico">
                <thead><tr><th>Data</th><th class="text-end">Valor</th></tr></thead>
                <tbody>
                    ${pagamentos.map(p => `
                        <tr>
                            <td>${new Date(p.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                            <td class="text-end">${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                    `).join('')}
                </tbody>
               </table>`;

        Swal.fire({
            title: `Histórico de ${nome}`,
            html: corpoTabela,
            background: '#141414', color: '#fff',
            confirmButtonColor: '#E60000',
            confirmButtonText: 'Fechar'
        });
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Falha de rede ao buscar histórico.' });
    }
}

async function cobrarAgora(cpf) {
    const aluno = ultimaListaProcessada.find(a => a.cpf === cpf);
    const nome = aluno ? aluno.nomeCompleto : 'este aluno';

    const confirmacao = await Swal.fire({
        title: `Cobrar ${nome} agora?`,
        text: 'Uma mensagem de cobrança será enviada pelo WhatsApp imediatamente.',
        icon: 'question', showCancelButton: true,
        confirmButtonColor: '#E60000', background: '#141414', color: '#fff',
        confirmButtonText: 'Enviar cobrança', cancelButtonText: 'Cancelar'
    });
    if (!confirmacao.isConfirmed) return;

    try {
        const response = await apiFetch(`${API_URL}/${cpf}/cobrar`, { method: 'POST' });
        if (response.ok) {
            Toast.fire({ icon: 'success', title: 'Cobrança enviada pelo WhatsApp!' });
        } else if (response.status === 502) {
            Toast.fire({ icon: 'error', title: 'Não foi possível falar com o robô do WhatsApp. Ele está conectado?' });
        } else {
            Toast.fire({ icon: 'error', title: 'Não foi possível enviar a cobrança.' });
        }
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Não foi possível conectar ao sistema. Tente novamente em instantes.' });
    }
}

// Exporta a lista atualmente carregada (respeitando o mês do dashboard) como CSV,
// para levar à contabilidade ou guardar um registro do fechamento do mês.
// Exporta o fechamento do mês como planilha .xlsx formatada (cabeçalho,
// cores por status, valores em moeda e um resumo no final) — usa os dados já
// carregados na tela, sem nova chamada ao sistema.
async function exportarPlanilha() {
    if (ultimaListaProcessada.length === 0) {
        Toast.fire({ icon: 'warning', title: 'Não há alunos para exportar.' });
        return;
    }

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const hoje = new Date();
    const nomeMes = nomesMeses[hoje.getMonth()];
    const ano = hoje.getFullYear();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vipers Fight Team';
    workbook.created = hoje;

    const planilha = workbook.addWorksheet(`Fechamento ${nomeMes}`, {
        views: [{ state: 'frozen', ySplit: 4 }]
    });

    planilha.columns = [
        { width: 30 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 20 }
    ];

    // Cabeçalho com identidade visual da equipe
    planilha.mergeCells('A1:E1');
    const celTitulo = planilha.getCell('A1');
    celTitulo.value = 'VIPERS FIGHT TEAM';
    celTitulo.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    celTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
    celTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE60000' } };
    planilha.getRow(1).height = 30;

    planilha.mergeCells('A2:E2');
    const celSubtitulo = planilha.getCell('A2');
    celSubtitulo.value = `Fechamento de ${nomeMes} de ${ano}`;
    celSubtitulo.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
    celSubtitulo.alignment = { horizontal: 'center', vertical: 'middle' };
    celSubtitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    planilha.getRow(2).height = 22;
    planilha.getRow(3).height = 6;

    // Cabeçalho da tabela
    const linhaCabecalho = planilha.getRow(4);
    linhaCabecalho.values = ['Atleta', 'Celular', 'Dia de Vencimento', 'Status', 'Valor da Mensalidade'];
    linhaCabecalho.eachCell(celula => {
        celula.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
        celula.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    linhaCabecalho.height = 22;

    // Mesmas cores usadas nos status da tela, só que suavizadas para impressão em papel
    const corPorStatus = {
        'Vencido': 'FFF8D7DA',
        'Vence em breve': 'FFFFF3CD',
        'Aguardando': 'FFF2F2F2'
    };

    ultimaListaProcessada.forEach(aluno => {
        const linha = planilha.addRow([
            aluno.nomeCompleto,
            formatarCelular(aluno.celular),
            aluno.diaVencimento,
            aluno.statusVencimento.texto,
            aluno.valorMensalidade
        ]);

        linha.getCell(3).alignment = { horizontal: 'center' };
        linha.getCell(4).alignment = { horizontal: 'center' };
        linha.getCell(5).numFmt = '"R$" #,##0.00';

        const corDeFundo = aluno.pagouEsteMes ? 'FFD4EDDA' : corPorStatus[aluno.statusVencimento.texto];
        if (corDeFundo) {
            linha.eachCell(celula => {
                celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: corDeFundo } };
            });
        }
        linha.eachCell(celula => {
            celula.border = { bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } } };
        });
    });

    // Resumo do mês, no rodapé da planilha
    planilha.addRow([]);

    const totalArrecadado = ultimaListaProcessada.filter(a => a.pagouEsteMes).reduce((soma, a) => soma + a.valorMensalidade, 0);
    const totalEsperado = ultimaListaProcessada.reduce((soma, a) => soma + a.valorMensalidade, 0);
    const pagantes = ultimaListaProcessada.filter(a => a.pagouEsteMes).length;
    const pendentes = ultimaListaProcessada.length - pagantes;

    const linhaArrecadado = planilha.addRow(['', '', '', 'Total arrecadado', totalArrecadado]);
    linhaArrecadado.getCell(4).font = { bold: true };
    linhaArrecadado.getCell(5).font = { bold: true, color: { argb: 'FF1E7E34' } };
    linhaArrecadado.getCell(5).numFmt = '"R$" #,##0.00';

    const linhaEsperado = planilha.addRow(['', '', '', 'Total esperado', totalEsperado]);
    linhaEsperado.getCell(4).font = { bold: true };
    linhaEsperado.getCell(5).font = { bold: true };
    linhaEsperado.getCell(5).numFmt = '"R$" #,##0.00';

    const linhaContagem = planilha.addRow(['', '', '', 'Pagantes / Pendentes', `${pagantes} / ${pendentes}`]);
    linhaContagem.getCell(4).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fechamento-${nomeMes.toLowerCase()}-${ano}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);

    Toast.fire({ icon: 'success', title: 'Planilha exportada!' });
}

// Esconde ações de ADMIN (cadastro, edição, exclusão, configurações) quando
// o usuário logado é OPERADOR. A checagem "de verdade" continua no backend
// (@PreAuthorize / SecurityConfig) - isso aqui é só UX.
function aplicarRestricoesDePapel() {
    const somenteAdmin = document.querySelectorAll('.somente-admin');
    somenteAdmin.forEach(el => el.classList.toggle('d-none', papelAtual !== 'ADMIN'));

    const rotuloUsuario = document.getElementById('usuarioLogado');
    if (rotuloUsuario) rotuloUsuario.innerText = `${usuarioAtual} (${papelAtual})`;

    // Se o usuário OPERADOR estiver numa aba exclusiva de ADMIN (Cadastro/Configurações,
    // que ficam escondidas acima), manda ele para a aba de Administração.
    if (papelAtual !== 'ADMIN') {
        const abaCadastro = document.getElementById('abaCadastro');
        const abaConfiguracoes = document.getElementById('abaConfiguracoes');
        if (abaCadastro?.classList.contains('active') || abaConfiguracoes?.classList.contains('active')) {
            const linkAdministracao = document.querySelector('button.nav-link[onclick*="abaAdministracao"]');
            if (linkAdministracao) mudarAba('abaAdministracao', linkAdministracao);
        }
    }
}

async function iniciarApp() {
    aplicarRestricoesDePapel();
    document.getElementById('overlayCarregando').classList.remove('escondido');
    await carregarConfiguracoes();
    await carregarAlunos();
    verificarStatusWhatsapp();
    setInterval(verificarStatusWhatsapp, 8000); // mais frequente que antes: mantém o QR code sempre atualizado
    document.getElementById('overlayCarregando').classList.add('escondido');
}

(async function iniciar() {
    document.getElementById('overlayCarregando').classList.add('escondido');
    if (tokenAtual) {
        mostrarApp();
        await iniciarApp();
    } else {
        mostrarTelaLogin();
    }
})();
