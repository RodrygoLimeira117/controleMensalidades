package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Configuracao;
import com.rodrigolimeira.tatamemanager.repository.ConfiguracaoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ConfiguracaoService {

    private static final Long ID_UNICO = 1L;

    private final ConfiguracaoRepository configuracaoRepository;
    private final double valorNovatoPadrao;
    private final double valorVeteranoPadrao;

    public ConfiguracaoService(ConfiguracaoRepository configuracaoRepository,
                                @Value("${mensalidade.valor-novato:80}") double valorNovatoPadrao,
                                @Value("${mensalidade.valor-veterano:70}") double valorVeteranoPadrao) {
        this.configuracaoRepository = configuracaoRepository;
        this.valorNovatoPadrao = valorNovatoPadrao;
        this.valorVeteranoPadrao = valorVeteranoPadrao;
    }

    // Na primeira execução (banco novo) ainda não existe linha de configuração:
    // nesse caso, semeia com os valores padrão do application.properties e salva.
    // Dali em diante, o valor salvo no banco é que manda.
    public Configuracao obter() {
        return configuracaoRepository.findById(ID_UNICO)
                .orElseGet(() -> configuracaoRepository.save(new Configuracao(valorNovatoPadrao, valorVeteranoPadrao)));
    }

    public Configuracao atualizar(double valorNovato, double valorVeterano) {
        Configuracao configuracao = obter();
        configuracao.setValorMensalidadeNovato(valorNovato);
        configuracao.setValorMensalidadeVeterano(valorVeterano);
        return configuracaoRepository.save(configuracao);
    }
}
