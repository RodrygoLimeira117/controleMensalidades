package com.rodrigolimeira.tatamemanager.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rodrigolimeira.tatamemanager.model.Configuracao;
import com.rodrigolimeira.tatamemanager.service.ConfiguracaoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// addFilters=false: essa fatia de teste cobre a lógica do controller, não a
// autenticação (ver AlunoControllerTest para a explicação completa).
@WebMvcTest(ConfigController.class)
@AutoConfigureMockMvc(addFilters = false)
class ConfigControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ConfiguracaoService configuracaoService;

    @Test
    void deveExporValoresDeMensalidadeConfigurados() throws Exception {
        when(configuracaoService.obter()).thenReturn(new Configuracao(80.0, 70.0));

        mockMvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorMensalidadeNovato").value(80.0))
                .andExpect(jsonPath("$.valorMensalidadeVeterano").value(70.0));
    }

    @Test
    void deveAtualizarValoresDeMensalidade() throws Exception {
        when(configuracaoService.atualizar(90.0, 75.0)).thenReturn(new Configuracao(90.0, 75.0));

        mockMvc.perform(put("/api/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfigUpdateRequest(90.0, 75.0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valorMensalidadeNovato").value(90.0))
                .andExpect(jsonPath("$.valorMensalidadeVeterano").value(75.0));
    }

    @Test
    void deveRejeitarAtualizacao_quandoValorNaoEPositivo() throws Exception {
        mockMvc.perform(put("/api/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ConfigUpdateRequest(0, 70.0))))
                .andExpect(status().isBadRequest());
    }
}
