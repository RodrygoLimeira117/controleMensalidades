# 🐍 Vipers Fight Team - Sistema de Gestão de Tatame

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)

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
- JDK 17+
- Node.js (v18+)
- Banco de Dados SQL em execução na porta 3306

### 1. Backend (Java/Spring Boot)
\`\`\`bash
cd muaythai-api
# Configure as credenciais do banco de dados no application.properties
./mvnw spring-boot:run
\`\`\`
*A API ficará disponível em `http://localhost:8080`*

### 2. Worker do WhatsApp (Node.js)
\`\`\`bash
cd muaythai-whatsapp-worker
npm install
# Crie o ficheiro .env na raiz desta pasta com PORT=3000
npm start
\`\`\`
*Um navegador Chrome abrirá. Escaneie o QR Code no terminal com o seu WhatsApp.*

### 3. Aplicativo Desktop (Electron)
\`\`\`bash
cd muaythai-desktop-app
npm install
npm start
\`\`\`
*A interface gráfica da Vipers abrirá como uma aplicação nativa no seu sistema.*

## 🛡️ Segurança e Boas Práticas

- **Validação de Entrada:** Máscaras no frontend e Bean Validation (`@Valid`, `@NotBlank`, `@Size`) no backend garantem integridade dos CPFs e telemóveis.
- **Segurança de Credentials:** Utilização de `.env` para proteção de portas e rotas.
- **Exclusão Lógica (Soft Delete):** Atletas inativados não são apagados fisicamente da base de dados, mantendo o histórico financeiro intacto.

## 📄 Licença

Este projeto está licenciado sob os termos da licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
*Desenvolvido para fortalecer o tatame com tecnologia.*
