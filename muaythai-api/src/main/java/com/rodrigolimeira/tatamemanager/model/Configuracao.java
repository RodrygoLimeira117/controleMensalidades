package com.rodrigolimeira.tatamemanager.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Guarda as configurações ajustáveis do sistema (por enquanto, só os valores
 * de mensalidade). É uma tabela de uma linha só (id fixo = 1): assim os
 * reajustes feitos na tela de Configurações ficam salvos no banco e
 * sobrevivem a reinícios da aplicação, sem precisar editar código ou
 * application.properties toda vez que o valor mudar.
 */
@Entity
@Table(name = "configuracoes")
public class Configuracao {

    @Id
    private Long id = 1L;

    @Column(name = "valor_mensalidade_novato", nullable = false)
    private double valorMensalidadeNovato;

    @Column(name = "valor_mensalidade_veterano", nullable = false)
    private double valorMensalidadeVeterano;

    public Configuracao() {
    }

    public Configuracao(double valorMensalidadeNovato, double valorMensalidadeVeterano) {
        this.id = 1L;
        this.valorMensalidadeNovato = valorMensalidadeNovato;
        this.valorMensalidadeVeterano = valorMensalidadeVeterano;
    }

    public Long getId() {
        return id;
    }

    public double getValorMensalidadeNovato() {
        return valorMensalidadeNovato;
    }

    public void setValorMensalidadeNovato(double valorMensalidadeNovato) {
        this.valorMensalidadeNovato = valorMensalidadeNovato;
    }

    public double getValorMensalidadeVeterano() {
        return valorMensalidadeVeterano;
    }

    public void setValorMensalidadeVeterano(double valorMensalidadeVeterano) {
        this.valorMensalidadeVeterano = valorMensalidadeVeterano;
    }
}
