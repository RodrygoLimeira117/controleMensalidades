const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const { spawn } = require('child_process');

// ---------------------------------------------------------------------
// "Tudo junto": ao abrir o app, o Electron sobe sozinho a API (Java) e o
// worker do WhatsApp (Node) como processos filhos, sem precisar de terminal
// nenhum aberto à parte. Uma tela de splash fica visível enquanto a API
// não responde no health check; só então a janela principal aparece.
//
// Em modo empacotado (instalador), a API roda com um JRE portátil que vem
// junto no instalador (resources/runtime/jre-win-x64) e o worker roda com o
// próprio runtime Node embutido no Electron (ELECTRON_RUN_AS_NODE=1) - ou
// seja, o usuário final não precisa ter Java nem Node instalados na máquina.
//
// Em modo desenvolvimento (npm start, direto da pasta do projeto), cai de
// volta pro "java"/"npm" do PATH do sistema, como já era antes.
// ---------------------------------------------------------------------

const EMPACOTADO = app.isPackaged;
// Empacotado: process.resourcesPath (onde o electron-builder copia os extraResources).
// Dev: a própria pasta muaythai-desktop-app, já que é lá que backend/ e runtime/ ficam
// (mesma base usada pelos caminhos "from" do extraResources no package.json).
const PASTA_RESOURCES = EMPACOTADO ? process.resourcesPath : __dirname;

// Fixa o nome interno do app (usado por app.getPath('userData')) para um valor
// estável, sem acentos/espaços - senão o nome mudaria entre modo dev (usa o
// campo "name" do package.json) e modo empacotado (usa o "productName"), e a
// pasta de dados do usuário mudaria de lugar dependendo de como o app rodou.
app.setName('vipers-fight-team-gestao');

let processoApi = null;
let processoWhatsApp = null;
let janelaPrincipal = null;
let janelaSplash = null;
let janelaQrCode = null;

// ---------- Segredos gerados no primeiro uso ----------
// Guardamos um JWT_SECRET fixo por instalação em vez de gerar um novo a cada
// start (senão todo mundo seria deslogado sempre que o app reabrisse).
// Fica em userData, uma pasta gravável específica do usuário do Windows
// (nunca dentro de "Program Files", que é somente leitura para o app).
function obterOuCriarSegredoJwt() {
    const arquivoSegredo = path.join(app.getPath('userData'), 'jwt.secret');
    if (fs.existsSync(arquivoSegredo)) {
        return fs.readFileSync(arquivoSegredo, 'utf-8').trim();
    }
    const novoSegredo = crypto.randomBytes(48).toString('base64');
    fs.mkdirSync(path.dirname(arquivoSegredo), { recursive: true });
    fs.writeFileSync(arquivoSegredo, novoSegredo, 'utf-8');
    return novoSegredo;
}

// Mesma lógica para o usuário administrador: nunca usar a senha padrão
// "admin123" num app instalado de verdade. Gera uma senha aleatória forte só
// na primeira vez e mostra pro usuário numa caixa de diálogo, pra ele anotar -
// depois disso, a senha já está salva no banco (hash) e não muda mais sozinha.
function obterOuCriarCredenciaisAdmin() {
    const arquivoCredenciais = path.join(app.getPath('userData'), 'admin.credentials.json');

    if (fs.existsSync(arquivoCredenciais)) {
        const salvo = JSON.parse(fs.readFileSync(arquivoCredenciais, 'utf-8'));
        return { ...salvo, primeiraVez: false };
    }

    const credenciais = {
        username: 'admin',
        password: crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '')
    };
    fs.mkdirSync(path.dirname(arquivoCredenciais), { recursive: true });
    fs.writeFileSync(arquivoCredenciais, JSON.stringify(credenciais, null, 2), 'utf-8');
    return { ...credenciais, primeiraVez: true };
}

