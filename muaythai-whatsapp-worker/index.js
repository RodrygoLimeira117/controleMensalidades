require('dotenv').config(); // <-- 1. Carrega as variáveis de ambiente do arquivo .env

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

// O endpoint /api/whatsapp/status é chamado direto pelo navegador do app desktop
// (diferente de /enviar, que só é chamado pelo backend Java), então precisa de CORS.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Guarda se o cliente do WhatsApp está autenticado e pronto para enviar mensagens.
// O app desktop consulta /api/whatsapp/status periodicamente para mostrar isso ao usuário.
let whatsappPronto = false;

// Configuração atualizada para abrir o Chrome visivelmente e evitar o bloqueio de contexto
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, // Mudamos para false. O Chrome VAI abrir na sua tela.
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox'
        ]
    }
});

// Gera o QR Code no terminal para o primeiro login
client.on('qr', (qr) => {
    console.log('=== ESCANEIE O QR CODE ABAIXO PARA CONECTAR O WHATSAPP ===');
    qrcode.generate(qr, { small: true });
});

// Avisa quando o WhatsApp estiver conectado e pronto
client.on('ready', () => {
    whatsappPronto = true;
    console.log('--- Robô do WhatsApp está conectado e pronto para enviar mensagens! ---');
});

client.on('disconnected', (motivo) => {
    whatsappPronto = false;
    console.log('⚠️ WhatsApp desconectado:', motivo);
});

client.on('auth_failure', msg => {
    whatsappPronto = false;
    console.error('Falha na autenticação do WhatsApp:', msg);
});

// Rota que o app desktop consulta para saber se o robô está conectado
app.get('/api/whatsapp/status', (req, res) => {
    res.status(200).json({ conectado: whatsappPronto });
});

// Rota HTTP que o Spring Boot vai chamar para mandar mensagens
app.post('/api/whatsapp/enviar', async (req, res) => {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
        return res.status(400).json({ error: 'Número e mensagem são obrigatórios.' });
    }

    try {
        // 1. Limpa tudo que não for número (tira traços, espaços, parênteses)
        let numeroLimpo = numero.replace(/\D/g, '');
        
        // 2. Pergunta ao WhatsApp: "Esse número tem conta ativa?"
        // Isso previne o erro "No LID for user" e já devolve o formato perfeito
        const numberDetails = await client.getNumberId(numeroLimpo);
        
        if (!numberDetails) {
            console.log(`❌ Número não encontrado no WhatsApp: ${numeroLimpo}`);
            return res.status(404).json({ error: 'Número não possui WhatsApp ativo.' });
        }

        // 3. Pega o ID oficial validado pelo WhatsApp (com o @c.us)
        const numeroFormatado = numberDetails._serialized;

        // 4. Envia a mensagem
        await client.sendMessage(numeroFormatado, mensagem);
        console.log(`✔️ Mensagem enviada com sucesso para: ${numeroFormatado}`);
        
        return res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem pelo WhatsApp:', error);
        return res.status(500).json({ error: 'Falha ao enviar a mensagem.' });
    }
});

// Inicializa o servidor local
// <-- 2. Agora ele busca a porta no .env. Se não achar, usa a 3000 como backup de segurança.
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
    console.log(`Microserviço do WhatsApp rodando na porta ${PORT}`);
    client.initialize();
});