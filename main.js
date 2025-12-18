const { app, BrowserWindow } = require('electron');

require('./server');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600
  });

  win.loadFile('index.html');
});