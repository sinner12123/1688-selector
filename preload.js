const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  search: (kw, opts) => ipcRenderer.invoke('search', kw, opts),
  overseasEbay: (kw) => ipcRenderer.invoke('overseasEbay', kw),
  overseasAmazon: (kw) => ipcRenderer.invoke('overseasAmazon', kw),
  overseasAliExpress: (kw) => ipcRenderer.invoke('overseasAliExpress', kw),
  getProxyConfig: () => ipcRenderer.invoke('getProxyConfig'),
  setProxyConfig: (proxy) => ipcRenderer.invoke('setProxyConfig', proxy),
  getStatus: () => ipcRenderer.invoke('getStatus'),
  login: () => ipcRenderer.invoke('login'),
  loginPoll: () => ipcRenderer.invoke('loginPoll'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  exportCsv: (csv, name) => ipcRenderer.invoke('exportCsv', csv, name),
});
