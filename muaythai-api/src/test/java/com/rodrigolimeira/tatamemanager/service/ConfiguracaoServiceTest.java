package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Configuracao;
import com.rodrigolimeira.tatamemanager.repository.ConfiguracaoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConfiguracaoServiceTest {

    @Mock
    private ConfiguracaoRepository configuracaoRepository;

    private ConfiguracaoService configuracaoService;

    @BeforeEach
    void setUp() {
        configuracaoService = new ConfiguracaoService(configuracaoRepository, 80.0, 70.0);
    }

    @Test
    void obter_deveSemearComValoresPadrao_quandoAindaNaoExisteConfiguracaoSalva() {
        when(configuracaoRepository.findById(1L)).thenReturn(Optional.empty());
        when(configuracaoRepository.save(any(Configuracao.class))).thenAnswer(inv -> inv.getArgument(0));

        Configuracao configuracao = configuracaoService.obter();

        assertThat(configuracao.getValorMensalidadeNovato()).isEqualTo(80.0);
        assertThat(configuracao.getValorMensalidadeVeterano()).isEqualTo(70.0);
        verify(configuracaoRepository).save(any(Configuracao.class));
    }

    @Test
    void obter_deveDevolverConfiguracaoJaSalva_semSemearDeNovo() {
        Configuracao existente = new Configuracao(100.0, 90.0);
        when(configuracaoRepository.findById(1L)).thenReturn(Optional.of(existente));

        Configuracao configuracao = configuracaoService.obter();

        assertThat(configuracao.getValorMensalidadeNovato()).isEqualTo(100.0);
        verify(configuracaoRepository, never()).save(any());
    }

    @Test
    void atualizar_deveSalvarNovosValores() {
        when(configuracaoRepository.findById(1L)).thenReturn(Optional.of(new Configuracao(80.0, 70.0)));
        when(configuracaoRepository.save(any(Configuracao.class))).thenAnswer(inv -> inv.getArgument(0));

        Configuracao atualizado = configuracaoService.atualizar(95.0, 85.0);

        assertThat(atualizado.getValorMensalidadeNovato()).isEqualTo(95.0);
        assertThat(atualizado.getValorMensalidadeVeterano()).isEqualTo(85.0);
    }
}
