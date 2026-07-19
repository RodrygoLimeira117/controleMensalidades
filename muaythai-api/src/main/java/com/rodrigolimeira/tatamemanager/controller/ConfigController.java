package com.rodrigolimeira.tatamemanager.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*")
public class ConfigController {

    private final double valorPadrao;
    private final double valorPrimeiroMes;

    public ConfigController(
            @Value("${mensalidade.valor-padrao:70}") double valorPadrao,
            @Value("${mensalidade.valor-primeiro-mes:80}") double valorPrimeiroMes) {
        this.valorPadrao = valorPadrao;
        this.valorPrimeiroMes = valorPrimeiroMes;
    }

    @GetMapping
    public ConfigResponse obterConfiguracoes() {
        return new ConfigResponse(valorPadrao, valorPrimeiroMes);
    }
}
