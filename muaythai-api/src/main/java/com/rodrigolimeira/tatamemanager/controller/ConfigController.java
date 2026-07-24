package com.rodrigolimeira.tatamemanager.controller;

import com.rodrigolimeira.tatamemanager.model.Configuracao;
import com.rodrigolimeira.tatamemanager.service.ConfiguracaoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
// CORS agora é configurado de forma centralizada em SecurityConfig
public class ConfigController {

    private final ConfiguracaoService configuracaoService;

    public ConfigController(ConfiguracaoService configuracaoService) {
        this.configuracaoService = configuracaoService;
    }

    @GetMapping
    public ConfigResponse obterConfiguracoes() {
        return paraResponse(configuracaoService.obter());
    }

    // Permite reajustar os valores de mensalidade pela própria tela do app,
    // sem precisar editar application.properties nem recompilar nada.
    @PutMapping
    public ConfigResponse atualizarConfiguracoes(@Valid @RequestBody ConfigUpdateRequest request) {
        Configuracao atualizado = configuracaoService.atualizar(request.valorMensalidadeNovato(), request.valorMensalidadeVeterano());
        return paraResponse(atualizado);
    }

    private ConfigResponse paraResponse(Configuracao configuracao) {
        return new ConfigResponse(configuracao.getValorMensalidadeNovato(), configuracao.getValorMensalidadeVeterano());
    }
}
