package com.rodrigolimeira.tatamemanager.model;

/**
 * Papéis de acesso da aplicação.
 * ADMIN: acesso total (cadastrar/editar/remover alunos, ver relatórios, configurações).
 * OPERADOR: uso do dia a dia (registrar pagamentos, consultar alunos), sem poder de exclusão/configuração.
 */
public enum Role {
    ADMIN,
    OPERADOR
}
