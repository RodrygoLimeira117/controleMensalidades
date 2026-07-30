package com.rodrigolimeira.tatamemanager.controller;

import java.time.LocalDate;

/**
 * Evita expor a entidade Pagamento diretamente: ela tem uma referência
 * @ManyToOne para Aluno (lazy) que causaria problemas de serialização
 * (LazyInitializationException ou, se EAGER, dados redundantes/recursivos).
 */
public record PagamentoResponse(LocalDate dataPagamento, double valor) {
}
