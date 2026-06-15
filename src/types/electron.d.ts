import type { AppSettings } from '../services/settingsService';
import type { UsageStats, WeeklyUsage } from './usage';

export interface ScreenshotResult {
  success: boolean;
  filename?: string;
  filepath?: string;
  message?: string;
  error?: string;
}

export interface ElectronAPI {
  getUsageStats: () => Promise<UsageStats>;
  getWeeklyUsage: () => Promise<WeeklyUsage[]>;
  refreshData: () => Promise<UsageStats>;
  quitApp: () => Promise<void>;
  takeScreenshot: () => Promise<ScreenshotResult>;
  onUsageUpdated: (callback: () => void) => void;
  removeUsageUpdatedListener: (callback: () => void) => void;
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
