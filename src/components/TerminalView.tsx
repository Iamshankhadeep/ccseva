import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UsageStats } from '../types/usage';
import { Button } from './ui/button';

interface TerminalViewProps {
  stats: UsageStats;
  onRefresh: () => void;
  preferences: {
    timezone?: string;
    resetHour?: number;
    plan?: 'auto' | 'Pro' | 'Max5' | 'Max20' | 'Custom';
    customTokenLimit?: number;
  };
}

export const TerminalView: React.FC<TerminalViewProps> = ({ stats, onRefresh, preferences }) => {
  const { t } = useTranslation();
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedTimeProgress, setAnimatedTimeProgress] = useState(0);

  // Animate progress bars
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(stats.percentageUsed);
      setAnimatedTimeProgress(getTimeProgress());
    }, 100);
    return () => clearTimeout(timer);
  }, [stats]);

  const getTimeProgress = (): number => {
    if (!stats.resetInfo?.timeUntilReset) return 0;
    const totalCycleDuration = 24 * 60 * 60 * 1000;
    const timeElapsed = totalCycleDuration - stats.resetInfo.timeUntilReset;
    return Math.max(0, Math.min(100, (timeElapsed / totalCycleDuration) * 100));
  };

  const formatTimeUntilReset = (): string => {
    if (!stats.resetInfo?.timeUntilReset) return t('terminal.noResetInfo');
    const milliseconds = stats.resetInfo.timeUntilReset;
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusEmoji = () => {
    if (stats.percentageUsed >= 90) return '🔴';
    if (stats.percentageUsed >= 70) return '🟡';
    return '🟢';
  };

  const getBurnRateEmoji = () => {
    if (stats.burnRate > 1000) return '🔥';
    if (stats.burnRate > 500) return '⚡';
    return '💤';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatPlanDisplay = (): { plan: string; label: string } => {
    const selectedPlan = preferences.plan || 'auto';

    if (selectedPlan === 'auto') {
      return {
        plan: `${t('terminal.autoDetect')} (${stats.currentPlan})`,
        label: t('terminal.detected'),
      };
    }

    if (selectedPlan === 'Custom') {
      const tokenLimit = preferences.customTokenLimit || stats.tokenLimit;
      return {
        plan: `${t('terminal.custom')} (${formatNumber(tokenLimit)})`,
        label: t('terminal.selected'),
      };
    }

    // For Pro, Max5, Max20
    const tokenLimits = {
      Pro: '7K',
      Max5: '35K',
      Max20: '140K',
    };

    const planLabels = {
      Pro: t('terminal.claudePro7K'),
      Max5: t('terminal.claudeMax35K'),
      Max20: t('terminal.claudeMax140K'),
    };

    return {
      plan:
        planLabels[selectedPlan as keyof typeof planLabels] ||
        `Claude ${selectedPlan} (${tokenLimits[selectedPlan as keyof typeof tokenLimits]})`,
      label: t('terminal.selected'),
    };
  };

  const generateProgressBar = (percentage: number, width = 20): string => {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  };

  const generateTimeProgressBar = (percentage: number, width = 20): string => {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '▓'.repeat(filled) + '▒'.repeat(empty);
  };

  return (
    <div className="font-mono text-sm bg-black/90 rounded-lg border border-green-500/30 p-6 space-y-4">
      {/* Header */}
      <div className="border-b border-green-500/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="text-green-400">
            <span className="text-green-500">┌─</span> {t('terminal.header')}{' '}
            <span className="text-green-500">─┐</span>
          </div>
          <div className="text-green-300 text-xs">{new Date().toLocaleTimeString()}</div>
        </div>
        <div className="text-green-500 text-xs mt-1">└─ {t('terminal.realtimeInterface')} ─┘</div>
      </div>
      {/* Token Usage Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-green-400">{t('terminal.tokenUsage')}</span>
          <span className="text-white font-bold">{animatedPercentage.toFixed(1)}%</span>
          <span className="text-2xl">{getStatusEmoji()}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-green-500">[</span>
          <span className="text-yellow-400 transition-all duration-1000">
            {generateProgressBar(animatedPercentage)}
          </span>
          <span className="text-green-500">]</span>
          <span className="text-gray-400 text-xs">
            {formatNumber(stats.tokensUsed)}/{formatNumber(stats.tokenLimit)}
          </span>
        </div>
      </div>

      {/* TODO: Time Progress Section */}
      {/* <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-blue-400">TIME PROGRESS:</span>
          <span className="text-white font-bold">{getTimeProgress().toFixed(1)}%</span>
          <span className="text-2xl">⏰</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-blue-500">[</span>
          <span className="text-cyan-400 transition-all duration-1000">
            {generateTimeProgressBar(animatedTimeProgress)}
          </span>
          <span className="text-blue-500">]</span>
          <span className="text-gray-400 text-xs">{formatTimeUntilReset()} until reset</span>
        </div>
      </div> */}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-500/20">
        <div className="space-y-1">
          <div className="text-orange-400 text-xs">{t('terminal.burnRate')}</div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{formatNumber(stats.burnRate)}</span>
            <span className="text-gray-400 text-xs">{t('terminal.tokensHr')}</span>
            <span className="text-lg">{getBurnRateEmoji()}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-purple-400 text-xs">{t('terminal.plan')}</div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{formatPlanDisplay().plan}</span>
            <span className="text-gray-400 text-xs">{formatPlanDisplay().label}</span>
            <span className="text-lg">📊</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-red-400 text-xs">{t('terminal.costToday')}</div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">${stats.today.totalCost.toFixed(3)}</span>
            <span className="text-gray-400 text-xs">{t('terminal.usd')}</span>
            <span className="text-lg">💰</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-yellow-400 text-xs">{t('terminal.remaining')}</div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{formatNumber(stats.tokensRemaining)}</span>
            <span className="text-gray-400 text-xs">{t('terminal.tokens')}</span>
            <span className="text-lg">📈</span>
          </div>
        </div>
      </div>
      {/* Session Information */}
      {stats.sessionTracking && (
        <div className="pt-2 border-t border-green-500/20">
          <div className="text-cyan-400 text-xs mb-2">{t('terminal.sessionWindow')}</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-gray-400 text-xs">{t('terminal.activeSessions')}</div>
              <div className="text-white">
                {stats.sessionTracking.sessionsInWindow} {t('terminal.sessions')}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-gray-400 text-xs">{t('terminal.windowTokens')}</div>
              <div className="text-white">
                {formatNumber(stats.sessionTracking.activeWindow.totalTokens)}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Velocity Information */}
      {stats.velocity && (
        <div className="pt-2 border-t border-green-500/20">
          <div className="text-pink-400 text-xs mb-2">{t('terminal.velocityAnalysis')}</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">{t('terminal.trend')}</span>
              <span className="text-white">
                {stats.velocity.trend === 'increasing'
                  ? '📈'
                  : stats.velocity.trend === 'decreasing'
                    ? '📉'
                    : '➡️'}
                {stats.velocity.trend}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">{t('terminal.change')}</span>
              <span
                className={`text-sm ${
                  stats.velocity.trendPercent > 0
                    ? 'text-red-400'
                    : stats.velocity.trendPercent < 0
                      ? 'text-green-400'
                      : 'text-gray-400'
                }`}
              >
                {stats.velocity.trendPercent > 0 ? '+' : ''}
                {stats.velocity.trendPercent}%
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Command Line Interface */}
      <div className="pt-4 border-t border-green-500/30">
        <div className="flex items-center gap-2">
          <span className="text-green-400">{t('terminal.terminalPrompt')}</span>
          <span className="text-gray-400">$</span>
          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-yellow-400 hover:text-yellow-300 hover:bg-transparent transition-colors"
          >
            {t('terminal.refreshCommand')}
          </Button>
          <span className="text-gray-600">|</span>
          <span className="text-blue-400">{t('terminal.statusCommand')}</span>
          <span className="text-gray-600">|</span>
          <span className="text-purple-400">{t('terminal.analyticsCommand')}</span>
          <span className="animate-pulse text-green-400 ml-2">█</span>
        </div>
      </div>
      {/* System Status */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        <div className="flex justify-between">
          <span>
            {t('terminal.systemStatus')}{' '}
            {stats.percentageUsed >= 90
              ? t('terminal.critical')
              : stats.percentageUsed >= 70
                ? t('terminal.warning')
                : t('terminal.normal')}
          </span>
          <span>
            {t('terminal.uptime')} {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};
