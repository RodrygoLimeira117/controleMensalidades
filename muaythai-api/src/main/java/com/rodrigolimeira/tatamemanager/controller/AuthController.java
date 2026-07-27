package com.rodrigolimeira.tatamemanager.controller;

import com.rodrigolimeira.tatamemanager.model.Usuario;
import com.rodrigolimeira.tatamemanager.repository.UsuarioRepository;
import com.rodrigolimeira.tatamemanager.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticação", description = "Login - obtenha aqui o token para usar nos outros endpoints")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager,
                           UsuarioRepository usuarioRepository,
                           JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    // Único endpoint público da API: troca usuário/senha por um token JWT.
    @PostMapping("/login")
    @SecurityRequirements // sobrescreve o "bearerAuth" global do OpenApiConfig - login não exige token
    @Operation(
            summary = "Login",
            description = "Troca usuário/senha por um token JWT. Copie o campo \"token\" da resposta e " +
                    "cole no botão Authorize (cadeado no topo da página) para testar os demais endpoints."
    )
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(401).build();
        }

        Usuario usuario = usuarioRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalStateException("Usuário autenticado não encontrado."));

        UserDetails userDetails = User.builder()
                .username(usuario.getUsername())
                .password(usuario.getSenhaHash())
                .authorities("ROLE_" + usuario.getRole().name())
                .build();

        String token = jwtService.gerarToken(userDetails, usuario.getRole().name());

        return ResponseEntity.ok(new LoginResponse(token, usuario.getUsername(), usuario.getRole().name()));
    }
}
