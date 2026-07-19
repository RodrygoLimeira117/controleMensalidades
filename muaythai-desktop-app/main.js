const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        webPreferences: {
            // A interface só faz fetch() para a API local, não precisa de acesso a APIs do Node.
            // Manter isolamento de contexto é a prática recomendada de segurança do Electron.
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true 
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});