// ---------- Janela de splash (enquanto a API sobe) ----------
function abrirSplash() {
    janelaSplash = new BrowserWindow({
        width: 420,
        height: 320,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    janelaSplash.loadFile('splash.html');
}

function atualizarSplash(mensagem) {
    if (janelaSplash && !janelaSplash.isDestroyed()) {
        janelaSplash.webContents.executeJavaScript(
            `document.getElementById('status').innerText = ${JSON.stringify(mensagem)};`
        ).catch(() => {});
    }
}

function fecharSplash() {
    if (janelaSplash && !janelaSplash.isDestroyed()) {
        janelaSplash.close();
        janelaSplash = null;
    }
}

// ---------- Janela principal ----------
function criarJanelaPrincipal() {
    janelaPrincipal = new BrowserWindow({
        width: 1100,
        height: 750,
        show: false, // só aparece quando o conteúdo já carregou, evita "flash" de tela branca
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true
    });

    janelaPrincipal.once('ready-to-show', () => {
        fecharSplash();
        janelaPrincipal.show();
    });

    janelaPrincipal.loadFile('index.html');
}

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
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    janelaQrCode.loadFile('qr.html');
    janelaQrCode.on('closed', () => { janelaQrCode = null; });
}

// ---------- API (backend Java) ----------
function caminhoJavaPortatil() {
    // Onde o script scripts/preparar-instalador-windows.ps1 deixa o JRE portátil
    const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
    const candidato = path.join(PASTA_RESOURCES, 'runtime', 'jre-win-x64', 'bin', javaExe);
    if (fs.existsSync(candidato)) return candidato;
    // Fallback (modo dev sem JRE portátil baixado ainda): usa o "java" do PATH do sistema
    return 'java';
}

function caminhoJarApi() {
    return path.join(PASTA_RESOURCES, 'backend', 'app.jar');
}

function iniciarApi() {
    return new Promise((resolve, reject) => {
        const caminhoJar = caminhoJarApi();

        if (!fs.existsSync(caminhoJar)) {
            if (EMPACOTADO) {
                // Num app instalado isso não deveria acontecer nunca - sem o jar, não tem como funcionar.
                reject(new Error(
                    `API não encontrada em ${caminhoJar}.\n\n` +
                    'O instalador parece corrompido ou incompleto. Reinstale o programa.'
                ));
                return;
            }

            // Modo desenvolvimento sem o jar copiado ainda: não trava o dev - assume que a
            // API está sendo rodada manualmente (ex.: pelo IntelliJ) e só fica esperando ela
            // responder. Se você quiser que o Electron suba a API sozinho também em dev, rode
            // scripts/preparar-instalador-windows.ps1 (ou copie o .jar pra backend/app.jar).
            console.warn(
                `[api] backend/app.jar não encontrado - assumindo modo dev com a API rodando à parte ` +
                `(ex.: pelo IntelliJ). Aguardando responder em localhost:8080...`
            );
            atualizarSplash('Aguardando a API (modo dev)...');
            aguardarApiSubir(resolve, reject);
            return;
        }

        const pastaDados = app.getPath('userData');
        const arquivoBanco = path.join(pastaDados, 'banco_tatame');
        const credenciaisAdmin = obterOuCriarCredenciaisAdmin();

        if (credenciaisAdmin.primeiraVez) {
            dialog.showMessageBoxSync({
                type: 'info',
                title: 'Primeiro acesso',
                message: 'Conta de administrador criada',
                detail:
                    `Usuário: ${credenciaisAdmin.username}\n` +
                    `Senha: ${credenciaisAdmin.password}\n\n` +
                    'Anote essa senha em um lugar seguro agora - ela não será mostrada de novo. ' +
                    'Você pode trocá-la depois pelo próprio sistema.'
            });
        }

        processoApi = spawn(caminhoJavaPortatil(), ['-jar', caminhoJar], {
            cwd: path.dirname(caminhoJar),
            env: {
                ...process.env,
                // Grava o banco H2 numa pasta do usuário (gravável), nunca dentro da
                // pasta de instalação (Program Files é somente leitura)
                DB_URL: `jdbc:h2:file:${arquivoBanco};AUTO_SERVER=TRUE`,
                JWT_SECRET: obterOuCriarSegredoJwt(),
                ADMIN_USERNAME: credenciaisAdmin.username,
                ADMIN_PASSWORD: credenciaisAdmin.password,
                H2_CONSOLE_ENABLED: 'false',
                SWAGGER_ENABLED: 'false'
            }
        });

        processoApi.stdout.on('data', (dados) => console.log(`[api] ${dados}`));
        processoApi.stderr.on('data', (dados) => console.error(`[api] ${dados}`));

        processoApi.on('error', (erro) => {
            console.error('[api] erro ao iniciar processo:', erro);
            reject(erro);
        });

        processoApi.on('exit', (codigo) => {
            console.log(`[api] processo encerrado, código ${codigo}`);
            processoApi = null;
            // Se a API cair depois de já estar tudo funcionando, avisa o usuário
            // em vez de deixar a tela travada sem explicação.
            if (janelaPrincipal && !janelaPrincipal.isDestroyed() && codigo !== 0) {
                dialog.showErrorBox(
                    'A API parou de responder',
                    'O serviço interno do sistema foi encerrado inesperadamente. Feche e abra o app novamente.'
                );
            }
        });

        aguardarApiSubir(resolve, reject);
    });
}

// Fica perguntando pro /actuator/health até a API responder "UP" (ou desistir depois de um tempo)
function aguardarApiSubir(resolve, reject, tentativas = 0) {
    const LIMITE_TENTATIVAS = 60; // 60 x 1s = até 1 minuto esperando a API subir

    const requisicao = http.get('http://localhost:8080/actuator/health', (res) => {
        let corpo = '';
        res.on('data', (pedaco) => { corpo += pedaco; });
        res.on('end', () => {
            if (res.statusCode === 200 && corpo.includes('"status":"UP"')) {
                resolve();
            } else {
                tentarDeNovo();
            }
        });
    });

    requisicao.on('error', tentarDeNovo);

    function tentarDeNovo() {
        if (tentativas >= LIMITE_TENTATIVAS) {
            reject(new Error('A API demorou demais para responder. Confira se a porta 8080 já está sendo usada por outro programa.'));
            return;
        }
        atualizarSplash(`Iniciando serviços... (${tentativas + 1}/${LIMITE_TENTATIVAS})`);
        setTimeout(() => aguardarApiSubir(resolve, reject, tentativas + 1), 1000);
    }
}

function pararApi() {
    if (!processoApi) return;
    processoApi.kill();
    processoApi = null;
}

// ---------- Worker do WhatsApp (Node) ----------
// Roda o worker usando o próprio Node embutido no Electron (truque
// ELECTRON_RUN_AS_NODE), então não precisa de Node.js instalado na máquina
// do usuário final - nem em modo empacotado, nem em desenvolvimento.
function iniciarProcessoWhatsApp() {
    if (processoWhatsApp) return { jaEstavaRodando: true };

    const pastaWorker = EMPACOTADO
        ? path.join(PASTA_RESOURCES, 'whatsapp-worker')
        : path.join(__dirname, '..', 'muaythai-whatsapp-worker');

    const entradaWorker = path.join(pastaWorker, 'index.js');

    if (!fs.existsSync(path.join(pastaWorker, 'node_modules'))) {
        return {
            jaEstavaRodando: false,
            erro: 'Dependências do worker não instaladas. Rode "npm install" em muaythai-whatsapp-worker (ou o script de preparação do instalador) e tente de novo.'
        };
    }

    processoWhatsApp = spawn(process.execPath, [entradaWorker], {
        cwd: pastaWorker,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: '3000' }
    });

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

    return { jaEstavaRodando: false };
}

