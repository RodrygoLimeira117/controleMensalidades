package com.rodrigolimeira.tatamemanager.repository;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlunoRepository extends JpaRepository<Aluno, String> {

    // Este método vai buscar automaticamente no banco apenas os alunos que estão ativos na equipe
    List<Aluno> findByAtivoTrue();

    // Busca alunos ativos cujo dia/mês de nascimento batem com a data informada,
    // ignorando o ano (por isso EXTRACT em vez de comparar a data inteira).
    // EXTRACT funciona tanto em H2 quanto em PostgreSQL.
    @Query("SELECT a FROM Aluno a WHERE a.ativo = true " +
            "AND a.dataNascimento IS NOT NULL " +
            "AND EXTRACT(MONTH FROM a.dataNascimento) = :mes " +
            "AND EXTRACT(DAY FROM a.dataNascimento) = :dia")
    List<Aluno> findAniversariantesAtivos(@Param("mes") int mes, @Param("dia") int dia);
}
