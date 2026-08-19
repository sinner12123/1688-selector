const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  search: (kw, opts) => ipcRenderer.invoke('search', kw, opts),
  getStatus: () => ipcRenderer.invoke('getStatus'),
  login: () => ipcRenderer.invoke('login'),
  loginPoll: () => ipcRenderer.invoke('loginPoll'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});
