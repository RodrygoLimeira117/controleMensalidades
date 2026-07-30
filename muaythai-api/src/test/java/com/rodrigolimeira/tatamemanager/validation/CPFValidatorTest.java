package com.rodrigolimeira.tatamemanager.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class CPFValidatorTest {

    private final CPFValidator validator = new CPFValidator();

    @ParameterizedTest
    @ValueSource(strings = {"11144477735", "12345678909"})
    void deveAceitarCpfComDigitosVerificadoresCorretos(String cpf) {
        assertThat(validator.isValid(cpf, null)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "00000000000", // sequência repetida
            "11111111111", // sequência repetida
            "12345678900", // dígito verificador errado
            "1234567890",  // 10 dígitos
            "123456789012" // 12 dígitos
    })
    void deveRejeitarCpfInvalido(String cpf) {
        assertThat(validator.isValid(cpf, null)).isFalse();
    }

    @Test
    void deveAceitarNuloOuVazio_poisQuemCuidaDissoEOAtNotBlank() {
        assertThat(validator.isValid(null, null)).isTrue();
        assertThat(validator.isValid("", null)).isTrue();
    }

    @Test
    void deveRejeitarCpfComLetras() {
        assertThat(validator.isValid("1114447773a", null)).isFalse();
    }
}
