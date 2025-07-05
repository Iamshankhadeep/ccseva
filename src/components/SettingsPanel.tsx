import { useEffect, useState } from 'react';
import type React from 'react';
import type { UsageStats } from '../types/usage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SettingsPanelProps {
  preferences: {
    timezone?: string;
    resetHour?: number;
    plan?: 'auto' | 'Pro' | 'Max5' | 'Max20' | 'Custom';
    customTokenLimit?: number;
    menuBarDisplayMode?: 'percentage' | 'cost' | 'alternate';
  };
  onUpdatePreferences: (preferences: Partial<SettingsPanelProps['preferences']>) => void;
  stats: UsageStats;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  preferences,
  onUpdatePreferences,
  stats,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  const handlePreferenceChange = (key: string, value: boolean | number | string) => {
    onUpdatePreferences({ [key]: value });
  };

  // Update current time every minute for real-time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate real-time countdown
  const getRealtimeCountdown = () => {
    if (!stats.actualResetInfo?.nextResetTime) {
      return 'Not available';
    }

    const now = currentTime;
    const resetTime = new Date(stats.actualResetInfo.nextResetTime);
    const timeUntilReset = Math.max(0, resetTime.getTime() - now.getTime());

    if (timeUntilReset <= 0) {
      return 'Reset available';
    }

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} hours ${minutes} minutes left`;
    }
    if (minutes > 0) {
      return `${minutes} minutes left`;
    }
    return 'Less than 1 minute left';
  };

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
          {/* Timezone Configuration */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌍</span>
              <div>
                <div className="text-white font-medium">Timezone</div>
                <div className="text-white/60 text-sm">
                  Auto-detected from your system for accurate reset times
                </div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <div className="text-white text-sm font-medium">
                  {preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
                <div className="text-white/50 text-xs mt-1">Auto-detected from system</div>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="text-blue-300 text-sm">
                    <span className="text-lg mr-2">⏱️</span>
                    <span className="font-medium">Next reset: </span>
                    <span className="text-blue-200 font-mono">{getRealtimeCountdown()}</span>
                  </div>
                </div>

                {!stats.actualResetInfo?.nextResetTime && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="text-yellow-300 text-sm">
                      <span className="text-lg mr-2">⚠️</span>
                      Using estimated reset time:{' '}
                      {stats.resetInfo
                        ? new Date(stats.resetInfo.nextResetTime).toLocaleString([], {
                            timeZone:
                              preferences.timezone ||
                              Intl.DateTimeFormat().resolvedOptions().timeZone,
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Not available'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Claude Plan Configuration */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🤖</span>
              <div>
                <div className="text-white font-medium">Claude Plan</div>
                <div className="text-white/60 text-sm">
                  Select your Claude subscription plan for accurate token limits
                </div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div>
                <div className="text-white/70 text-sm mb-2">Plan Selection</div>
                <Select
                  value={preferences.plan || 'auto'}
                  onValueChange={(value) =>
                    handlePreferenceChange(
                      'plan',
                      value as 'auto' | 'Pro' | 'Max5' | 'Max20' | 'Custom'
                    )
                  }
                >
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="Pro">Claude Pro (7,000 tokens/day)</SelectItem>
                    <SelectItem value="Max5">Claude Max5 (35,000 tokens/day)</SelectItem>
                    <SelectItem value="Max20">Claude Max20 (140,000 tokens/day)</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preferences.plan === 'Custom' && (
                <div>
                  <div className="text-white/70 text-sm mb-2">Custom Token Limit</div>
                  <input
                    type="number"
                    min="1000"
                    max="1000000"
                    step="1000"
                    value={preferences.customTokenLimit || ''}
                    onChange={(e) =>
                      handlePreferenceChange(
                        'customTokenLimit',
                        Number.parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-white/50 focus:border-blue-500 focus:outline-none"
                    placeholder="Enter custom token limit"
                  />
                  <div className="text-white/50 text-xs mt-1">Tokens per day</div>
                </div>
              )}

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="text-green-300 text-sm">
                  <span className="text-lg mr-2">ℹ️</span>
                  Current detected plan: <span className="font-medium">{stats.currentPlan}</span>
                  {stats.tokenLimit && (
                    <span className="ml-2">({stats.tokenLimit.toLocaleString()} tokens/day)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Bar Display Mode */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-white font-medium">Menu Bar Display</div>
                <div className="text-white/60 text-sm">
                  Choose how information is displayed in the menu bar
                </div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div>
                <div className="text-white/70 text-sm mb-2">Display Mode</div>
                <Select
                  value={preferences.menuBarDisplayMode || 'alternate'}
                  onValueChange={(value: 'percentage' | 'cost' | 'alternate') =>
                    handlePreferenceChange('menuBarDisplayMode', value)
                  }
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <SelectValue placeholder="Select display mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Only</SelectItem>
                    <SelectItem value="cost">Cost Only</SelectItem>
                    <SelectItem value="alternate">Alternate (switch every 3s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-blue-300 text-sm">
                  <span className="text-lg mr-2">💡</span>
                  {preferences.menuBarDisplayMode === 'percentage' && (
                    <span>Menu bar will show usage percentage only (e.g., 75%)</span>
                  )}
                  {preferences.menuBarDisplayMode === 'cost' && (
                    <span>Menu bar will show total cost only (e.g., $1.25)</span>
                  )}
                  {(!preferences.menuBarDisplayMode || preferences.menuBarDisplayMode === 'alternate') && (
                    <span>Menu bar will alternate between percentage and cost every 3 seconds</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
