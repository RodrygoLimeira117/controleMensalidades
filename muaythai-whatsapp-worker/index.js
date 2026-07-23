require('dotenv').config(); // <-- 1. Carrega as variáveis de ambiente do arquivo .env

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

// O endpoint /api/whatsapp/status (e agora /qr) é chamado direto pelo navegador
// do app desktop (diferente de /enviar, que só é chamado pelo backend Java),
// então precisa de CORS.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// Guarda se o cliente do WhatsApp está autenticado e pronto para enviar mensagens.
// O app desktop consulta /api/whatsapp/status periodicamente para mostrar isso ao usuário.
let whatsappPronto = false;

// Guarda a imagem do QR code mais recente (em base64), para o app desktop
// exibir dentro da própria tela, sem precisar abrir um navegador separado.
let ultimoQrCodeImagem = null;

// Chrome roda invisível (headless) — o QR code some sozinho e aparece
// dentro do app desktop em vez de abrir uma janela de navegador.
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

// Gera o QR Code: imprime no terminal (útil para depuração) e também guarda
// como imagem para o app desktop buscar via /api/whatsapp/qr
client.on('qr', async (qr) => {
    console.log('=== NOVO QR CODE GERADO (também disponível no app desktop) ===');
    qrcodeTerminal.generate(qr, { small: true });

    try {
        ultimoQrCodeImagem = await QRCode.toDataURL(qr);
    } catch (erro) {
        console.error('Não foi possível gerar a imagem do QR code:', erro);
    }
});

// Avisa quando o WhatsApp estiver conectado e pronto
client.on('ready', () => {
    whatsappPronto = true;
    ultimoQrCodeImagem = null; // não precisa mais mostrar QR code
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

// Rota que o app desktop consulta para exibir o QR code atual na tela
app.get('/api/whatsapp/qr', (req, res) => {
    res.status(200).json({ qr: ultimoQrCodeImagem });
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
