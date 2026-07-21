package com.rodrigolimeira.tatamemanager.controller;

import jakarta.validation.constraints.Positive;

public record ConfigUpdateRequest(
        @Positive(message = "O valor da mensalidade de novato deve ser maior que zero.") double valorMensalidadeNovato,
        @Positive(message = "O valor da mensalidade de veterano deve ser maior que zero.") double valorMensalidadeVeterano) {
}
