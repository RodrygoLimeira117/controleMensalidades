const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Processo Node do worker do WhatsApp (muaythai-whatsapp-worker), quando ligado por aqui.
let processoWhatsApp = null;
let janelaPrincipal = null;
let janelaQrCode = null;

function createWindow() {
    janelaPrincipal = new BrowserWindow({
        width: 1100,
        height: 750,
        webPreferences: {
            // A interface só faz fetch() para a API local, não precisa de acesso a APIs do Node.
            // Manter isolamento de contexto é a prática recomendada de segurança do Electron.
            // O preload expõe só o necessário (controle do robô) via contextBridge.
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true 
    });

    janelaPrincipal.loadFile('index.html');
}

// Janela pequena e separada, só com o QR code — os logs do worker ficam só
// no console interno do Electron, sem poluir a tela do app.
function abrirJanelaQrCode() {
    if (janelaQrCode && !janelaQrCode.isDestroyed()) {
        janelaQrCode.focus();
        return;
    }

    janelaQrCode = new BrowserWindow({
        width: 380,
        height: 520,
        resizable: false,
        title: 'Conectar WhatsApp',
        parent: janelaPrincipal || undefined,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    janelaQrCode.loadFile('qr.html');
    janelaQrCode.on('closed', () => { janelaQrCode = null; });
}

// Liga o worker do WhatsApp (muaythai-whatsapp-worker) como um processo filho.
// O worker roda o Chrome invisível (headless) e expõe o QR code por HTTP;
// a janela dedicada (qr.html) busca e mostra esse código.
function iniciarProcessoWhatsApp() {
    if (processoWhatsApp) {
        abrirJanelaQrCode();
        return { jaEstavaRodando: true };
    }

    const pastaWorker = path.join(__dirname, '..', 'muaythai-whatsapp-worker');

    // Causa mais comum de "não acontece nada": ninguém rodou "npm install" na
    // pasta do worker ainda, então o "npm start" falharia sem instalar nada.
    if (!fs.existsSync(path.join(pastaWorker, 'node_modules'))) {
        return {
            jaEstavaRodando: false,
            erro: 'Dependências do worker não instaladas. Abra um terminal, entre em muaythai-whatsapp-worker e rode "npm install", depois tente de novo.'
        };
    }

    processoWhatsApp = spawn('npm', ['start'], {
        cwd: pastaWorker,
        shell: true // necessário no Windows para resolver o npm.cmd
    });

    // Os logs continuam só no console interno do Electron (Ajuda > Alternar
    // Ferramentas do Desenvolvedor, se algum dia precisar depurar) — não
    // aparecem mais na tela do app.
    processoWhatsApp.stdout.on('data', (dados) => console.log(`[whatsapp-worker] ${dados}`));
    processoWhatsApp.stderr.on('data', (dados) => console.error(`[whatsapp-worker] ${dados}`));

    processoWhatsApp.on('exit', (codigo) => {
        console.log(`[whatsapp-worker] processo encerrado, código ${codigo}`);
        processoWhatsApp = null;
    });

    processoWhatsApp.on('error', (erro) => {
        console.error('[whatsapp-worker] erro ao iniciar o processo:', erro);
        processoWhatsApp = null;
    });

    abrirJanelaQrCode();
    return { jaEstavaRodando: false };
}

function pararProcessoWhatsApp() {
    if (!processoWhatsApp) return false;
    processoWhatsApp.kill();
    processoWhatsApp = null;
    return true;
}

ipcMain.handle('iniciar-whatsapp', () => iniciarProcessoWhatsApp());
ipcMain.handle('parar-whatsapp', () => pararProcessoWhatsApp());
ipcMain.handle('status-processo-whatsapp', () => ({ rodando: processoWhatsApp !== null }));
ipcMain.handle('abrir-qr-code', () => { abrirJanelaQrCode(); return true; });

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    // Encerra o worker junto com o app, para não deixar um processo Node/Chrome órfão rodando
    pararProcessoWhatsApp();
    if (process.platform !== 'darwin') app.quit();
});
