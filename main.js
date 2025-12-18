const { app, BrowserWindow } = require('electron');
const path = require('path');

process.env.DB_PATH = path.join(app.getPath('userData'), 'optioncontracts.db');

require('./server');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadFile('index.html');
});