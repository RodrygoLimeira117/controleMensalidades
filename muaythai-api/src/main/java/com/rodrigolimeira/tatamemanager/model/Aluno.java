package com.rodrigolimeira.tatamemanager.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

@Entity
@Table(name = "alunos")
public class Aluno {

    @Id
    @NotBlank(message = "O CPF não pode estar vazio.")
    @Size(min = 11, max = 11, message = "O CPF deve conter exatamente 11 dígitos.")
    @Column(length = 11, nullable = false, unique = true)
    private String cpf;

    @NotBlank(message = "O nome completo é obrigatório.")
    @Column(name = "nome_completo", nullable = false)
    private String nomeCompleto;

    @NotBlank(message = "O número de celular é obrigatório.")
    @Size(min = 13, max = 13, message = "O celular deve conter 13 dígitos numéricos (DDI + DDD + Número).")
    @Column(nullable = false)
    private String celular;

    @NotNull(message = "A idade é obrigatória.")
    @Min(value = 5, message = "A idade mínima permitida é de 5 anos.")
    @Column(nullable = false)
    private Integer idade;

    @NotNull(message = "O dia de vencimento é obrigatório.")
    @Min(value = 1, message = "O dia de vencimento não pode ser menor que 1.")
    @Max(value = 31, message = "O dia de vencimento não pode ser maior que 31.")
    @Column(name = "dia_vencimento", nullable = false)
    private Integer diaVencimento;

    @Column(name = "ultimo_pagamento")
    private LocalDate ultimoPagamento;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "data_ultimo_aviso")
    private LocalDate dataUltimoAviso;

    @Column(name = "data_matricula")
    private LocalDate dataMatricula;

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

    public LocalDate getDataMatricula() {
        return dataMatricula;
    }

    public void setDataMatricula(LocalDate dataMatricula) {
        this.dataMatricula = dataMatricula;
    }
}