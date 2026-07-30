# muaythai-api

Backend em Java 21 + Spring Boot 4 responsável pelo cadastro de atletas, controle de mensalidades e disparo de cobranças automáticas via `muaythai-whatsapp-worker`.

## Rodando localmente

```bash
./mvnw spring-boot:run
```

A API sobe em `http://localhost:8080`. O banco H2 é criado automaticamente em arquivo local (`~/banco_tatame`).

Console do banco: `http://localhost:8080/banco`

## Variáveis de ambiente

| Variável                          | Padrão (dev)                                    | Descrição                                    |
|-----------------------------------|--------------------------------------------------|-----------------------------------------------|
| `DB_USERNAME`                     | `admin`                                          | Usuário do banco H2                            |
| `DB_PASSWORD`                     | `admin`                                          | Senha do banco H2                              |
| `WORKER_WHATSAPP_URL`             | `http://localhost:3000/api/whatsapp/enviar`      | Endpoint do `muaythai-whatsapp-worker`         |
| `WORKER_WHATSAPP_CONNECT_TIMEOUT_MS` | `3000`                                        | Timeout de conexão com o worker                |
| `WORKER_WHATSAPP_READ_TIMEOUT_MS` | `5000`                                           | Timeout de resposta do worker                  |

Em produção, defina essas variáveis em vez de usar os valores padrão.

## Endpoints

| Método | Rota                          | Descrição                                    |
|--------|--------------------------------|-----------------------------------------------|
| GET    | `/api/alunos`                  | Lista atletas ativos                          |
| POST   | `/api/alunos`                  | Cadastra um novo atleta                       |
| PUT    | `/api/alunos/{cpf}`            | Edita nome, celular, idade e vencimento (CPF não muda) |
| DELETE | `/api/alunos/{cpf}`            | Inativa um atleta (soft delete)               |
| PUT    | `/api/alunos/{cpf}/pagar`      | Registra pagamento do mês (grava no histórico) |
| GET    | `/api/alunos/{cpf}/pagamentos` | Lista o histórico completo de pagamentos      |
| POST   | `/api/alunos/{cpf}/cobrar`     | Dispara uma cobrança avulsa via WhatsApp, fora da rotina das 09:00 |
| GET    | `/api/config`                  | Consulta os valores de mensalidade configurados |
| PUT    | `/api/config`                  | Atualiza os valores de mensalidade (persistido no banco) |

## Modelo de mensalidade

Cada aluno tem um `tipoMatricula`: `NOVATO` (paga o valor de inscrição do 1º mês) ou `VETERANO` (paga a mensalidade normal a partir do 2º mês). Essa escolha é feita no cadastro e pode ser trocada na edição — normalmente você vai querer editar o aluno para "veterano" assim que o primeiro mês dele passar.

Os valores em si (quanto é a mensalidade de novato e de veterano) ficam salvos no banco de dados, editáveis pela tela de Configurações do app — não é preciso mexer em código nem reiniciar a API para reajustar os preços.

## Solução de problemas

**Erro "Column ... not found" ao atualizar o projeto:** o `ddl-auto=update` do Hibernate adiciona colunas novas automaticamente, mas se a coluna for obrigatória (`NOT NULL`) e a tabela já tiver linhas, ele pode falhar silenciosamente nos logs de inicialização e deixar o schema desatualizado. Normalmente um reinício resolve (o Hibernate tenta de novo a cada start). Se persistir, apague os arquivos `banco_tatame.*` na sua pasta pessoal para recriar o banco do zero — você perde os dados de teste locais, mas não afeta o código.

## Rotina agendada

`MensalidadeService` roda todos os dias às 09:00 e notifica, via o worker de WhatsApp, os atletas inadimplentes que ainda não receberam aviso no mês corrente. A chamada ao worker tenta até 2 vezes antes de desistir; se ambas falharem, o aluno não é marcado como avisado e volta a ser tentado no dia seguinte.
