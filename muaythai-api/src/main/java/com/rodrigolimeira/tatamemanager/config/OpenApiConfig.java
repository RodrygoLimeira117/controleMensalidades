package com.rodrigolimeira.tatamemanager.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuração do Swagger/OpenAPI (springdoc).
 * <p>
 * Com isso, a documentação interativa fica disponível em:
 * - Swagger UI: http://localhost:8080/swagger-ui.html
 * - JSON da spec: http://localhost:8080/v3/api-docs
 * <p>
 * Como a API usa JWT, aqui a gente também registra um esquema de segurança
 * "bearerAuth": isso faz aparecer um botão "Authorize" no topo da página do
 * Swagger, onde você cola o token uma única vez (obtido em POST /api/auth/login)
 * e ele passa a ser enviado automaticamente em todas as chamadas que você
 * testar por ali - sem precisar copiar/colar o header Authorization toda vez.
 */
@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA_JWT = "bearerAuth";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Vipers Fight Team - API de Controle de Mensalidades")
                        .description("""
                                API para gestão de alunos, pagamentos e configurações do tatame.

                                Para testar os endpoints protegidos:
                                1. Faça login em **POST /api/auth/login** com usuário e senha.
                                2. Copie o `token` retornado.
                                3. Clique no botão **Authorize** (cadeado no topo da página) e cole o token
                                   (sem a palavra "Bearer", o Swagger adiciona isso sozinho).
                                4. Pronto - todas as chamadas feitas por aqui já vão autenticadas.
                                """)
                        .version("v1")
                        .contact(new Contact().name("Vipers Fight Team")))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_JWT))
                .components(new Components()
                        .addSecuritySchemes(ESQUEMA_JWT, new SecurityScheme()
                                .name(ESQUEMA_JWT)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Cole aqui o token retornado por POST /api/auth/login.")));
    }
}
