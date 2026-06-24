package com.rodrigolimeira.tatamemanager.service;

import com.rodrigolimeira.tatamemanager.model.Aluno;
import com.rodrigolimeira.tatamemanager.repository.AlunoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MensalidadeService {

    @Autowired
    private AlunoRepository alunoRepository;

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

    private boolean estaInadimplente(Aluno aluno, LocalDate hoje) {
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

    // Nova validação para impedir o spam
    private boolean jaFoiAvisadoEsteMes(Aluno aluno, LocalDate hoje) {
        if (aluno.getDataUltimoAviso() == null) {
            return false; // Nunca recebeu aviso, então pode mandar
        }

        // Verifica se o mês e o ano do último aviso são iguais ao mês atual
        return aluno.getDataUltimoAviso().getMonthValue() == hoje.getMonthValue() &&
                aluno.getDataUltimoAviso().getYear() == hoje.getYear();
    }

    private boolean enviarMensagemWhatsApp(Aluno aluno) {
        String mensagem = String.format("Ossss %s! Tudo bem? Passando para lembrar da mensalidade da nossa equipe de Muay Thai neste mês.", aluno.getNomeCompleto());

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "http://localhost:3000/api/whatsapp/enviar";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> corpoRequisicao = new HashMap<>();
            corpoRequisicao.put("numero", aluno.getCelular());
            corpoRequisicao.put("mensagem", mensagem);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(corpoRequisicao, headers);

            restTemplate.postForEntity(url, request, String.class);

            System.out.println("✔️ ORDEM ENVIADA AO NODE.JS: Cobrança de " + aluno.getNomeCompleto());
            return true; // Retorna sucesso para a lógica salvar no banco

        } catch (Exception e) {
            System.out.println("❌ ERRO: Não foi possível alcançar o Node.js. " + e.getMessage());
            return false; // Se falhou, não grava no banco para tentar novamente no dia seguinte
        }
    }
}