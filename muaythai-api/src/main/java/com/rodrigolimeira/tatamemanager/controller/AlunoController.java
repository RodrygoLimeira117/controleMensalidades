package com.rodrigolimeira.tatamemanager.controller;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.service.AlunoService;
import com.rodrigolimeira.tatamemanager.service.MensalidadeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alunos")
@CrossOrigin(origins = "*") // App Desktop (Electron) roda em origem file://, por isso liberamos geral aqui
public class AlunoController {

    private final AlunoService alunoService;
    private final MensalidadeService mensalidadeService;

    public AlunoController(AlunoService alunoService, MensalidadeService mensalidadeService) {
        this.alunoService = alunoService;
        this.mensalidadeService = mensalidadeService;
    }

    // Rota para LISTAR todos os alunos ativos
    @GetMapping
    public List<Aluno> listarAlunos() {
        return alunoService.listarAtivos();
    }

    // Rota para CADASTRAR um novo aluno (com validação Bean Validation ativa)
    @PostMapping
    public ResponseEntity<Aluno> cadastrarAluno(@Valid @RequestBody Aluno aluno) {
        Aluno alunoSalvo = alunoService.cadastrar(aluno);
        return ResponseEntity.ok(alunoSalvo);
    }

    // Rota para EDITAR os dados de um aluno já cadastrado (CPF não muda: é a chave)
    @PutMapping("/{cpf}")
    public ResponseEntity<Aluno> editarAluno(@PathVariable String cpf, @Valid @RequestBody Aluno dadosAtualizados) {
        return alunoService.editar(cpf, dadosAtualizados)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Rota para REMOVER (Inativar) um aluno - exclusão lógica
    @DeleteMapping("/{cpf}")
    public ResponseEntity<Void> removerAluno(@PathVariable String cpf) {
        return alunoService.inativar(cpf)
                .map(aluno -> ResponseEntity.noContent().<Void>build())
                .orElse(ResponseEntity.notFound().build());
    }

    // Rota para REGISTRAR PAGAMENTO (Renovar)
    @PutMapping("/{cpf}/pagar")
    public ResponseEntity<Void> registrarPagamento(@PathVariable String cpf) {
        return alunoService.registrarPagamento(cpf)
                .map(aluno -> ResponseEntity.ok().<Void>build())
                .orElse(ResponseEntity.notFound().build());
    }

    // Rota para consultar o HISTÓRICO DE PAGAMENTOS de um aluno
    @GetMapping("/{cpf}/pagamentos")
    public ResponseEntity<List<PagamentoResponse>> listarPagamentos(@PathVariable String cpf) {
        if (alunoService.buscarPorCpf(cpf).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<PagamentoResponse> historico = alunoService.listarHistoricoPagamentos(cpf).stream()
                .map(p -> new PagamentoResponse(p.getDataPagamento(), p.getValor()))
                .toList();
        return ResponseEntity.ok(historico);
    }

    // Rota para disparar uma COBRANÇA MANUAL AVULSA (fora da rotina das 09:00)
    @PostMapping("/{cpf}/cobrar")
    public ResponseEntity<Void> cobrarAgora(@PathVariable String cpf) {
        return alunoService.buscarPorCpf(cpf)
                .map(aluno -> mensalidadeService.cobrarManualmente(aluno)
                        ? ResponseEntity.ok().<Void>build()
                        : ResponseEntity.status(502).<Void>build()) // 502: não conseguimos falar com o worker
                .orElse(ResponseEntity.notFound().build());
    }
}
