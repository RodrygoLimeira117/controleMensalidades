const API_URL = 'http://localhost:8080/api/alunos';
const CONFIG_URL = 'http://localhost:8080/api/config';

let cpfsRegistados = [];

// Valores de mensalidade: vêm da API (endpoint /api/config), não ficam mais
// fixos no JavaScript. Esses aqui só servem de fallback caso a API esteja
// fora do ar quando a tela carrega.
let precos = { valorMensalidadePadrao: 70, valorMensalidadePrimeiroMes: 80 };

const cpfMask = IMask(document.getElementById('cpf'), { mask: '000.000.000-00' });
const celularMask = IMask(document.getElementById('celular'), { mask: '(00) 00000-0000' });
const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1a1a1a', color: '#fff' });

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

// Função Principal de Carregamento
async function carregarAlunos() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }
        const alunos = await response.json();

        // Variáveis financeiras
        let arrecadado = 0;
        let esperado = 0;
        let pagantes = 0;
        let pendentes = 0;

        const hoje = new Date();
        const mesAtual = hoje.getMonth();

        // Setar o nome do mês na tela
        const nomesMeses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
        document.getElementById('mesAtualNome').innerText = nomesMeses[mesAtual];

        const tabela = document.getElementById('tabelaAlunos');
        tabela.innerHTML = '';
        cpfsRegistados = [];

        alunos.forEach(aluno => {
            cpfsRegistados.push(aluno.cpf);

            // --- LÓGICA FINANCEIRA ---
            let valorMensalidade = precos.valorMensalidadePadrao;
            if (aluno.dataMatricula) {
                // Verifica se a matrícula ocorreu neste exato mês/ano
                const anoMesMatricula = aluno.dataMatricula.substring(0, 7); // Ex: "2026-06"
                const anoMesAtual = hoje.toISOString().substring(0, 7);
                if (anoMesMatricula === anoMesAtual) {
                    valorMensalidade = precos.valorMensalidadePrimeiroMes;
                }
            }

            esperado += valorMensalidade;

            // Verifica se pagou neste mês
            let pagouEsteMes = false;
            if (aluno.ultimoPagamento) {
                const anoMesPagamento = aluno.ultimoPagamento.substring(0, 7);
                if (anoMesPagamento === hoje.toISOString().substring(0, 7)) {
                    pagouEsteMes = true;
                }
            }

            if (pagouEsteMes) {
                arrecadado += valorMensalidade;
                pagantes++;
            } else {
                pendentes++;
            }

            // --- LÓGICA DA TABELA ---
            const dataPagamento = aluno.ultimoPagamento ? new Date(aluno.ultimoPagamento + 'T12:00:00').toLocaleDateString('pt-BR') : 'Pendente';
            const badgeClass = pagouEsteMes ? 'bg-success' : 'bg-danger';

            let cel = aluno.celular.replace(/^55/, '');
            if (cel.length === 11) cel = `(${cel.substring(0,2)}) ${cel.substring(2,7)}-${cel.substring(7)}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-white">${aluno.nomeCompleto}</td>
                <td style="color: var(--text-muted);"><i class="fa-brands fa-whatsapp me-1 opacity-50"></i>${cel}</td>
                <td><span style="color: var(--text-muted);">Dia</span> <strong class="text-white">${aluno.diaVencimento}</strong></td>
                <td><span class="badge ${badgeClass}"><i class="fa-solid fa-clock-rotate-left me-1"></i>${dataPagamento}</span></td>
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

        // Atualiza o Dashboard Financeiro
        document.getElementById('valorCaixa').innerText = arrecadado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('valorEsperado').innerText = esperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('qtdPagantes').innerText = pagantes;
        document.getElementById('qtdPendentes').innerText = pendentes;

    } catch (error) {
        console.error('Erro de conexão:', error);
        Toast.fire({ icon: 'error', title: 'Não foi possível conectar à API. Verifique se o backend está rodando.' });
    }
}

// Salvar
document.getElementById('formAluno').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSalvar = document.getElementById('btnSalvar');
    btnSalvar.disabled = true;

    const cpfPuro = cpfMask.unmaskedValue;
    const celularPuro = celularMask.unmaskedValue;

    if (cpfsRegistados.includes(cpfPuro) || cpfPuro.length !== 11 || celularPuro.length !== 11) {
        Toast.fire({ icon: 'error', title: 'Dados inválidos ou CPF já em uso.' });
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
})();
