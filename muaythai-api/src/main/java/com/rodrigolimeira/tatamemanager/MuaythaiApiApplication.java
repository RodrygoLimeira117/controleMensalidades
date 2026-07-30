package com.rodrigolimeira.tatamemanager; // Mantenha a declaração de pacote original do seu arquivo

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling; // Importe o agendador

@SpringBootApplication
@EnableScheduling // Ligue a automação aqui
public class MuaythaiApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(MuaythaiApiApplication.class, args);
	}
}