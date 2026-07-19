package com.rodrigolimeira.tatamemanager.repository;

import com.rodrigolimeira.tatamemanager.model.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {

    List<Pagamento> findByAlunoCpfOrderByDataPagamentoDesc(String cpf);
}
