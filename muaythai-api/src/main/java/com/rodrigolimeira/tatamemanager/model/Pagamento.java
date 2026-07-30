package com.rodrigolimeira.tatamemanager.model;

import jakarta.persistence.*;

import java.time.LocalDate;

/**
 * Registro histórico de um pagamento. Antes, o Aluno só guardava
 * "ultimoPagamento" — a cada renovação, o registro anterior era perdido.
 * Agora cada pagamento vira uma linha própria, permitindo consultar o
 * histórico completo (útil para conferência e para provar que um mês
 * específico foi pago).
 */
@Entity
@Table(name = "pagamentos")
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aluno_cpf", nullable = false)
    private Aluno aluno;

    @Column(name = "data_pagamento", nullable = false)
    private LocalDate dataPagamento;

    @Column(nullable = false)
    private double valor;

    public Pagamento() {
    }

    public Pagamento(Aluno aluno, LocalDate dataPagamento, double valor) {
        this.aluno = aluno;
        this.dataPagamento = dataPagamento;
        this.valor = valor;
    }

    public Long getId() {
        return id;
    }

    public Aluno getAluno() {
        return aluno;
    }

    public LocalDate getDataPagamento() {
        return dataPagamento;
    }

    public double getValor() {
        return valor;
    }
}
