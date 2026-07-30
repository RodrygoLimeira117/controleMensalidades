package com.rodrigolimeira.tatamemanager.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CPFValidator implements ConstraintValidator<CPF, String> {

    @Override
    public boolean isValid(String cpf, ConstraintValidatorContext context) {
        // Campos vazios são responsabilidade do @NotBlank, não daqui
        if (cpf == null || cpf.isBlank()) {
            return true;
        }

        if (!cpf.matches("\\d{11}")) {
            return false;
        }

        // Reprova sequências repetidas tipo "00000000000" ou "11111111111",
        // que passam na conta dos dígitos verificadores mas nunca são CPFs reais
        if (cpf.chars().distinct().count() == 1) {
            return false;
        }

        return digitoVerificadorValido(cpf, 9) && digitoVerificadorValido(cpf, 10);
    }

    private boolean digitoVerificadorValido(String cpf, int tamanhoBase) {
        int soma = 0;
        int multiplicador = tamanhoBase + 1;

        for (int i = 0; i < tamanhoBase; i++) {
            soma += Character.getNumericValue(cpf.charAt(i)) * multiplicador--;
        }

        int resto = soma % 11;
        int digitoEsperado = (resto < 2) ? 0 : 11 - resto;

        return digitoEsperado == Character.getNumericValue(cpf.charAt(tamanhoBase));
    }
}
