const API_URL = 'http://localhost:8080/api/alunos';
const CONFIG_URL = 'http://localhost:8080/api/config';
const WHATSAPP_STATUS_URL = 'http://localhost:3000/api/whatsapp/status';

let cpfsRegistados = [];

// Guarda a última lista de alunos já processada (com valor de mensalidade e
// status de pagamento calculados) para permitir buscar/filtrar sem precisar
// buscar tudo de novo na API a cada tecla digitada.
let ultimaListaProcessada = [];

// Valores de mensalidade: vêm da API (endpoint /api/config), não ficam mais
// fixos no JavaScript. Esses aqui só servem de fallback caso a API esteja
// fora do ar quando a tela carrega.
let precos = { valorMensalidadePadrao: 70, valorMensalidadePrimeiroMes: 80 };

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
        const response = await fetch(CONFIG_URL);
        if (response.ok) {
            precos = await response.json();
        }
    } catch (error) {
        console.error('Não foi possível buscar /api/config, usando valores padrão:', error);
        Toast.fire({ icon: 'warning', title: 'Usando valores de mensalidade padrão (API de configuração indisponível).' });
    }
}

// Consulta se o robô do WhatsApp está conectado e atualiza o badge no topo da tela.
async function verificarStatusWhatsapp() {
    const badge = document.getElementById('statusWhatsapp');
    try {
        const response = await fetch(WHATSAPP_STATUS_URL);
        const dados = await response.json();
        if (dados.conectado) {
            badge.className = 'status-whatsapp mt-2 conectado';
            badge.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Robô do WhatsApp conectado';
        } else {
            badge.className = 'status-whatsapp mt-2 desconectado';
            badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> WhatsApp não autenticado (escaneie o QR code no terminal do worker)';
        }
    } catch (error) {
        badge.className = 'status-whatsapp mt-2 desconectado';
        badge.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> Worker do WhatsApp offline';
    }
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
        let valorMensalidade = precos.valorMensalidadePadrao;
        if (aluno.dataMatricula && aluno.dataMatricula.substring(0, 7) === anoMesAtual) {
            valorMensalidade = precos.valorMensalidadePrimeiroMes;
        }
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

        let cel = aluno.celular.replace(/^55/, '');
        if (cel.length === 11) cel = `(${cel.substring(0,2)}) ${cel.substring(2,7)}-${cel.substring(7)}`;
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
            <td class="text-end">
                <button class="btn btn-outline-success btn-action me-1" onclick="registrarPagamento('${aluno.cpf}')" title="Receber">
                    <i class="fa-solid fa-dollar-sign"></i>
                </button>
                <button class="btn btn-outline-danger btn-action" onclick="removerAluno('${aluno.cpf}')" title="Inativar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

// Função Principal de Carregamento
async function carregarAlunos() {
    try {
        const response = await fetch(API_URL);
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
        Toast.fire({ icon: 'error', title: 'Não foi possível conectar à API. Verifique se o backend está rodando.' });
    }
}

// Busca e filtro reagem na hora, sem precisar recarregar a lista
document.getElementById('buscaAluno').addEventListener('input', renderizarTabela);
document.getElementById('filtroPendentes').addEventListener('change', renderizarTabela);

// Salvar
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
        ativo: true,
        dataMatricula: new Date().toISOString().split('T')[0] // Manda a data de hoje direto para o Java!
    };

    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aluno) });
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
        Toast.fire({ icon: 'error', title: 'Falha de rede. Verifique se o backend está rodando.' });
    }
    btnSalvar.disabled = false;
});

async function registrarPagamento(cpf) {
    if ((await Swal.fire({title: 'Renovar?', icon: 'question', showCancelButton: true, confirmButtonColor: '#E60000', background: '#141414', color: '#fff'})).isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/${cpf}/pagar`, { method: 'PUT' });
            if (!response.ok) {
                Toast.fire({ icon: 'error', title: 'Não foi possível registrar o pagamento.' });
                return;
            }
            Toast.fire({ icon: 'success', title: 'Pagamento registrado!' });
            carregarAlunos();
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Falha de rede. Verifique se o backend está rodando.' });
        }
    }
}

async function removerAluno(cpf) {
    if ((await Swal.fire({title: 'Inativar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#E60000', background: '#141414', color: '#fff'})).isConfirmed) {
        try {
            const response = await fetch(`${API_URL}/${cpf}`, { method: 'DELETE' });
            if (!response.ok) {
                Toast.fire({ icon: 'error', title: 'Não foi possível inativar o atleta.' });
                return;
            }
            Toast.fire({ icon: 'success', title: 'Atleta inativado.' });
            carregarAlunos();
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Falha de rede. Verifique se o backend está rodando.' });
        }
    }
}

(async function iniciar() {
    await carregarConfiguracoes();
    await carregarAlunos();
    verificarStatusWhatsapp();
    setInterval(verificarStatusWhatsapp, 30000); // reconsulta a cada 30s
    document.getElementById('overlayCarregando').classList.add('escondido');
})();
