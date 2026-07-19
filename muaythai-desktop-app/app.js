const API_URL = 'http://localhost:8080/api/alunos';
const CONFIG_URL = 'http://localhost:8080/api/config';
const WHATSAPP_STATUS_URL = 'http://localhost:3000/api/whatsapp/status';

let cpfsRegistados = [];

// Quando não-nulo, o formulário está editando este CPF em vez de cadastrar um novo aluno.
let modoEdicao = null;

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
        const response = await fetch(CONFIG_URL);
        if (response.ok) {
            precos = await response.json();
        }
    } catch (error) {
        console.error('Não foi possível buscar /api/config, usando valores padrão:', error);
        Toast.fire({ icon: 'warning', title: 'Usando valores de mensalidade padrão (API de configuração indisponível).' });
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
        const response = await fetch(CONFIG_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
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
        Toast.fire({ icon: 'error', title: 'Falha de rede. Verifique se o backend está rodando.' });
    }
    btn.disabled = false;
});

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
            <td class="text-end acoes-aluno">
                <button class="btn btn-outline-success btn-action" onclick="registrarPagamento('${aluno.cpf}')" title="Receber pagamento">
                    <i class="fa-solid fa-dollar-sign"></i>
                </button>
                <button class="btn btn-outline-success btn-action" onclick="cobrarAgora('${aluno.cpf}')" title="Cobrar agora pelo WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i>
                </button>
                <button class="btn btn-outline-light btn-action" onclick="iniciarEdicao('${aluno.cpf}')" title="Editar dados do atleta">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-outline-light btn-action" onclick="verHistorico('${aluno.cpf}')" title="Ver histórico de pagamentos">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </button>
                <button class="btn btn-outline-danger btn-action" onclick="removerAluno('${aluno.cpf}')" title="Inativar atleta">
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

