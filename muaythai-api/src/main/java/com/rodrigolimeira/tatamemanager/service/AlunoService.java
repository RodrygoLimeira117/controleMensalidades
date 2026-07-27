package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.model.Configuracao;
import com.rodrigolimeira.tatamemanager.model.Pagamento;
import com.rodrigolimeira.tatamemanager.model.TipoMatricula;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import com.rodrigolimeira.tatamemanager.repository.PagamentoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Concentra as regras de negócio relacionadas a alunos, deixando o
 * controller responsável apenas por traduzir requisições HTTP em chamadas
 * a este serviço.
 */
@Service
public class AlunoService {

    private final AlunoRepository alunoRepository;
    private final PagamentoRepository pagamentoRepository;
    private final ConfiguracaoService configuracaoService;

    public AlunoService(AlunoRepository alunoRepository,
                         PagamentoRepository pagamentoRepository,
                         ConfiguracaoService configuracaoService) {
        this.alunoRepository = alunoRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.configuracaoService = configuracaoService;
    }

    public List<Aluno> listarAtivos() {
        return alunoRepository.findByAtivoTrue();
    }

    public Optional<Aluno> buscarPorCpf(String cpf) {
        return alunoRepository.findById(cpf);
    }

    public Aluno cadastrar(Aluno aluno) {
        aluno.setAtivo(true);
        if (aluno.getDataMatricula() == null) {
            aluno.setDataMatricula(LocalDate.now());
        }
        return alunoRepository.save(aluno);
    }

    // CPF não é editável de propósito: é a chave primária do aluno. Quem
    // errou o CPF precisa inativar e recadastrar; os outros dados, não.
    // tipoMatricula É editável aqui: é assim que um aluno "novato" vira
    // "veterano" quando o primeiro mês passa (troca manual, não automática).
    public Optional<Aluno> editar(String cpf, Aluno dadosAtualizados) {
        return alunoRepository.findById(cpf).map(aluno -> {
            aluno.setNomeCompleto(dadosAtualizados.getNomeCompleto());
            aluno.setCelular(dadosAtualizados.getCelular());
            aluno.setIdade(dadosAtualizados.getIdade());
            aluno.setDiaVencimento(dadosAtualizados.getDiaVencimento());
            aluno.setTipoMatricula(dadosAtualizados.getTipoMatricula());
            return alunoRepository.save(aluno);
        });
    }

    public Optional<Aluno> inativar(String cpf) {
        return alunoRepository.findById(cpf).map(aluno -> {
            aluno.setAtivo(false);
            return alunoRepository.save(aluno);
        });
    }

    public Optional<Aluno> registrarPagamento(String cpf) {
        return alunoRepository.findById(cpf).map(aluno -> {
            LocalDate hoje = LocalDate.now();
            aluno.setUltimoPagamento(hoje);
            // Limpa o registro do robô: no próximo mês ele volta a cobrar normalmente
            aluno.setDataUltimoAviso(null);
            Aluno salvo = alunoRepository.save(aluno);

            pagamentoRepository.save(new Pagamento(salvo, hoje, calcularValorMensalidade(salvo)));

            return salvo;
        });
    }

    public List<Pagamento> listarHistoricoPagamentos(String cpf) {
        return pagamentoRepository.findByAlunoCpfOrderByDataPagamentoDesc(cpf);
    }

    // O valor da mensalidade vem da escolha explícita feita no cadastro/edição
    // (novato x veterano), não mais de comparar a data de matrícula com hoje.
    // Os valores em si vêm da configuração salva no banco (ajustável na tela
    // de Configurações), não de constantes fixas no código.
    private double calcularValorMensalidade(Aluno aluno) {
        Configuracao configuracao = configuracaoService.obter();
        return aluno.getTipoMatricula() == TipoMatricula.NOVATO
                ? configuracao.getValorMensalidadeNovato()
                : configuracao.getValorMensalidadeVeterano();
    }
}
