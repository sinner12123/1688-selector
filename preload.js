const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  search: (kw, opts) => ipcRenderer.invoke('search', kw, opts),
  overseas: (kw) => ipcRenderer.invoke('overseas', kw),
  getProxyConfig: () => ipcRenderer.invoke('getProxyConfig'),
  setProxyConfig: (proxy) => ipcRenderer.invoke('setProxyConfig', proxy),
  getStatus: () => ipcRenderer.invoke('getStatus'),
  login: () => ipcRenderer.invoke('login'),
  loginPoll: () => ipcRenderer.invoke('loginPoll'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
});
