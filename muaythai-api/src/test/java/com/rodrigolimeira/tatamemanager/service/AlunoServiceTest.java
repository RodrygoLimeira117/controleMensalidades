package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
    private AlunoService alunoService;

    private Aluno novoAluno() {
        return new Aluno("11144477735", "Fulano de Tal", "5581999999999", 20, 10);
    }

    @BeforeEach
    void setUp() {
        // save() de um mock por padrão devolve null; aqui fazemos ele devolver o mesmo objeto recebido,
        // como o JPA faria de verdade.
        lenient().when(alunoRepository.save(any(Aluno.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void cadastrar_deveMarcarComoAtivoEDefinirDataDeMatriculaHoje_quandoNaoInformada() {
        Aluno aluno = novoAluno();
        aluno.setAtivo(false); // simula um valor indevido vindo de fora

        Aluno salvo = alunoService.cadastrar(aluno);

        assertThat(salvo.isAtivo()).isTrue();
        assertThat(salvo.getDataMatricula()).isEqualTo(LocalDate.now());
        verify(alunoRepository).save(aluno);
    }

    @Test
    void cadastrar_naoDeveSobrescreverDataDeMatriculaJaInformada() {
        Aluno aluno = novoAluno();
        LocalDate dataEscolhida = LocalDate.of(2025, 1, 15);
        aluno.setDataMatricula(dataEscolhida);

        Aluno salvo = alunoService.cadastrar(aluno);

        assertThat(salvo.getDataMatricula()).isEqualTo(dataEscolhida);
    }

    @Test
    void listarAtivos_deveDelegarParaORepositorio() {
        List<Aluno> ativos = List.of(novoAluno());
        when(alunoRepository.findByAtivoTrue()).thenReturn(ativos);

        assertThat(alunoService.listarAtivos()).isEqualTo(ativos);
    }

    @Test
    void inativar_deveDesativarAlunoExistente() {
        Aluno aluno = novoAluno();
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
        Aluno aluno = novoAluno();
        aluno.setDataUltimoAviso(LocalDate.now().minusDays(2));
        when(alunoRepository.findById("11144477735")).thenReturn(Optional.of(aluno));

        Optional<Aluno> resultado = alunoService.registrarPagamento("11144477735");

        assertThat(resultado).isPresent();
        assertThat(resultado.get().getUltimoPagamento()).isEqualTo(LocalDate.now());
        assertThat(resultado.get().getDataUltimoAviso()).isNull();
    }

    @Test
    void registrarPagamento_deveDevolverVazio_quandoCpfNaoExiste() {
        when(alunoRepository.findById("99999999999")).thenReturn(Optional.empty());

        assertThat(alunoService.registrarPagamento("99999999999")).isEmpty();
    }
}
