package com.rodrigolimeira.tatamemanager.repository;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlunoRepository extends JpaRepository<Aluno, String> {

    // Este método vai buscar automaticamente no banco apenas os alunos que estão ativos na equipe
    List<Aluno> findByAtivoTrue();
}
