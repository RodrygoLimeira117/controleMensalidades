package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Antes da refatoração da Fase 3, enviarMensagemWhatsApp() criava seu próprio
 * RestTemplate por dentro do método, sem qualquer forma de interceptar a
 * chamada HTTP em teste. Agora que o RestClient é injetado, dá pra simular
 * as respostas do worker com MockRestServiceServer.
 */
class MensalidadeServiceWhatsAppTest {

    private static final String WORKER_URL = "http://localhost:3000/api/whatsapp/enviar";

    private MockRestServiceServer mockServer;
    private MensalidadeService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = builder.build();

        service = new MensalidadeService(mock(AlunoRepository.class), restClient, WORKER_URL);
    }

    private Aluno aluno() {
        return new Aluno("11144477735", "Fulano de Tal", "5581999999999", 20, 10);
    }

    @Test
    void deveRetornarTrue_quandoWorkerRespondeComSucessoNaPrimeiraTentativa() {
        mockServer.expect(times(1), requestTo(WORKER_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess());

        assertThat(service.enviarMensagemWhatsApp(aluno())).isTrue();
        mockServer.verify();
    }

    @Test
    void deveTentarDeNovo_quandoPrimeiraTentativaFalha_eDevolverTrueSeASegundaFuncionar() {
        mockServer.expect(requestTo(WORKER_URL)).andExpect(method(HttpMethod.POST)).andRespond(withServerError());
        mockServer.expect(requestTo(WORKER_URL)).andExpect(method(HttpMethod.POST)).andRespond(withSuccess());

        assertThat(service.enviarMensagemWhatsApp(aluno())).isTrue();
        mockServer.verify();
    }

    @Test
    void deveDevolverFalse_quandoTodasAsTentativasFalham() {
        mockServer.expect(times(2), requestTo(WORKER_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withServerError());

        assertThat(service.enviarMensagemWhatsApp(aluno())).isFalse();
        mockServer.verify();
    }
}
