package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Concentra as regras de negócio relacionadas a alunos, deixando o
 * controller responsável apenas por traduzir requisições HTTP em chamadas
 * a este serviço.
 */
@Service
public class AlunoService {

    private final AlunoRepository alunoRepository;

    public AlunoService(AlunoRepository alunoRepository) {
        this.alunoRepository = alunoRepository;
    }

    public List<Aluno> listarAtivos() {
        return alunoRepository.findByAtivoTrue();
    }

    public Aluno cadastrar(Aluno aluno) {
        aluno.setAtivo(true);
        if (aluno.getDataMatricula() == null) {
            aluno.setDataMatricula(LocalDate.now());
        }
        return alunoRepository.save(aluno);
    }

    public Optional<Aluno> inativar(String cpf) {
        return alunoRepository.findById(cpf).map(aluno -> {
            aluno.setAtivo(false);
            return alunoRepository.save(aluno);
        });
    }

    public Optional<Aluno> registrarPagamento(String cpf) {
        return alunoRepository.findById(cpf).map(aluno -> {
            aluno.setUltimoPagamento(LocalDate.now());
            // Limpa o registro do robô: no próximo mês ele volta a cobrar normalmente
            aluno.setDataUltimoAviso(null);
            return alunoRepository.save(aluno);
        });
    }
}
