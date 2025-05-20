const { app, BrowserWindow } = require('electron');
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  remoteMain.enable(win.webContents);

  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});