# 🐍 Vipers Fight Team - Sistema de Gestão de Tatame

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![H2](https://img.shields.io/badge/H2_Database-0000C0?style=for-the-badge&logo=h2&logoColor=white)

Um ecossistema completo de software desenvolvido para automatizar a gestão de atletas, controle financeiro e cobrança inteligente de mensalidades da **Vipers Fight Team**. 

O sistema substitui o controle manual por uma arquitetura moderna dividida em três módulos independentes: uma API robusta, um microserviço de mensageria via WhatsApp e uma interface Desktop nativa.

## 🚀 Principais Funcionalidades

- **Gestão de Atletas:** Cadastro completo com validação de dados (Bean Validation) e cálculo automático de idade.
- **Cobrança Automatizada:** Integração com robô de WhatsApp que verifica pendências e envia lembretes sem intervenção humana.
- **Dashboard Financeiro Inteligente:** Cálculo em tempo real de faturamento esperado vs. caixa arrecadado.
- **Precificação por Fidelidade:** Lógica de negócio que aplica descontos automáticos na mensalidade baseados na data de matrícula do atleta (Veteranos vs. Iniciantes).
- **Interface Nativa:** Aplicativo Desktop (Dark Mode) estilizado com a identidade visual da equipa.

## 🏗️ Arquitetura do Sistema

O projeto adota uma abordagem de Monorepo, contendo os seguintes módulos:

1. **`muaythai-api` (Backend Core):** Desenvolvido em Java 17 + Spring Boot. Expõe rotas RESTful, manipula a base de dados via Spring Data JPA e possui rotinas agendadas (`@Scheduled`) para auditoria diária de mensalidades. Conta com Tratamento Global de Exceções (`@ControllerAdvice`).
2. **`muaythai-whatsapp-worker` (Microserviço):** Desenvolvido em Node.js com `whatsapp-web.js`. Atua como um worker que recebe comandos HTTP do Java e dispara mensagens diretamente para o WhatsApp dos atletas.
3. **`muaythai-desktop-app` (Frontend/Desktop):** Desenvolvido com Electron, HTML5, CSS3, e Vanilla JS. Consome a API REST e providencia a interface gráfica com validações dinâmicas de input.

## ⚙️ Como Executar Localmente

> 🚀 **Jeito mais rápido:** dê duplo clique em **`Iniciar Vipers.bat`**, na raiz do projeto. Ele compila a API na primeira vez, sobe ela em segundo plano e abre o app - sem precisar abrir terminal nenhum. As opções abaixo são para quem quer rodar cada parte manualmente (ex.: para desenvolver/depurar).

### Pré-requisitos
- JDK 21+
- Maven (para rodar `mvn spring-boot:run`)
- Node.js 18+ (necessário para o worker e para o Electron)

> Não é preciso instalar nenhum banco de dados: a API usa H2 em modo arquivo, criado automaticamente na primeira execução.

Desde que o app desktop passou a subir a API e o worker do WhatsApp sozinho (ver [seção do instalador](#-instalador-tudo-junto) abaixo), você tem dois jeitos de desenvolver:

### Opção A — Rápido para mexer só na interface (recomendado no dia a dia)
Continue rodando a API pelo IntelliJ/`mvn spring-boot:run` como sempre. O Electron detecta que não tem um `.jar` empacotado em `backend/app.jar` e entende que está em modo dev: ele só fica esperando a API responder em `localhost:8080`, sem tentar subir a sua própria cópia.

```bash
# Terminal 1
cd muaythai-api
mvn spring-boot:run

# Terminal 2
cd muaythai-desktop-app
npm install
npm start
```
*O worker do WhatsApp já sobe sozinho junto com o Electron (usando o Node embutido nele) - não precisa de um terceiro terminal. A janela do QR code abre automaticamente quando você clicar em "Iniciar Robô" na aba Configurações.*

### Opção B — Testar o comportamento "tudo junto" de verdade (como vai ficar instalado)
Roda o script que empacota tudo (API compilada + JRE portátil + worker) e usa o app exatamente como um usuário final:
```powershell
.\scripts\preparar-instalador-windows.ps1
```
Isso gera um instalador em `muaythai-desktop-app\dist\`. Veja a seção seguinte para detalhes.

## 📦 Instalador "Tudo Junto"

O app desktop não é mais "só a interface": ao abrir, ele sobe sozinho a API (Java) e o worker do WhatsApp (Node) como processos internos, com uma tela de carregamento enquanto isso acontece. Quem instalar não precisa ter Java, Node, Maven ou npm na máquina — nem abrir terminal nenhum. É só instalar e usar, como qualquer outro programa do Windows.

### Como funciona por baixo dos panos
- **API:** roda com um **JRE portátil** (Java "de mentirinha", baixado uma vez e empacotado junto do instalador) — o usuário final não instala Java.
- **Worker do WhatsApp:** roda usando o **próprio Node.js embutido no Electron** (truque `ELECTRON_RUN_AS_NODE`) — o usuário final não instala Node.
- **Banco de dados e sessão do WhatsApp:** ficam salvos numa pasta própria do Windows (`%APPDATA%\vipers-fight-team-gestao`), não dentro da pasta de instalação — assim funcionam mesmo com o programa instalado em "Arquivos de Programas" (que é somente leitura para o usuário comum).
- **Senha do administrador:** gerada aleatoriamente no primeiro uso (nunca mais `admin123`) e mostrada **uma única vez** numa caixa de diálogo — anote nesse momento.
- **Segredo do JWT:** também gerado aleatoriamente no primeiro uso e reaproveitado nas próximas aberturas do app.

### Gerando o instalador
Pré-requisitos na sua máquina de desenvolvimento (não na do usuário final): JDK 21, Maven, Node.js/npm.

```powershell
.\scripts\preparar-instalador-windows.ps1
```

O script, na ordem:
1. Compila a API (`mvn clean package`) e copia o `.jar` para `muaythai-desktop-app\backend\app.jar`
2. Baixa um JRE portátil (Eclipse Temurin 21) para `muaythai-desktop-app\runtime\jre-win-x64` — só na primeira vez, os próximos builds reaproveitam
3. Instala as dependências do worker (`npm install --omit=dev`, inclui o download do Chromium usado pelo WhatsApp)
4. Instala as dependências do Electron e gera o instalador com `electron-builder`

O instalador final (`.exe`) fica em `muaythai-desktop-app\dist\`.

> ⚠️ **Sobre code signing:** o instalador gerado não é assinado digitalmente (isso exige comprar um certificado de desenvolvedor). O Windows SmartScreen provavelmente vai avisar "Editor desconhecido" na primeira execução — é esperado, clique em "Mais informações" → "Executar assim mesmo". Isso não afeta o funcionamento do app, só a mensagem de aviso.

## 🐳 Rodando com Docker

A API e o worker do WhatsApp sobem juntos com um único comando, usando o `docker-compose.yml` na raiz do projeto. (O app desktop continua rodando na sua máquina, fora do Docker — é uma aplicação de mesa.)

### Pré-requisitos
- Docker e Docker Compose

### Passo a passo
```bash
# 1. Copie o arquivo de variáveis de ambiente e ajuste as senhas/segredos
cp .env.example .env

# 2. Suba os containers (build na primeira vez)
docker compose up --build -d

# 3. Acompanhe os logs do worker para escanear o QR code do WhatsApp
docker compose logs -f whatsapp-worker
```

Depois disso:
- API: `http://localhost:8080`
- Worker do WhatsApp: `http://localhost:3000`
- Abra o app desktop normalmente (`cd muaythai-desktop-app && npm start`) — ele já aponta para `localhost:8080` e `localhost:3000`.

### O que o `docker-compose.yml` cuida por você
- **Rede interna:** a API conversa com o worker pelo nome do serviço (`http://whatsapp-worker:3000`), sem precisar de IP fixo.
- **Persistência:** o banco H2 e a sessão autenticada do WhatsApp ficam em volumes Docker nomeados (`banco-dados`, `whatsapp-sessao`), então um `docker compose restart` não te faz perder dados nem escanear o QR code de novo.
- **Healthchecks:** a API só sobe depois que o worker responde; ambos expõem `HEALTHCHECK` para orquestradores (Swarm/Kubernetes) saberem se estão saudáveis.
- **Segredos:** `JWT_SECRET` e `ADMIN_PASSWORD` são obrigatórios no `.env` — o `docker compose up` falha com uma mensagem clara se você esquecer de defini-los (em vez de subir com valores fracos por padrão).

### Comandos úteis
```bash
docker compose down              # para os containers (mantém os volumes/dados)
docker compose down -v           # para e APAGA os volumes (banco e sessão do WhatsApp)
docker compose logs -f api       # logs só da API
docker compose build --no-cache  # força rebuild das imagens do zero
```

## 🗄️ Versionamento do Banco de Dados (Flyway)

O schema do banco (tabelas `usuarios`, `alunos`, `pagamentos`, `configuracoes`) é criado e versionado pelo Flyway, não mais pelo Hibernate (`ddl-auto` agora é `validate`: ele só confere se as entidades batem com as tabelas, nunca cria/altera nada sozinho).

- **Migrations:** `muaythai-api/src/main/resources/db/migration/V1__create_tables.sql`, `V2__...`, etc.
- **Como funciona:** ao subir, a API aplica automaticamente qualquer migration ainda não executada — em H2 local, em Docker, ou num Postgres/MySQL vazio na AWS. Nada de rodar script na mão.
- **Regra de ouro:** nunca edite uma migration que já foi aplicada em algum ambiente (dev, produção). Para mudar o schema, crie um novo arquivo (`V2__adiciona_algo.sql`) — o Flyway detecta pelo número da versão.
- **Bancos já existentes** (criados antes desta mudança, via `ddl-auto=update`): o Flyway está configurado com `baseline-on-migrate=true`, então ele assume o schema atual como ponto de partida em vez de falhar reclamando que as tabelas já existem.

### Trocando H2 por PostgreSQL em produção (ex.: AWS RDS)

Não precisa mudar nenhum código — só as variáveis de ambiente:

```bash
DB_URL=jdbc:postgresql://SEU-HOST-RDS:5432/muaythai
DB_DRIVER=org.postgresql.Driver
DB_DIALECT=org.hibernate.dialect.PostgreSQLDialect
DB_USERNAME=...
DB_PASSWORD=...
```

Na primeira subida contra um banco vazio, o Flyway cria as 4 tabelas sozinho a partir do `V1__create_tables.sql`.

## 📖 Documentação Interativa (Swagger / OpenAPI)

Com a API rodando, a documentação de todos os endpoints fica disponível em:

- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **Spec OpenAPI (JSON):** http://localhost:8080/v3/api-docs

### Como testar endpoints protegidos por lá
1. Abra o Swagger UI e expanda **Autenticação → POST /api/auth/login**.
2. Clique em "Try it out", preencha usuário/senha (ex.: `admin`/`admin123` em dev) e execute.
3. Copie o valor do campo `token` da resposta.
4. Clique no botão **Authorize** (cadeado no canto superior direito da página) e cole o token ali (sem escrever "Bearer", o Swagger já adiciona sozinho).
5. Pronto — agora todas as chamadas que você testar pela página (criar aluno, registrar pagamento, editar configurações, etc.) já vão com o token, sem precisar copiar/colar header nenhum.

### Desligando em produção
Se preferir não deixar a documentação pública num ambiente de produção, defina `SWAGGER_ENABLED=false` no `.env` (ou como variável de ambiente) — isso desliga tanto a página quanto a spec JSON. Os endpoints da API continuam funcionando normalmente; só a documentação some.

## 💾 Backup Automático

O banco de dados (cadastro de alunos, histórico de pagamentos) é um arquivo só — se o disco onde ele está morrer sem backup, você perde tudo. Os scripts em `scripts/` automatizam isso.

### Qual script usar

| Como você roda o projeto | Script |
|---|---|
| `mvn spring-boot:run` / IntelliJ, no Windows | `scripts/backup-h2-windows.ps1` |
| `mvn spring-boot:run` / IntelliJ, no Linux/Mac | `scripts/backup-h2-linux-mac.sh` |
| `docker compose up` | `scripts/backup-docker-volumes.sh` |

Por padrão, todos salvam em `vipers-backups` dentro da sua pasta de usuário e apagam backups com mais de 30 dias sozinhos.

### Backup na nuvem sem precisar de API nem senha

O jeito mais simples: instale o **Google Drive Desktop** (ou OneDrive/Dropbox), que cria uma pasta local sincronizada automaticamente. Depois, edite a variável `$PastaDestino` (Windows) ou `PASTA_DESTINO` (Linux/Mac/Docker) no início do script pra apontar pra essa pasta — por exemplo:

```powershell
$PastaDestino = "G:\Meu Drive\Backups-Vipers"
```

Assim, o script só copia o arquivo pra pasta local, e o Google Drive cuida de subir pra nuvem sozinho.

### Agendando para rodar sozinho

**Windows (Tarefas Agendadas):**
1. Abra o "Agendador de Tarefas" (Task Scheduler)
2. "Criar Tarefa Básica" → escolha rodar diariamente (ex.: todo dia às 22h)
3. Ação: "Iniciar um programa"
   - Programa: `powershell.exe`
   - Argumentos: `-ExecutionPolicy Bypass -File "C:\caminho\completo\para\scripts\backup-h2-windows.ps1"`

**Linux/Mac (cron):**
```bash
crontab -e
# adicione a linha abaixo para rodar todo dia às 22h:
0 22 * * * /caminho/completo/para/scripts/backup-h2-linux-mac.sh >> ~/vipers-backups/backup.log 2>&1
```

### Restaurando um backup
Basta parar a API, substituir o arquivo `banco_tatame.mv.db` (Windows/Linux/Mac) pelo backup desejado — ou, no Docker, `docker run --rm -v <volume>:/destino -v <pasta-backup>:/origem alpine sh -c "rm -rf /destino/* && tar xzf /origem/SEU_BACKUP.tar.gz -C /destino"` — e subir a API de novo.

## 🛡️ Segurança e Boas Práticas

- **Validação de Entrada:** Máscaras no frontend e Bean Validation (`@Valid`, `@NotBlank`, `@Size`) no backend garantem integridade dos CPFs e telemóveis.
- **Segurança de Credentials:** Utilização de `.env` para proteção de portas e rotas.
- **Exclusão Lógica (Soft Delete):** Atletas inativados não são apagados fisicamente da base de dados, mantendo o histórico financeiro intacto.

## 🔄 CI/CD

Três workflows do GitHub Actions rodam automaticamente a cada push/PR que toque em cada módulo:

- **`ci-api.yml`** — compila e roda os testes da API (`mvn verify`).
- **`ci-worker.yml`** — valida se as dependências do worker instalam sem erro (`npm ci`).
- **`ci-desktop.yml`** — idem, para o app desktop.

Um quarto workflow, **`release-desktop.yml`**, gera o instalador Windows (`.exe`) automaticamente sempre que uma tag `v*` é publicada:
```bash
git tag v1.0.0
git push origin v1.0.0
```
O instalador fica disponível como artefato da execução, na aba *Actions* do repositório.

### Gerando o instalador manualmente

```bash
cd muaythai-desktop-app
npm install
npm run dist
```
O instalador gerado (Windows: `.exe` via NSIS, macOS: `.dmg`, Linux: `.AppImage`) fica em `muaythai-desktop-app/dist/`.

## 📄 Licença

Este projeto está licenciado sob os termos da licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
*Desenvolvido para fortalecer o tatame com tecnologia.*