// Preenche o formulário com os dados de um aluno já cadastrado e muda para modo edição.
// O CPF nunca é editável (é a chave do aluno no backend), então o campo fica travado.
function iniciarEdicao(cpf) {
    const aluno = ultimaListaProcessada.find(a => a.cpf === cpf);
    if (!aluno) return;

    modoEdicao = cpf;

    cpfMask.value = aluno.cpf;
    document.getElementById('cpf').disabled = true;

    document.getElementById('nomeCompleto').value = aluno.nomeCompleto;
    celularMask.value = aluno.celular.replace(/^55/, '');
    document.getElementById('idade').value = aluno.idade;
    document.getElementById(aluno.tipoMatricula === 'NOVATO' ? 'tipoNovato' : 'tipoVeterano').checked = true;

    // O input de vencimento é do tipo "data" mas só usamos o dia do mês; para
    // reaproveitar o mesmo campo na edição, montamos uma data com o dia salvo
    // e o mês/ano atuais (só o dia importa quando o formulário for salvo).
    const hoje = new Date();
    const diaFormatado = String(aluno.diaVencimento).padStart(2, '0');
    const mesFormatado = String(hoje.getMonth() + 1).padStart(2, '0');
    document.getElementById('dataVencimento').value = `${hoje.getFullYear()}-${mesFormatado}-${diaFormatado}`;

    document.getElementById('tituloFormulario').innerHTML = '<i class="fa-solid fa-pen text-viper me-2"></i>Editar Atleta';
    document.getElementById('btnSalvar').innerText = 'Salvar Alterações';
    document.getElementById('btnCancelarEdicao').classList.remove('d-none');

    document.getElementById('cpf').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicao() {
    modoEdicao = null;
    document.getElementById('formAluno').reset();
    cpfMask.value = ''; celularMask.value = '';
    document.getElementById('cpf').disabled = false;
    document.getElementById('cpf').classList.remove('is-valid', 'is-invalid');
    document.getElementById('celular').classList.remove('is-valid', 'is-invalid');
    document.getElementById('tituloFormulario').innerHTML = '<i class="fa-solid fa-user-plus text-viper me-2"></i>Nova Matrícula';
    document.getElementById('btnSalvar').innerText = 'Salvar Aluno';
    document.getElementById('btnCancelarEdicao').classList.add('d-none');
}

// Salvar
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;

    const cpfPuro = modoEdicao || cpfMask.unmaskedValue;
    const celularPuro = celularMask.unmaskedValue;

    // No modo edição o CPF já existe (é o próprio aluno sendo editado), então
    // não faz sentido rejeitar por já estar em cpfsRegistados.
    const cpfEmConflito = !modoEdicao && cpfsRegistados.includes(cpfPuro);

    if (cpfEmConflito || !cpfValido(cpfPuro) || celularPuro.length !== 11) {
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

    const editando = !!modoEdicao;
    const url = editando ? `${API_URL}/${modoEdicao}` : API_URL;
    const metodo = editando ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aluno) });
        if (response.ok) {
            if (editando) {
                cancelarEdicao();
            } else {
                document.getElementById('formAluno').reset();
                cpfMask.value = ''; celularMask.value = '';
                document.getElementById('cpf').classList.remove('is-valid', 'is-invalid');
                document.getElementById('celular').classList.remove('is-valid', 'is-invalid');
            }
            Toast.fire({ icon: 'success', title: editando ? 'Dados atualizados!' : 'Atleta matriculado!' });
            carregarAlunos();
        } else {
            const mensagem = await extrairMensagemDeErro(response, editando ? 'Não foi possível salvar as alterações.' : 'Não foi possível cadastrar o atleta.');
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

async function verHistorico(cpf) {
    const aluno = ultimaListaProcessada.find(a => a.cpf === cpf);
    const nome = aluno ? aluno.nomeCompleto : '';

    try {
        const response = await fetch(`${API_URL}/${cpf}/pagamentos`);
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
        const response = await fetch(`${API_URL}/${cpf}/cobrar`, { method: 'POST' });
        if (response.ok) {
            Toast.fire({ icon: 'success', title: 'Cobrança enviada pelo WhatsApp!' });
        } else if (response.status === 502) {
            Toast.fire({ icon: 'error', title: 'Não foi possível falar com o robô do WhatsApp. Ele está conectado?' });
        } else {
            Toast.fire({ icon: 'error', title: 'Não foi possível enviar a cobrança.' });
        }
    } catch (error) {
        Toast.fire({ icon: 'error', title: 'Falha de rede. Verifique se o backend está rodando.' });
    }
}

// Exporta a lista atualmente carregada (respeitando o mês do dashboard) como CSV,
// para levar à contabilidade ou guardar um registro do fechamento do mês.
function exportarCSV() {
    if (ultimaListaProcessada.length === 0) {
        Toast.fire({ icon: 'warning', title: 'Não há alunos para exportar.' });
        return;
    }

    const cabecalho = ['Nome', 'Celular', 'Dia de Vencimento', 'Status', 'Valor da Mensalidade'];
    const linhas = ultimaListaProcessada.map(aluno => [
        aluno.nomeCompleto,
        aluno.celular,
        aluno.diaVencimento,
        aluno.statusVencimento.texto,
        aluno.valorMensalidade.toFixed(2).replace('.', ',')
    ]);

    // Escapa aspas e envolve cada campo em aspas para lidar com vírgulas em nomes
    const escaparCampo = (campo) => `"${String(campo).replace(/"/g, '""')}"`;
    const linhasCsv = [cabecalho, ...linhas].map(linha => linha.map(escaparCampo).join(';'));
    const csv = '\uFEFF' + linhasCsv.join('\r\n'); // BOM para o Excel reconhecer acentuação

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nomesMeses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    link.href = url;
    link.download = `fechamento-${nomesMeses[new Date().getMonth()]}-${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    Toast.fire({ icon: 'success', title: 'CSV exportado!' });
}

(async function iniciar() {
    await carregarConfiguracoes();
    await carregarAlunos();
    verificarStatusWhatsapp();
    setInterval(verificarStatusWhatsapp, 30000); // reconsulta a cada 30s
    document.getElementById('overlayCarregando').classList.add('escondido');
})();
