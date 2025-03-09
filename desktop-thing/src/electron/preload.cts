const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onAuthSuccess: (callback: () => void) => {
    ipcRenderer.on('auth-success', callback)
    return () => ipcRenderer.removeListener('auth-success', callback);
  },
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
});
