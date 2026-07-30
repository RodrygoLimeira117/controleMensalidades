package com.rodrigolimeira.tatamemanager.repository;

import com.rodrigolimeira.tatamemanager.model.Configuracao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracaoRepository extends JpaRepository<Configuracao, Long> {
}
