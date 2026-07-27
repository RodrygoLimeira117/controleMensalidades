package com.rodrigolimeira.tatamemanager.model;

/**
 * Define o valor da mensalidade do aluno: NOVATO paga o valor de inscrição
 * (1º mês), VETERANO paga a mensalidade normal a partir do 2º mês em diante.
 * Antes isso era calculado automaticamente comparando a data de matrícula
 * com o mês atual; agora é uma escolha explícita, feita no cadastro e
 * ajustável na edição.
 */
public enum TipoMatricula {
    NOVATO,
    VETERANO
}
