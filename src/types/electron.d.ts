export interface ScreenshotResult {
  success: boolean;
  filename?: string;
  filepath?: string;
  message?: string;
  error?: string;
}

export interface ElectronAPI {
  getUsageStats: () => Promise<any>;
  refreshData: () => Promise<any>;
  quitApp: () => Promise<void>;
  takeScreenshot: () => Promise<ScreenshotResult>;
  onUsageUpdated: (callback: () => void) => void;
  removeUsageUpdatedListener: (callback: () => void) => void;
  loadSettings: () => Promise<any>;
  saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
  saveLanguage: (language: 'en' | 'zh') => Promise<void>;
  loadLanguage: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}