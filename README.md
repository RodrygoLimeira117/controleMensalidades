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
