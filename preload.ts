const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),
  getWeeklyUsage: () => ipcRenderer.invoke('get-weekly-usage'),
  refreshData: () => ipcRenderer.invoke('refresh-data'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  onUsageUpdated: (callback: () => void) => ipcRenderer.on('usage-updated', callback),
  removeUsageUpdatedListener: (callback: () => void) =>
    ipcRenderer.removeListener('usage-updated', callback),
  // Settings methods
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('save-settings', settings),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
