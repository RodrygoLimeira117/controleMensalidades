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

### Pré-requisitos
- JDK 21+
- Maven (para rodar `mvn spring-boot:run`)
- Node.js 18+ (necessário para o worker e para o Electron)

> Não é preciso instalar nenhum banco de dados: a API usa H2 em modo arquivo, criado automaticamente na primeira execução.

### 1. Backend (Java/Spring Boot)
```bash
cd muaythai-api
mvn spring-boot:run
```
*A API ficará disponível em `http://localhost:8080`*

### 2. Worker do WhatsApp (Node.js)

Não precisa rodar este passo manualmente: o app desktop liga o worker sozinho (aba Configurações → "Iniciar Robô") e mostra o QR code direto na tela. Isso só é necessário se quiser rodar o worker separadamente para depurar:
```bash
cd muaythai-whatsapp-worker
npm install
# Crie o ficheiro .env na raiz desta pasta com PORT=3000
npm start
```
*O Chrome roda invisível (headless); o QR code aparece no app desktop, não numa janela de navegador.*

### 3. Aplicativo Desktop (Electron)
```bash
cd muaythai-desktop-app
npm install
npm start
```
*A interface gráfica da Vipers abrirá como uma aplicação nativa no seu sistema. Na aba Configurações, clique em "Iniciar Robô" para ligar o WhatsApp e escanear o QR code.*

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
