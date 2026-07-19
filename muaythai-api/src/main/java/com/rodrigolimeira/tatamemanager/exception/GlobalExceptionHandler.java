package com.rodrigolimeira.tatamemanager.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    // Captura os erros gerados pelas anotações @NotBlank, @Size, @NotNull, etc.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> lidarComErrosDeValidacao(MethodArgumentNotValidException ex) {
        Map<String, String> erros = new HashMap<>();

        // Pega todos os campos que falharam e suas respectivas mensagens de erro
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String nomeDoCampo = ((FieldError) error).getField();
            String mensagemDeErro = error.getDefaultMessage();
            erros.put(nomeDoCampo, mensagemDeErro);
        });

        return new ResponseEntity<>(erros, HttpStatus.BAD_REQUEST);
    }

    // Captura erro de CPF duplicado (Exception padrão do banco de dados)
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> lidarComCpfDuplicado() {
        Map<String, String> erro = new HashMap<>();
        erro.put("erro", "Este CPF já está cadastrado no sistema.");
        return new ResponseEntity<>(erro, HttpStatus.CONFLICT);
    }

    // Captura JSON malformado ou valores inválidos de enum (ex.: tipoMatricula
    // escrito diferente de NOVATO/VETERANO), evitando que isso vire um 500 cru
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> lidarComJsonInvalido() {
        Map<String, String> erro = new HashMap<>();
        erro.put("erro", "Dados enviados em formato inválido. Confira os campos e tente novamente.");
        return new ResponseEntity<>(erro, HttpStatus.BAD_REQUEST);
    }
}