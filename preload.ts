const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
  refreshData: () => ipcRenderer.invoke('refresh-data'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  updatePreferences: (preferences: any) => ipcRenderer.invoke('update-preferences', preferences),
  onUsageUpdated: (callback: () => void) => ipcRenderer.on('usage-updated', callback),
  removeUsageUpdatedListener: (callback: () => void) =>
    ipcRenderer.removeListener('usage-updated', callback),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
