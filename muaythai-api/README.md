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

| Método | Rota                        | Descrição                          |
|--------|------------------------------|-------------------------------------|
| GET    | `/api/alunos`                | Lista atletas ativos                |
| POST   | `/api/alunos`                | Cadastra um novo atleta             |
| PUT    | `/api/alunos/{cpf}/pagar`    | Registra pagamento do mês           |
| DELETE | `/api/alunos/{cpf}`          | Inativa um atleta (soft delete)     |

## Rotina agendada

`MensalidadeService` roda todos os dias às 09:00 e notifica, via o worker de WhatsApp, os atletas inadimplentes que ainda não receberam aviso no mês corrente. A chamada ao worker tenta até 2 vezes antes de desistir; se ambas falharem, o aluno não é marcado como avisado e volta a ser tentado no dia seguinte.
