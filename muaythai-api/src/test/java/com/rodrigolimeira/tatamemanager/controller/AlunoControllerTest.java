package com.rodrigolimeira.tatamemanager.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.service.AlunoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AlunoController.class)
class AlunoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AlunoService alunoService;

    private Aluno alunoValido() {
        return new Aluno("11144477735", "Fulano de Tal", "5581999999999", 20, 10);
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
    void deveRetornar404_aoRegistrarPagamentoDeCpfInexistente() throws Exception {
        when(alunoService.registrarPagamento("00000000000")).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/alunos/00000000000/pagar"))
                .andExpect(status().isNotFound());
    }
}
