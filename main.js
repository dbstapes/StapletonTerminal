const { app, BrowserWindow, ipcMain } = require('electron');
require('dotenv').config();
const path = require('path');
const Store = require('electron-store');

const store = new Store();

process.env.DB_PATH = path.join(app.getPath('userData'), 'optioncontracts.db');

require('./server');

ipcMain.handle('save-credentials', (event, { key, secret }) => {
  store.set('alpacaKey', key);
  store.set('alpacaSecret', secret);
  // Also update process.env
  process.env.ALPACA_KEY = key;
  process.env.ALPACA_SECRET = secret;
  return true;
});

ipcMain.handle('get-credentials', () => {
  return {
    key: store.get('alpacaKey', ''),
    secret: store.get('alpacaSecret', '')
  };
});

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');
});