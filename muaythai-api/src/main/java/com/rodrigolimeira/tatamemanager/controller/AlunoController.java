package com.rodrigolimeira.tatamemanager.controller;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate; // <-- Aqui está a biblioteca que faltava para corrigir o erro!
import java.util.List;

@RestController
@RequestMapping("/api/alunos")
@CrossOrigin(origins = "*") // Permite que o frontend Javascript converse com o Java sem bloqueios de segurança
public class AlunoController {

    @Autowired
    private AlunoRepository alunoRepository;

    // Rota para LISTAR todos os alunos ativos
    @GetMapping
    public List<Aluno> listarAlunos() {
        return alunoRepository.findByAtivoTrue();
    }

    // Rota para CADASTRAR um novo aluno
    @PostMapping
    public ResponseEntity<Aluno> cadastrarAluno(@RequestBody Aluno aluno) {
        // Salva o aluno no banco de dados e retorna os dados dele confirmando o sucesso
        Aluno alunoSalvo = alunoRepository.save(aluno);
        return ResponseEntity.ok(alunoSalvo);
    }

    // Rota para REMOVER (Inativar) um aluno
    @DeleteMapping("/{cpf}")
    public ResponseEntity<Void> removerAluno(@PathVariable String cpf) {
        return alunoRepository.findById(cpf)
                .map(aluno -> {
                    aluno.setAtivo(false); // Exclusão lógica: apenas desativa
                    alunoRepository.save(aluno);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Rota para REGISTRAR PAGAMENTO (Renovar)
    @PutMapping("/{cpf}/pagar")
    public ResponseEntity<Void> registrarPagamento(@PathVariable String cpf) {
        return alunoRepository.findById(cpf)
                .map(aluno -> {
                    // 1. Atualiza a data de pagamento para hoje (Renova a matrícula)
                    aluno.setUltimoPagamento(LocalDate.now());

                    // 2. Limpa o registro do robô. Assim, no próximo mês, ele volta a cobrar normalmente
                    aluno.setDataUltimoAviso(null);

                    alunoRepository.save(aluno);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
    @PostMapping
    public ResponseEntity<Aluno> cadastrarAluno(@Valid @RequestBody Aluno aluno) {
        Aluno alunoSalvo = alunoRepository.save(aluno);
        return ResponseEntity.ok(alunoSalvo);
    }
}