function pararProcessoWhatsApp() {
    if (!processoWhatsApp) return false;
    processoWhatsApp.kill();
    processoWhatsApp = null;
    return true;
}

// ---------- IPC (chamado pela tela de Configurações) ----------
// O processo do worker agora já sobe sozinho com o app; estes handlers
// continuam existindo para o botão "Conectar WhatsApp" (abre a janela do QR
// code) e para reiniciar o worker manualmente se algo der errado.
ipcMain.handle('iniciar-whatsapp', () => {
    const resultado = iniciarProcessoWhatsApp();
    if (!resultado.erro) abrirJanelaQrCode();
    return resultado;
});
ipcMain.handle('parar-whatsapp', () => pararProcessoWhatsApp());
ipcMain.handle('status-processo-whatsapp', () => ({ rodando: processoWhatsApp !== null }));
ipcMain.handle('abrir-qr-code', () => { abrirJanelaQrCode(); return true; });

// ---------- Ciclo de vida do app ----------
app.whenReady().then(async () => {
    abrirSplash();
    atualizarSplash('Iniciando serviços...');

    try {
        await iniciarApi();
    } catch (erro) {
        fecharSplash();
        dialog.showErrorBox('Não foi possível iniciar o sistema', erro.message);
        app.quit();
        return;
    }

    // O worker do WhatsApp sobe em segundo plano, sem travar a tela: a
    // conexão em si só é necessária quando o usuário for mandar cobrança.
    const resultadoWorker = iniciarProcessoWhatsApp();
    if (resultadoWorker.erro) console.error('[whatsapp-worker]', resultadoWorker.erro);

    criarJanelaPrincipal();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal();
    });
});

app.on('window-all-closed', () => {
    pararProcessoWhatsApp();
    pararApi();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    pararProcessoWhatsApp();
    pararApi();
});
