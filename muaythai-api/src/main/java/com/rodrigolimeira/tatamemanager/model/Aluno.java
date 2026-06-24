package com.rodrigolimeira.tatamemanager.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

@Entity
@Table(name = "alunos")
public class Aluno {

    @Id
    @Column(length = 11, nullable = false, unique = true)
    private String cpf;

    @Column(name = "nome_completo", nullable = false)
    private String nomeCompleto;

    @Column(nullable = false)
    private String celular;

    @Column(nullable = false)
    private Integer idade;

    @Column(name = "dia_vencimento", nullable = false)
    private Integer diaVencimento;

    @Column(name = "ultimo_pagamento")
    private LocalDate ultimoPagamento;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "data_ultimo_aviso")
    private LocalDate dataUltimoAviso;

    // Construtor padrão exigido pelo JPA
    public Aluno() {
    }

    // Construtor completo para facilitar a criação de novos alunos
    public Aluno(String cpf, String nomeCompleto, String celular, Integer idade, Integer diaVencimento) {
        this.cpf = cpf;
        this.nomeCompleto = nomeCompleto;
        this.celular = celular;
        this.idade = idade;
        this.diaVencimento = diaVencimento;
        this.ativo = true;
    }

    // Getters e Setters

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getNomeCompleto() {
        return nomeCompleto;
    }

    public void setNomeCompleto(String nomeCompleto) {
        this.nomeCompleto = nomeCompleto;
    }

    public String getCelular() {
        return celular;
    }

    public void setCelular(String celular) {
        this.celular = celular;
    }

    public Integer getIdade() {
        return idade;
    }

    public void setIdade(Integer idade) {
        this.idade = idade;
    }

    public Integer getDiaVencimento() {
        return diaVencimento;
    }

    public void setDiaVencimento(Integer diaVencimento) {
        this.diaVencimento = diaVencimento;
    }

    public LocalDate getUltimoPagamento() {
        return ultimoPagamento;
    }

    public void setUltimoPagamento(LocalDate ultimoPagamento) {
        this.ultimoPagamento = ultimoPagamento;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }
    public LocalDate getDataUltimoAviso() {
        return dataUltimoAviso;
    }

    public void setDataUltimoAviso(LocalDate dataUltimoAviso) {
        this.dataUltimoAviso = dataUltimoAviso;
    }
}
