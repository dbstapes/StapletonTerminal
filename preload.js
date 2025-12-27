const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveCredentials: (key, secret) => ipcRenderer.invoke('save-credentials', { key, secret }),
  getCredentials: () => ipcRenderer.invoke('get-credentials')
});