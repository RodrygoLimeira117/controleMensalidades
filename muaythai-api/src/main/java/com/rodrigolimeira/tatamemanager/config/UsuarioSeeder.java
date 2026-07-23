package com.rodrigolimeira.tatamemanager.config;

import com.rodrigolimeira.tatamemanager.model.Role;
import com.rodrigolimeira.tatamemanager.model.Usuario;
import com.rodrigolimeira.tatamemanager.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Cria o usuário administrador inicial no primeiro start, caso ainda não exista
 * nenhum usuário no banco. As credenciais vêm de variáveis de ambiente
 * (ADMIN_USERNAME / ADMIN_PASSWORD), com fallback só para facilitar o dev local.
 */
@Component
public class UsuarioSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(UsuarioSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPassword;

    public UsuarioSeeder(UsuarioRepository usuarioRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${admin.username:admin}") String adminUsername,
                          @Value("${admin.password:admin123}") String adminPassword) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() == 0) {
            Usuario admin = new Usuario(adminUsername, passwordEncoder.encode(adminPassword), Role.ADMIN);
            usuarioRepository.save(admin);
            log.warn("Nenhum usuário encontrado no banco. Usuário administrador '{}' criado automaticamente. " +
                    "Troque a senha padrão o quanto antes (defina ADMIN_USERNAME/ADMIN_PASSWORD no ambiente).", adminUsername);
        }
    }
}
