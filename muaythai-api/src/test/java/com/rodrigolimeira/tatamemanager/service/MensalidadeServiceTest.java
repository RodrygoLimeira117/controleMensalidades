package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class MensalidadeServiceTest {

    // Aqui só testamos as regras puras (estaInadimplente / jaFoiAvisadoEsteMes),
    // então repositório e cliente HTTP não importam — usamos mocks vazios.
    private final MensalidadeService service = new MensalidadeService(
            mock(AlunoRepository.class),
            RestClient.builder().build(),
            "http://localhost:3000/api/whatsapp/enviar");

    private Aluno alunoComVencimentoDia(int diaVencimento) {
        return new Aluno("11144477735", "Fulano de Tal", "5581999999999", 20, diaVencimento);
    }

    @Test
    void naoEstaInadimplente_antesDoDiaDeVencimento() {
        LocalDate hoje = LocalDate.of(2026, 7, 10);
        Aluno aluno = alunoComVencimentoDia(15);

        assertThat(service.estaInadimplente(aluno, hoje)).isFalse();
    }

    @Test
    void estaInadimplente_quandoPassouDoVencimentoENuncaPagou() {
        LocalDate hoje = LocalDate.of(2026, 7, 20);
        Aluno aluno = alunoComVencimentoDia(15);
        aluno.setUltimoPagamento(null);

        assertThat(service.estaInadimplente(aluno, hoje)).isTrue();
    }

    @Test
    void naoEstaInadimplente_quandoJaPagouNoMesAtual() {
        LocalDate hoje = LocalDate.of(2026, 7, 20);
        Aluno aluno = alunoComVencimentoDia(15);
        aluno.setUltimoPagamento(LocalDate.of(2026, 7, 12));

        assertThat(service.estaInadimplente(aluno, hoje)).isFalse();
    }

    @Test
    void estaInadimplente_quandoUltimoPagamentoFoiEmMesAnterior() {
        LocalDate hoje = LocalDate.of(2026, 7, 20);
        Aluno aluno = alunoComVencimentoDia(15);
        aluno.setUltimoPagamento(LocalDate.of(2026, 6, 10));

        assertThat(service.estaInadimplente(aluno, hoje)).isTrue();
    }

    @Test
    void naoFoiAvisadoEsteMes_quandoNuncaRecebeuAviso() {
        Aluno aluno = alunoComVencimentoDia(15);
        aluno.setDataUltimoAviso(null);

        assertThat(service.jaFoiAvisadoEsteMes(aluno, LocalDate.of(2026, 7, 20))).isFalse();
    }

    @Test
    void jaFoiAvisadoEsteMes_impedeSegundoAvisoNoMesmoMes() {
        Aluno aluno = alunoComVencimentoDia(15);
        aluno.setDataUltimoAviso(LocalDate.of(2026, 7, 16));

        assertThat(service.jaFoiAvisadoEsteMes(aluno, LocalDate.of(2026, 7, 25))).isTrue();
    }

    @Test
    void naoFoiAvisadoEsteMes_quandoOAvisoAnteriorFoiEmOutroMes() {
        Aluno aluno = alunoComVencimentoDia(15);
        aluno.setDataUltimoAviso(LocalDate.of(2026, 6, 16));

        assertThat(service.jaFoiAvisadoEsteMes(aluno, LocalDate.of(2026, 7, 20))).isFalse();
    }
}
