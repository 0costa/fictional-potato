const { app, BrowserWindow } = require('electron');
const caminho = require('node:path');

function criarJanelaPrincipal() {
  const janela = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#f8f8f8',
    title: 'Meu Financeiro',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: caminho.join(__dirname, 'ponte.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  janela.loadFile(caminho.join(__dirname, '..', 'src', 'index.html'));
  janela.once('ready-to-show', () => janela.show());
}

app.whenReady().then(() => {
  criarJanelaPrincipal();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
