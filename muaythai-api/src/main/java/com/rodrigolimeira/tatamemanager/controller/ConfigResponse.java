package com.rodrigolimeira.tatamemanager.controller;

/**
 * Configurações públicas que o app desktop precisa conhecer.
 * Existe pra tirar os valores de mensalidade (antes hardcoded em index.html)
 * de dentro do JavaScript e deixar o backend como única fonte da verdade.
 */
public record ConfigResponse(double valorMensalidadePadrao, double valorMensalidadePrimeiroMes) {
}
