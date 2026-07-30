package com.rodrigolimeira.tatamemanager.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Cliente HTTP usado para falar com o muaythai-whatsapp-worker.
 * Antes disso, o RestTemplate era criado "na mão" dentro do MensalidadeService,
 * sem timeout algum — se o worker Node travasse, a rotina agendada podia
 * ficar pendurada indefinidamente. Aqui o cliente é um bean único, com
 * timeout configurável e injetável (logo, mockável em teste).
 */
@Configuration
public class WhatsAppClientConfig {

    @Bean
    public RestClient whatsAppRestClient(
            @Value("${worker.whatsapp.connect-timeout-ms:3000}") int connectTimeoutMs,
            @Value("${worker.whatsapp.read-timeout-ms:5000}") int readTimeoutMs) {

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMs));

        return RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }
}
