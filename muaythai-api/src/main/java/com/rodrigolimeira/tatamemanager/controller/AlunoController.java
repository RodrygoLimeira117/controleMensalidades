package com.rodrigolimeira.tatamemanager.controller;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alunos")
@CrossOrigin(origins = "*") // Muito importante: Permite que o seu frontend Javascript converse com o Java sem bloqueios de segurança (CORS)
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
}