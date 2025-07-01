import type React from 'react';
import type { UsageStats } from '../types/usage';
import { PLAN_DEFINITIONS } from '../constants/plans';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';

interface SettingsPanelProps {
  preferences: {
    autoRefresh: boolean;
    refreshInterval: number;
    theme: 'auto' | 'light' | 'dark';
    notifications: boolean;
    animationsEnabled: boolean;
    timezone?: string;
    resetHour?: number;
    plan?: 'Pro' | 'Max5' | 'Max20' | 'Custom' | 'auto';
    customTokenLimit?: number;
  };
  onUpdatePreferences: (preferences: Partial<SettingsPanelProps['preferences']>) => void;
  stats: UsageStats;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  preferences,
  onUpdatePreferences,
  stats,
}) => {
  const handlePreferenceChange = (key: string, value: boolean | number | string) => {
    onUpdatePreferences({ [key]: value });
  };

  const refreshIntervalOptions = [
    { value: 15000, label: '15 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
    { value: 300000, label: '5 minutes' },
  ];

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Settings</CardTitle>
          <CardDescription className="text-white/70">
            Customize your CCSeva experience
          </CardDescription>
        </CardHeader>
      </Card>

      {/* General Settings */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardContent className="p-6 space-y-6">
          {/* Auto Refresh */}
          {/* <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <div className="text-white font-medium">Auto Refresh</div>
                  <div className="text-white/60 text-sm">Automatically update usage data</div>
                </div>
              </div>

              <Switch
                checked={preferences.autoRefresh}
                onCheckedChange={(checked) => handlePreferenceChange('autoRefresh', checked)}
              />
            </div>

            {preferences.autoRefresh && (
              <div className="ml-11 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-white/70 text-sm">Refresh interval</div>
                  <div className="text-white text-sm font-medium">
                    {refreshIntervalOptions.find((opt) => opt.value === preferences.refreshInterval)
                      ?.label || '30 seconds'}
                  </div>
                </div>
                <Slider
                  value={[preferences.refreshInterval]}
                  onValueChange={(value) => handlePreferenceChange('refreshInterval', value[0])}
                  min={15000}
                  max={300000}
                  step={15000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/50">
                  <span>15s</span>
                  <span>1m</span>
                  <span>5m</span>
                </div>
              </div>
            )}
          </div> */}

          {/* Theme Selection */}
          {/* <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎨</span>
              <div>
                <div className="text-white font-medium">Theme</div>
                <div className="text-white/60 text-sm">Choose your preferred appearance</div>
              </div>
            </div>

            <div className="ml-11 grid grid-cols-3 gap-3">
              {['auto', 'light', 'dark'].map((theme) => (
                <Button
                  key={theme}
                  onClick={() => handlePreferenceChange('theme', theme)}
                  variant="outline"
                  className={`
                    p-3 h-auto flex-col text-sm font-medium transition-all duration-300 hover:scale-105
                    ${
                      preferences.theme === theme
                        ? 'border-blue-400 bg-blue-500/20 text-white hover:bg-blue-500/30'
                        : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
                    }
                  `}
                >
                  {theme === 'auto' && '🌓'} {theme === 'light' && '☀️'} {theme === 'dark' && '🌙'}
                  <div className="capitalize mt-1">{theme}</div>
                </Button>
              ))}
            </div>
          </div> */}
          {/* Notifications */}
          {/* <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <div className="text-white font-medium">Notifications</div>
                  <div className="text-white/60 text-sm">Get alerts for usage milestones</div>
                </div>
              </div>

              <Switch
                checked={preferences.notifications}
                onCheckedChange={(checked) => handlePreferenceChange('notifications', checked)}
              />
            </div>
          </div> */}

          {/* Animations */}
          {/* <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">✨</span>
                <div>
                  <div className="text-white font-medium">Animations</div>
                  <div className="text-white/60 text-sm">Enable smooth transitions and effects</div>
                </div>
              </div>

              <Switch
                checked={preferences.animationsEnabled}
                onCheckedChange={(checked) => handlePreferenceChange('animationsEnabled', checked)}
              />
            </div>
          </div> */}

          {/* Plan Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-white font-medium">Subscription Plan</div>
                <div className="text-white/60 text-sm">
                  Select your Claude plan for accurate usage tracking
                </div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <Select
                value={preferences.plan || 'auto'}
                onValueChange={(value) => handlePreferenceChange('plan', value)}
              >
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="Pro">Claude Pro ($20/month)</SelectItem>
                  <SelectItem value="Max5">Claude Max - Expanded ($100/month)</SelectItem>
                  <SelectItem value="Max20">Claude Max - Maximum ($200/month)</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {preferences.plan && preferences.plan !== 'auto' && (
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 space-y-2">
                  <div className="text-sm text-white/70">
                    <span className="font-medium text-white">{PLAN_DEFINITIONS[preferences.plan]?.displayName}</span>
                  </div>
                  <div className="text-sm text-white/60">
                    • {PLAN_DEFINITIONS[preferences.plan]?.messagesPerWindow} messages per 5-hour window
                  </div>
                  <div className="text-sm text-white/60">
                    • {PLAN_DEFINITIONS[preferences.plan]?.tokenLimit.toLocaleString()} token limit
                  </div>
                  <div className="text-sm text-white/60">
                    • {PLAN_DEFINITIONS[preferences.plan]?.description}
                  </div>
                </div>
              )}

              {preferences.plan === 'Custom' && (
                <div className="space-y-2">
                  <div className="text-white/70 text-sm">Custom Token Limit (per 5-hour window)</div>
                  <input
                    type="number"
                    value={preferences.customTokenLimit || 500000}
                    onChange={(e) => handlePreferenceChange('customTokenLimit', Number.parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2"
                    min="1000"
                    step="1000"
                  />
                </div>
              )}

              {stats.currentPlan && preferences.plan === 'auto' && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="text-blue-300 text-sm">
                    <span className="text-lg mr-2">🔍</span>
                    Auto-detected: {PLAN_DEFINITIONS[stats.currentPlan]?.displayName || stats.currentPlan}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timezone Configuration */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌍</span>
              <div>
                <div className="text-white font-medium">Timezone</div>
                <div className="text-white/60 text-sm">
                  Set your timezone for accurate reset times
                </div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <Select
                value={preferences.timezone || 'America/Los_Angeles'}
                onValueChange={(value) => handlePreferenceChange('timezone', value)}
              >
                <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                  <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-white/70 text-sm mb-1">Reset Hour</div>
                  <Select
                    value={(preferences.resetHour || 0).toString()}
                    onValueChange={(value) =>
                      handlePreferenceChange('resetHour', Number.parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem
                          key={`reset-hour-${i.toString().padStart(2, '0')}`}
                          value={i.toString()}
                        >
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="text-white/70 text-sm mb-1">Current Time</div>
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    {new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: preferences.timezone || 'America/Los_Angeles',
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-blue-300 text-sm">
                  <span className="text-lg mr-2">ℹ️</span>
                  Next reset:{' '}
                  {stats.resetInfo
                    ? new Date(stats.resetInfo.nextResetTime).toLocaleString([], {
                        timeZone: preferences.timezone || 'America/Los_Angeles',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Not available'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
