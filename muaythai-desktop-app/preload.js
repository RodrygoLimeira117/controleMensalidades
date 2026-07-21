const { contextBridge, ipcRenderer } = require('electron');

// Expõe só o necessário para a tela controlar o robô do WhatsApp — o resto
// da API do Node/Electron continua inacessível ao HTML/JS da interface
// (é para isso que serve nodeIntegration:false + contextIsolation:true).
contextBridge.exposeInMainWorld('electronAPI', {
    iniciarWhatsApp: () => ipcRenderer.invoke('iniciar-whatsapp'),
    pararWhatsApp: () => ipcRenderer.invoke('parar-whatsapp'),
    statusProcessoWhatsApp: () => ipcRenderer.invoke('status-processo-whatsapp'),
    abrirQrCode: () => ipcRenderer.invoke('abrir-qr-code')
});
