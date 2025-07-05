import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface AppSettings {
  timezone: string;
  resetHour: number;
  plan: 'auto' | 'Pro' | 'Max5' | 'Max20' | 'Custom';
  customTokenLimit?: number;
  menuBarDisplayMode: 'percentage' | 'cost' | 'alternate';
}

export class SettingsService {
  private static instance: SettingsService;
  private settingsPath: string;
  private defaultSettings: AppSettings;

  constructor() {
    // Create settings directory in user's home directory
    const settingsDir = path.join(os.homedir(), '.ccseva');
    this.settingsPath = path.join(settingsDir, 'settings.json');

    // Auto-detect timezone as default
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    this.defaultSettings = {
      timezone: detectedTimezone,
      resetHour: 0,
      plan: 'auto',
      customTokenLimit: undefined,
      menuBarDisplayMode: 'alternate',
    };

    // Ensure settings directory exists
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
  }

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        const settings = JSON.parse(data) as Partial<AppSettings>;

        // Merge with defaults to ensure all required fields are present
        return {
          ...this.defaultSettings,
          ...settings,
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }

    // Return defaults if file doesn't exist or error occurred
    return this.defaultSettings;
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      // Load existing settings first
      const currentSettings = await this.loadSettings();

      // Merge with new settings
      const updatedSettings = {
        ...currentSettings,
        ...settings,
      };

      // Write to file
      fs.writeFileSync(this.settingsPath, JSON.stringify(updatedSettings, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  getDefaultSettings(): AppSettings {
    return { ...this.defaultSettings };
  }

  getSettingsPath(): string {
    return this.settingsPath;
  }
}
