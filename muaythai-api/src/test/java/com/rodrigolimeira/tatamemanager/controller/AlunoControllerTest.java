package com.rodrigolimeira.tatamemanager.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.model.Pagamento;
import com.rodrigolimeira.tatamemanager.model.TipoMatricula;
import com.rodrigolimeira.tatamemanager.service.AlunoService;
import com.rodrigolimeira.tatamemanager.service.MensalidadeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// addFilters=false: essa fatia de teste cobre a lógica do controller (validação,
// status HTTP, serialização), não a autenticação - a segurança em si já é
// coberta pelo SecurityConfig/JwtAuthenticationFilter em outro lugar. Sem isso,
// o filtro de segurança real entraria em ação e barraria todas as chamadas
// com 401/403, já que o MockMvc não está enviando nenhum token JWT.
@WebMvcTest(AlunoController.class)
@AutoConfigureMockMvc(addFilters = false)
class AlunoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AlunoService alunoService;

    @MockitoBean
    private MensalidadeService mensalidadeService;

    private Aluno alunoValido() {
        return new Aluno("11144477735", "Fulano de Tal", "5581999999999", 20, 10, TipoMatricula.VETERANO);
    }

    @Test
    void deveCadastrarAluno_quandoDadosValidos() throws Exception {
        Aluno aluno = alunoValido();
        when(alunoService.cadastrar(any(Aluno.class))).thenReturn(aluno);

        mockMvc.perform(post("/api/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aluno)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cpf").value("11144477735"));
    }

    @Test
    void deveRejeitarCadastro_quandoCpfTemDigitoVerificadorInvalido() throws Exception {
        Aluno aluno = alunoValido();
        aluno.setCpf("12345678900"); // 11 dígitos, mas checksum errado

        mockMvc.perform(post("/api/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aluno)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.cpf").exists());
    }

    @Test
    void deveRejeitarCadastro_quandoCelularNaoTem13Digitos() throws Exception {
        Aluno aluno = alunoValido();
        aluno.setCelular("81999999999"); // faltou o DDI 55

        mockMvc.perform(post("/api/alunos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(aluno)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.celular").exists());
    }

    @Test
    void deveListarAlunosAtivos() throws Exception {
        when(alunoService.listarAtivos()).thenReturn(List.of(alunoValido()));

        mockMvc.perform(get("/api/alunos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cpf").value("11144477735"));
    }

    @Test
    void deveEditarAluno_quandoDadosValidos() throws Exception {
        Aluno editado = new Aluno("11144477735", "Nome Corrigido", "5581988887777", 22, 15, TipoMatricula.VETERANO);
        when(alunoService.editar(org.mockito.ArgumentMatchers.eq("11144477735"), any(Aluno.class)))
                .thenReturn(Optional.of(editado));

        mockMvc.perform(put("/api/alunos/11144477735")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(editado)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomeCompleto").value("Nome Corrigido"));
    }

    @Test
    void deveRetornar404_aoEditarCpfInexistente() throws Exception {
        when(alunoService.editar(org.mockito.ArgumentMatchers.eq("00000000000"), any(Aluno.class)))
                .thenReturn(Optional.empty());

        mockMvc.perform(put("/api/alunos/00000000000")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(alunoValido())))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveRetornar404_aoRegistrarPagamentoDeCpfInexistente() throws Exception {
        when(alunoService.registrarPagamento("00000000000")).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/alunos/00000000000/pagar"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveListarHistoricoDePagamentos() throws Exception {
        Aluno aluno = alunoValido();
        when(alunoService.buscarPorCpf("11144477735")).thenReturn(Optional.of(aluno));
        when(alunoService.listarHistoricoPagamentos("11144477735")).thenReturn(List.of(
                new Pagamento(aluno, LocalDate.of(2026, 6, 5), 80.0),
                new Pagamento(aluno, LocalDate.of(2026, 7, 3), 70.0)
        ));

        mockMvc.perform(get("/api/alunos/11144477735/pagamentos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].valor").value(80.0))
                .andExpect(jsonPath("$[1].valor").value(70.0));
    }

    @Test
    void deveRetornar404_aoConsultarHistoricoDeCpfInexistente() throws Exception {
        when(alunoService.buscarPorCpf("00000000000")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/alunos/00000000000/pagamentos"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deveCobrarAgora_quandoAlunoExisteEEnvioFunciona() throws Exception {
        Aluno aluno = alunoValido();
        when(alunoService.buscarPorCpf("11144477735")).thenReturn(Optional.of(aluno));
        when(mensalidadeService.cobrarManualmente(aluno)).thenReturn(true);

        mockMvc.perform(post("/api/alunos/11144477735/cobrar"))
                .andExpect(status().isOk());
    }

    @Test
    void deveRetornar502_quandoCobrancaFalhaAoFalarComOWorker() throws Exception {
        Aluno aluno = alunoValido();
        when(alunoService.buscarPorCpf("11144477735")).thenReturn(Optional.of(aluno));
        when(mensalidadeService.cobrarManualmente(aluno)).thenReturn(false);

        mockMvc.perform(post("/api/alunos/11144477735/cobrar"))
                .andExpect(status().isBadGateway());
    }

    @Test
    void deveRetornar404_aoCobrarCpfInexistente() throws Exception {
        when(alunoService.buscarPorCpf("00000000000")).thenReturn(Optional.empty());

        mockMvc.perform(post("/api/alunos/00000000000/cobrar"))
                .andExpect(status().isNotFound());
    }
}
