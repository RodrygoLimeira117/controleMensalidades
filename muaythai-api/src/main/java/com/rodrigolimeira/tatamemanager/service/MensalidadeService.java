package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class MensalidadeService {

    private static final int MAX_TENTATIVAS = 2;

    private final AlunoRepository alunoRepository;
    private final RestClient whatsAppRestClient;
    private final String whatsAppUrl;

    public MensalidadeService(AlunoRepository alunoRepository,
                               RestClient whatsAppRestClient,
                               @Value("${worker.whatsapp.url:http://localhost:3000/api/whatsapp/enviar}") String whatsAppUrl) {
        this.alunoRepository = alunoRepository;
        this.whatsAppRestClient = whatsAppRestClient;
        this.whatsAppUrl = whatsAppUrl;
    }

    // Configurado para rodar todo dia às 09:00h da manhã.
    // O spam acaba aqui porque ele só faz a checagem uma vez por dia.
    @Scheduled(cron = "0 0 9 * * ?")
    public void verificarAtrasos() {
        LocalDate hoje = LocalDate.now();
        List<Aluno> alunos = alunoRepository.findByAtivoTrue();

        System.out.println("Varrendo alunos ativos... Data atual: " + hoje);

        for (Aluno aluno : alunos) {
            // SÓ envia se estiver inadimplente E se ainda NÃO foi avisado este mês
            if (estaInadimplente(aluno, hoje) && !jaFoiAvisadoEsteMes(aluno, hoje)) {
                boolean sucesso = enviarMensagemWhatsApp(aluno);

                // Se o robô enviou com sucesso, grava a data atual no banco para travar novos envios
                if (sucesso) {
                    aluno.setDataUltimoAviso(hoje);
                    alunoRepository.save(aluno);
                    System.out.println("💾 Banco de dados atualizado: Aviso registrado para " + aluno.getNomeCompleto());
                }
            }
        }
    }

    // Pacote-privado (sem "private") de propósito: permite testar a regra de
    // inadimplência isoladamente, sem precisar rodar o agendamento inteiro.
    boolean estaInadimplente(Aluno aluno, LocalDate hoje) {
        if (hoje.getDayOfMonth() <= aluno.getDiaVencimento()) {
            return false;
        }

        if (aluno.getUltimoPagamento() == null) {
            return true;
        }

        boolean pagouEsteMes = aluno.getUltimoPagamento().getMonthValue() == hoje.getMonthValue() &&
                aluno.getUltimoPagamento().getYear() == hoje.getYear();

        return !pagouEsteMes;
    }

    // Idem: pacote-privado para permitir teste unitário direto.
    boolean jaFoiAvisadoEsteMes(Aluno aluno, LocalDate hoje) {
        if (aluno.getDataUltimoAviso() == null) {
            return false; // Nunca recebeu aviso, então pode mandar
        }

        // Verifica se o mês e o ano do último aviso são iguais ao mês atual
        return aluno.getDataUltimoAviso().getMonthValue() == hoje.getMonthValue() &&
                aluno.getDataUltimoAviso().getYear() == hoje.getYear();
    }

    // Público: permite disparar uma cobrança avulsa para um aluno específico,
    // sob demanda (ex.: botão "Cobrar agora" na tela), sem depender do
    // agendamento das 09:00 nem da checagem de inadimplência/anti-spam.
    public boolean cobrarManualmente(Aluno aluno) {
        return enviarMensagemWhatsApp(aluno);
    }

    // Pacote-privado: agora usa um RestClient injetado (com timeout configurado
    // em WhatsAppClientConfig) em vez de criar seu próprio RestTemplate sem
    // timeout a cada chamada. Isso o torna mockável em teste e evita que a
    // rotina agendada fique pendurada se o worker Node não responder.
    boolean enviarMensagemWhatsApp(Aluno aluno) {
        String mensagem = String.format(
                "Ossss %s! Tudo bem? Passando para lembrar da mensalidade da nossa equipe de Muay Thai neste mês.",
                aluno.getNomeCompleto());

        Map<String, String> corpoRequisicao = Map.of(
                "numero", aluno.getCelular(),
                "mensagem", mensagem);

        for (int tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
            try {
                whatsAppRestClient.post()
                        .uri(whatsAppUrl)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(corpoRequisicao)
                        .retrieve()
                        .toBodilessEntity();

                System.out.println("✔️ ORDEM ENVIADA AO NODE.JS: Cobrança de " + aluno.getNomeCompleto());
                return true;

            } catch (Exception e) {
                System.out.println("❌ Tentativa " + tentativa + "/" + MAX_TENTATIVAS +
                        " falhou ao alcançar o Node.js: " + e.getMessage());
            }
        }

        // Se todas as tentativas falharam, não grava no banco: a rotina de amanhã tenta de novo
        return false;
    }
}
