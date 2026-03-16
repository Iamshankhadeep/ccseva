import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    menuBarCostDisplayMode?: 'today' | 'sessionWindow' | 'alternate';
    language?: 'en' | 'zh';
  };
  onUpdatePreferences: (preferences: Partial<SettingsPanelProps['preferences']>) => void;
  stats: UsageStats;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  preferences,
  onUpdatePreferences,
  stats,
}) => {
  const { t, i18n } = useTranslation();
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
      return t('settingsPanel.notAvailable');
    }

    const now = currentTime;
    const resetTime = new Date(stats.actualResetInfo.nextResetTime);
    const timeUntilReset = Math.max(0, resetTime.getTime() - now.getTime());

    if (timeUntilReset <= 0) {
      return t('settingsPanel.resetAvailable');
    }

    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours} ${t('settingsPanel.hoursLeft')} ${minutes} ${t('settingsPanel.minutesLeft')}`;
    }
    if (minutes > 0) {
      return `${minutes} ${t('settingsPanel.minutesLeft')}`;
    }
    return t('settingsPanel.lessMinuteLeft');
  };

  return (
    <div className="space-y-6 stagger-children">
      {/* Header */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white text-2xl">{t('settingsPanel.title')}</CardTitle>
          <CardDescription className="text-white/70">{t('settingsPanel.subtitle')}</CardDescription>
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
                <div className="text-white font-medium">{t('settingsPanel.timezoneLabel')}</div>
                <div className="text-white/60 text-sm">{t('settingsPanel.timezoneDesc')}</div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                <div className="text-white text-sm font-medium">
                  {preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                </div>
                <div className="text-white/50 text-xs mt-1">{t('settingsPanel.autoDetected')}</div>
              </div>

              <div className="space-y-3">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="text-blue-300 text-sm">
                    <span className="text-lg mr-2">⏱️</span>
                    <span className="font-medium">{t('settingsPanel.nextReset')} </span>
                    <span className="text-blue-200 font-mono">{getRealtimeCountdown()}</span>
                  </div>
                </div>

                {!stats.actualResetInfo?.nextResetTime && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="text-yellow-300 text-sm">
                      <span className="text-lg mr-2">⚠️</span>
                      {t('settingsPanel.estimatingResetTime')}{' '}
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
                        : t('settingsPanel.notAvailable')}
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
                <div className="text-white font-medium">{t('settingsPanel.planLabel')}</div>
                <div className="text-white/60 text-sm">{t('settingsPanel.planDesc')}</div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div>
                <div className="text-white/70 text-sm mb-2">{t('settingsPanel.planSelection')}</div>
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
                    <SelectItem value="auto">{t('settingsPanel.autoDetect')}</SelectItem>
                    <SelectItem value="Pro">{t('settingsPanel.planPro')}</SelectItem>
                    <SelectItem value="Max5">{t('settingsPanel.planMax5')}</SelectItem>
                    <SelectItem value="Max20">{t('settingsPanel.planMax20')}</SelectItem>
                    <SelectItem value="Custom">{t('settingsPanel.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preferences.plan === 'Custom' && (
                <div>
                  <div className="text-white/70 text-sm mb-2">
                    {t('settingsPanel.customTokenLimit')}
                  </div>
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
                    placeholder={t('settingsPanel.enterCustomLimit')}
                  />
                  <div className="text-white/50 text-xs mt-1">
                    {t('settingsPanel.tokensPerDay')}
                  </div>
                </div>
              )}

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="text-green-300 text-sm">
                  <span className="text-lg mr-2">ℹ️</span>
                  {t('settingsPanel.currentDetectedPlan')}:{' '}
                  <span className="font-medium">{stats.currentPlan}</span>
                  {stats.tokenLimit && (
                    <span className="ml-2">
                      ({stats.tokenLimit.toLocaleString()} {t('settingsPanel.tokensPerDay')})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Language Selection - 语言选择器 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="text-white font-medium">{t('settingsPanel.languageLabel')}</div>
                <div className="text-white/60 text-sm">{t('settingsPanel.languageDesc')}</div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div>
                <div className="text-white/70 text-sm mb-2">
                  {t('settingsPanel.languageSelection')}
                </div>
                <Select
                  value={preferences.language || i18n.language || 'en'}
                  onValueChange={(value: 'en' | 'zh') => {
                    handlePreferenceChange('language', value);
                    i18n.changeLanguage(value);
                  }}
                >
                  <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder={t('settingsPanel.languageSelection')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('settingsPanel.english')}</SelectItem>
                    <SelectItem value="zh">{t('settingsPanel.chineseSimplified')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Menu Bar Display Mode */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-white font-medium">{t('settingsPanel.menuBarDisplay')}</div>
                <div className="text-white/60 text-sm">{t('settingsPanel.menuBarDisplayDesc')}</div>
              </div>
            </div>

            <div className="ml-11 space-y-3">
              <div>
                <div className="text-white/70 text-sm mb-2">{t('settingsPanel.displayMode')}</div>
                <Select
                  value={preferences.menuBarDisplayMode || 'alternate'}
                  onValueChange={(value: 'percentage' | 'cost' | 'alternate') =>
                    handlePreferenceChange('menuBarDisplayMode', value)
                  }
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <SelectValue placeholder={t('settingsPanel.displayMode')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('settingsPanel.percentageOnly')}</SelectItem>
                    <SelectItem value="cost">{t('settingsPanel.costOnly')}</SelectItem>
                    <SelectItem value="alternate">{t('settingsPanel.alternate')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-blue-300 text-sm">
                  <span className="text-lg mr-2">💡</span>
                  {preferences.menuBarDisplayMode === 'percentage' && (
                    <span>{t('settingsPanel.menuBarWillShowPercentage')}</span>
                  )}
                  {preferences.menuBarDisplayMode === 'cost' && (
                    <span>{t('settingsPanel.menuBarWillShowCost')}</span>
                  )}
                  {(!preferences.menuBarDisplayMode ||
                    preferences.menuBarDisplayMode === 'alternate') && (
                    <span>{t('settingsPanel.menuBarWillAlternate')}</span>
                  )}
                </div>
              </div>

              {/* Cost Display Mode */}
              {preferences.menuBarDisplayMode !== 'percentage' && (
                <div>
                  <div className="text-white/70 text-sm mb-2">{t('settingsPanel.costDisplayMode')}</div>
                  <Select
                    value={preferences.menuBarCostDisplayMode || 'today'}
                    onValueChange={(value: 'today' | 'sessionWindow' | 'alternate') =>
                      handlePreferenceChange('menuBarCostDisplayMode', value)
                    }
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                      <SelectValue placeholder={t('settingsPanel.costDisplayMode')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">{t('settingsPanel.modeToday')}</SelectItem>
                      <SelectItem value="sessionWindow">{t('settingsPanel.modeSessionWindow')}</SelectItem>
                      <SelectItem value="alternate">{t('settingsPanel.modeAlternate')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-white/50 text-xs mt-2">
                    {preferences.menuBarCostDisplayMode === 'today' && (
                      <span>{t('dashboard.costToday')} - {t('settingsPanel.costDisplayModeDesc')}</span>
                    )}
                    {preferences.menuBarCostDisplayMode === 'sessionWindow' && (
                      <span>{t('settingsPanel.sessionWindow')} - {t('settingsPanel.costBasisDesc')}</span>
                    )}
                    {(!preferences.menuBarCostDisplayMode ||
                      preferences.menuBarCostDisplayMode === 'alternate') && (
                      <span>{t('settingsPanel.costDisplayModeInfo')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
