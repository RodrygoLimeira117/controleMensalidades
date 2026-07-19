package com.rodrigolimeira.tatamemanager.controller;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.service.AlunoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alunos")
@CrossOrigin(origins = "*") // App Desktop (Electron) roda em origem file://, por isso liberamos geral aqui
public class AlunoController {

    private final AlunoService alunoService;

    public AlunoController(AlunoService alunoService) {
        this.alunoService = alunoService;
    }

    // Rota para LISTAR todos os alunos ativos
    @GetMapping
    public List<Aluno> listarAlunos() {
        return alunoService.listarAtivos();
    }

    // Rota para CADASTRAR um novo aluno (com validação Bean Validation ativa)
    @PostMapping
    public ResponseEntity<Aluno> cadastrarAluno(@Valid @RequestBody Aluno aluno) {
        Aluno alunoSalvo = alunoService.cadastrar(aluno);
        return ResponseEntity.ok(alunoSalvo);
    }

    // Rota para REMOVER (Inativar) um aluno - exclusão lógica
    @DeleteMapping("/{cpf}")
    public ResponseEntity<Void> removerAluno(@PathVariable String cpf) {
        return alunoService.inativar(cpf)
                .map(aluno -> ResponseEntity.noContent().<Void>build())
                .orElse(ResponseEntity.notFound().build());
    }

    // Rota para REGISTRAR PAGAMENTO (Renovar)
    @PutMapping("/{cpf}/pagar")
    public ResponseEntity<Void> registrarPagamento(@PathVariable String cpf) {
        return alunoService.registrarPagamento(cpf)
                .map(aluno -> ResponseEntity.ok().<Void>build())
                .orElse(ResponseEntity.notFound().build());
    }
}
