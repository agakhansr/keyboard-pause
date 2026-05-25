const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cleaner', {
  getStatus: () => ipcRenderer.invoke('lock:getStatus'),
  setKeyboard: (enabled) => ipcRenderer.invoke('lock:setKeyboard', enabled),
  setPointer: (enabled) => ipcRenderer.invoke('lock:setPointer', enabled),
  unlockAll: () => ipcRenderer.invoke('lock:unlockAll'),
  onStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('lock:status', listener);
    return () => ipcRenderer.removeListener('lock:status', listener);
  },
  onShortcutUnlocked: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('lock:shortcutUnlocked', listener);
    return () => ipcRenderer.removeListener('lock:shortcutUnlocked', listener);
  }
});
