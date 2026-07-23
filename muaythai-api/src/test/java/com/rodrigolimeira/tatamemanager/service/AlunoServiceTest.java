package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.model.Configuracao;
import com.rodrigolimeira.tatamemanager.model.Pagamento;
import com.rodrigolimeira.tatamemanager.model.TipoMatricula;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import com.rodrigolimeira.tatamemanager.repository.PagamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlunoServiceTest {

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private PagamentoRepository pagamentoRepository;

    @Mock
    private ConfiguracaoService configuracaoService;

    private AlunoService alunoService;

    private Aluno novoAluno(TipoMatricula tipo) {
        return new Aluno("11144477735", "Fulano de Tal", "5581999999999", 20, 10, tipo);
    }

    @BeforeEach
    void setUp() {
        alunoService = new AlunoService(alunoRepository, pagamentoRepository, configuracaoService);
        // save() de um mock por padrão devolve null; aqui fazemos ele devolver o mesmo objeto recebido,
        // como o JPA faria de verdade.
        lenient().when(alunoRepository.save(any(Aluno.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(configuracaoService.obter()).thenReturn(new Configuracao(80.0, 70.0));
    }

    @Test
    void cadastrar_deveMarcarComoAtivoEDefinirDataDeMatriculaHoje_quandoNaoInformada() {
        Aluno aluno = novoAluno(TipoMatricula.NOVATO);
        aluno.setAtivo(false); // simula um valor indevido vindo de fora

        Aluno salvo = alunoService.cadastrar(aluno);

        assertThat(salvo.isAtivo()).isTrue();
        assertThat(salvo.getDataMatricula()).isEqualTo(LocalDate.now());
        verify(alunoRepository).save(aluno);
    }

    @Test
    void cadastrar_naoDeveSobrescreverDataDeMatriculaJaInformada() {
        Aluno aluno = novoAluno(TipoMatricula.NOVATO);
        LocalDate dataEscolhida = LocalDate.of(2025, 1, 15);
        aluno.setDataMatricula(dataEscolhida);

        Aluno salvo = alunoService.cadastrar(aluno);

        assertThat(salvo.getDataMatricula()).isEqualTo(dataEscolhida);
    }

    @Test
    void listarAtivos_deveDelegarParaORepositorio() {
        List<Aluno> ativos = List.of(novoAluno(TipoMatricula.VETERANO));
        when(alunoRepository.findByAtivoTrue()).thenReturn(ativos);

        assertThat(alunoService.listarAtivos()).isEqualTo(ativos);
    }

    @Test
    void buscarPorCpf_deveDelegarParaORepositorio() {
        Aluno aluno = novoAluno(TipoMatricula.VETERANO);
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        assertThat(alunoService.buscarPorCpf("11144477735")).contains(aluno);
    }

    @Test
    void editar_deveAtualizarDadosETipoDeMatriculaMasNuncaOCpf() {
        Aluno existente = novoAluno(TipoMatricula.NOVATO);
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(existente));

        // Cenário real: o primeiro mês passou, o dono da academia edita o
        // aluno para virar "veterano" e passar a pagar o valor normal.
        Aluno dadosNovos = new Aluno("00000000000", "Novo Nome", "5581988887777", 21, 20, TipoMatricula.VETERANO);

        Optional<Aluno> resultado = alunoService.editar("11144477735", dadosNovos);

        assertThat(resultado).isPresent();
        Aluno atualizado = resultado.get();
        assertThat(atualizado.getCpf()).isEqualTo("11144477735"); // CPF não muda, mesmo que venha diferente no corpo
        assertThat(atualizado.getNomeCompleto()).isEqualTo("Novo Nome");
        assertThat(atualizado.getCelular()).isEqualTo("5581988887777");
        assertThat(atualizado.getIdade()).isEqualTo(21);
        assertThat(atualizado.getDiaVencimento()).isEqualTo(20);
        assertThat(atualizado.getTipoMatricula()).isEqualTo(TipoMatricula.VETERANO);
    }

    @Test
    void editar_deveDevolverVazio_quandoCpfNaoExiste() {
        when(alunoRepository.findById("99999999999")).thenReturn(Optional.empty());

        assertThat(alunoService.editar("99999999999", novoAluno(TipoMatricula.VETERANO))).isEmpty();
        verify(alunoRepository, never()).save(any());
    }

    @Test
    void inativar_deveDesativarAlunoExistente() {
        Aluno aluno = novoAluno(TipoMatricula.VETERANO);
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        Optional<Aluno> resultado = alunoService.inativar("11144477735");

        assertThat(resultado).isPresent();
        assertThat(resultado.get().isAtivo()).isFalse();
        verify(alunoRepository).save(aluno);
    }

    @Test
    void inativar_deveDevolverVazio_quandoCpfNaoExiste() {
        when(alunoRepository.findById("99999999999")).thenReturn(Optional.empty());

        Optional<Aluno> resultado = alunoService.inativar("99999999999");

        assertThat(resultado).isEmpty();
        verify(alunoRepository, never()).save(any());
    }

    @Test
    void registrarPagamento_deveAtualizarDataDePagamentoELimparAvisoAnterior() {
        Aluno aluno = novoAluno(TipoMatricula.VETERANO);
        aluno.setDataUltimoAviso(LocalDate.now().minusDays(2));
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        Optional<Aluno> resultado = alunoService.registrarPagamento("11144477735");

        assertThat(resultado).isPresent();
        assertThat(resultado.get().getUltimoPagamento()).isEqualTo(LocalDate.now());
        assertThat(resultado.get().getDataUltimoAviso()).isNull();
    }

    @Test
    void registrarPagamento_deveGravarNoHistoricoComValorDeVeterano_quandoTipoVeterano() {
        Aluno aluno = novoAluno(TipoMatricula.VETERANO);
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        alunoService.registrarPagamento("11144477735");

        ArgumentCaptor<Pagamento> captor = ArgumentCaptor.forClass(Pagamento.class);
        verify(pagamentoRepository).save(captor.capture());
        assertThat(captor.getValue().getValor()).isEqualTo(70.0);
        assertThat(captor.getValue().getDataPagamento()).isEqualTo(LocalDate.now());
    }

    @Test
    void registrarPagamento_deveGravarNoHistoricoComValorDeNovato_quandoTipoNovato() {
        Aluno aluno = novoAluno(TipoMatricula.NOVATO);
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        alunoService.registrarPagamento("11144477735");

        ArgumentCaptor<Pagamento> captor = ArgumentCaptor.forClass(Pagamento.class);
        verify(pagamentoRepository).save(captor.capture());
        assertThat(captor.getValue().getValor()).isEqualTo(80.0);
    }

    @Test
    void registrarPagamento_deveUsarValoresAtuaisDaConfiguracao_naoValoresFixos() {
        // Confirma que o valor vem da configuração salva no banco, não de uma
        // constante no código: se o dono da academia reajustar o preço, o
        // próximo pagamento já reflete o novo valor sem precisar recompilar nada.
        when(configuracaoService.obter()).thenReturn(new Configuracao(100.0, 90.0));
        Aluno aluno = novoAluno(TipoMatricula.NOVATO);
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        alunoService.registrarPagamento("11144477735");

        ArgumentCaptor<Pagamento> captor = ArgumentCaptor.forClass(Pagamento.class);
        verify(pagamentoRepository).save(captor.capture());
        assertThat(captor.getValue().getValor()).isEqualTo(100.0);
    }

    @Test
    void registrarPagamento_deveDevolverVazio_quandoCpfNaoExiste() {
        when(alunoRepository.findById("99999999999")).thenReturn(Optional.empty());

        assertThat(alunoService.registrarPagamento("99999999999")).isEmpty();
        verify(pagamentoRepository, never()).save(any());
    }

    @Test
    void listarHistoricoPagamentos_deveDelegarParaORepositorio() {
        List<Pagamento> historico = List.of(new Pagamento(novoAluno(TipoMatricula.VETERANO), LocalDate.now(), 70.0));
        when(pagamentoRepository.findByAlunoCpfOrderByDataPagamentoDesc("11144477735")).thenReturn(historico);

        assertThat(alunoService.listarHistoricoPagamentos("11144477735")).isEqualTo(historico);
    }
}
