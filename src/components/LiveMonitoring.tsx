import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UsageStats } from '../types/usage';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// Helper functions
const getUsageStatus = (percentage: number): 'safe' | 'warning' | 'critical' => {
  if (percentage >= 90) return 'critical';
  if (percentage >= 70) return 'warning';
  return 'safe';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'critical':
      return 'from-red-500 to-red-600';
    case 'warning':
      return 'from-yellow-500 to-orange-500';
    default:
      return 'from-green-500 to-emerald-500';
  }
};

const getStatusEmoji = (status: string) => {
  switch (status) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    default:
      return '🟢';
  }
};

const formatTimeRemaining = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Component to render log entries
const LogEntryComponent: React.FC<{ log: LogEntry }> = ({ log }) => (
  <div
    className={`flex items-start gap-2 ${
      log.type === 'error'
        ? 'text-red-400'
        : log.type === 'warning'
          ? 'text-yellow-400'
          : log.type === 'success'
            ? 'text-green-400'
            : 'text-neutral-300'
    }`}
  >
    <span className="text-neutral-500 text-xs w-16 flex-shrink-0">
      {log.timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
    <span className="text-sm">{log.emoji}</span>
    <span className="flex-1">{log.message}</span>
  </div>
);

// Component for status overview cards
const StatusCard: React.FC<{
  title: string;
  emoji: string;
  value: string;
  progress: number;
  colorClass: string;
  subtitle: string;
}> = ({ title, emoji, value, progress, colorClass, subtitle }) => (
  <Card className="bg-neutral-800/50 border-neutral-700">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{title}</span>
        <span className="text-lg">{emoji}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-2">{value}</div>
      <div className="w-full bg-neutral-800 rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full bg-gradient-to-r ${colorClass} transition-all duration-1000`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-neutral-400">{subtitle}</div>
    </CardContent>
  </Card>
);

interface LiveMonitoringProps {
  stats: UsageStats;
  onRefresh: () => void;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  emoji: string;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ stats, onRefresh }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const logContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Helper function to get burn rate label
  const getBurnRateLabel = (burnRate: number): string => {
    if (burnRate > 1000) return t('liveMonitoring.highBurnRate');
    if (burnRate > 500) return t('liveMonitoring.moderateBurnRate');
    return t('liveMonitoring.normalBurnRate');
  };

  const addLogEntry = useCallback((type: LogEntry['type'], message: string, emoji: string) => {
    const newEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
      timestamp: new Date(),
      type,
      message,
      emoji,
    };

    setLogs((prev) => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, 50);
    });
  }, []);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current && isLiveMode) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [isLiveMode]);

  // Real-time updates every 3 seconds (like Python script)
  useEffect(() => {
    if (!isLiveMode) return;

    intervalRef.current = setInterval(() => {
      onRefresh();
      setLastUpdate(new Date());
      addLogEntry('info', t('liveMonitoring.dataRefreshed'), '🔄');
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLiveMode, onRefresh, addLogEntry, t]);

  // Add status-based log entries
  useEffect(() => {
    const timeUntilReset = stats.resetInfo?.timeUntilReset;

    if (stats.percentageUsed >= 95) {
      addLogEntry(
        'error',
        `${t('liveMonitoring.criticalUsage')}: ${stats.percentageUsed.toFixed(1)}% ${t('liveMonitoring.usageDetected')}`,
        '🚨'
      );
    } else if (stats.percentageUsed >= 80) {
      addLogEntry(
        'warning',
        `${t('liveMonitoring.highUsage')}: ${stats.percentageUsed.toFixed(1)}%`,
        '⚠️'
      );
    }

    if (timeUntilReset && timeUntilReset < 3600000) {
      addLogEntry(
        'info',
        `${t('liveMonitoring.resetIn')} ${formatTimeRemaining(timeUntilReset)}`,
        '⏰'
      );
    }
  }, [stats.percentageUsed, stats.resetInfo?.timeUntilReset, addLogEntry, t]);

  const currentStatus = getUsageStatus(stats.percentageUsed);
  const tokensPercentage = Math.min(stats.percentageUsed, 100);

  // Calculate time progress (assuming reset info exists)
  const getTimeProgress = (): number => {
    if (!stats.resetInfo) return 0;

    const totalCycleDuration = 24 * 60 * 60 * 1000;
    const timeElapsed = totalCycleDuration - stats.resetInfo.timeUntilReset;

    return Math.max(0, Math.min(100, (timeElapsed / totalCycleDuration) * 100));
  };

  const timeProgress = getTimeProgress();

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gradient mb-1">
                {t('liveMonitoring.liveMonitoringTitle')}
              </h2>
              <p className="text-sm text-neutral-400">{t('liveMonitoring.realtimeTracking')}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="glass px-3 py-1 rounded-lg">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
                  />
                  <span className="text-xs text-neutral-300">
                    {isLiveMode ? t('liveMonitoring.live') : t('liveMonitoring.paused')}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setIsLiveMode(!isLiveMode)}
                variant={isLiveMode ? 'secondary' : 'default'}
                size="sm"
                className={`text-sm px-3 py-1 transition-all duration-200 ${
                  isLiveMode
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                {isLiveMode ? t('liveMonitoring.pause') : t('liveMonitoring.resume')}
              </Button>
            </div>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 gap-4">
            <StatusCard
              title={t('liveMonitoring.tokenUsage')}
              emoji={getStatusEmoji(currentStatus)}
              value={`${tokensPercentage.toFixed(1)}%`}
              progress={tokensPercentage}
              colorClass={getStatusColor(currentStatus)}
              subtitle={`${formatNumber(stats.tokensUsed)} / ${formatNumber(stats.tokenLimit)}`}
            />

            <StatusCard
              title={t('liveMonitoring.timeProgress')}
              emoji="⏰"
              value={`${timeProgress.toFixed(1)}%`}
              progress={timeProgress}
              colorClass="from-blue-500 to-purple-500"
              subtitle={`${stats.resetInfo ? formatTimeRemaining(stats.resetInfo.timeUntilReset) : t('liveMonitoring.noActivity')} ${t('liveMonitoring.untilReset')}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terminal-style Output */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">{t('liveMonitoring.liveFeed')}</h3>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
            </div>

            <div className="text-xs text-neutral-400">
              {t('liveMonitoring.lastUpdate')}: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>

          {/* Terminal Window */}
          <div className="bg-black/50 rounded-lg border border-white/10 p-4 font-mono text-sm">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
              <span className="text-green-400">●</span>
              <span className="text-white">{t('liveMonitoring.terminalPrompt')}</span>
              <span className="text-neutral-400">~</span>
            </div>

            <div
              ref={logContainerRef}
              className="h-60 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
            >
              {logs.length === 0 ? (
                <div className="text-neutral-400">
                  <span className="text-green-400">$</span> {t('liveMonitoring.waitingForEvents')}
                </div>
              ) : (
                logs.map((log) => <LogEntryComponent key={log.id} log={log} />)
              )}
            </div>

            {/* Command Line */}
            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-neutral-400">
                <span className="text-green-400">$</span>
                <span className="animate-pulse">█</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Session Info */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white">{t('liveMonitoring.currentSession')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {formatNumber(stats.burnRate)}
              </div>
              <div className="text-sm text-neutral-400">{t('liveMonitoring.tokensPerHour')}</div>
              <div className="text-xs text-neutral-500 mt-1">
                🔥 {getBurnRateLabel(stats.burnRate)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{stats.currentPlan}</div>
              <div className="text-sm text-neutral-400">{t('liveMonitoring.currentPlan')}</div>
              <div className="text-xs text-neutral-500 mt-1">
                📊 {t('liveMonitoring.autoDetected')}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {stats.velocity?.trend === 'increasing'
                  ? '📈'
                  : stats.velocity?.trend === 'decreasing'
                    ? '📉'
                    : '➡️'}
              </div>
              <div className="text-sm text-neutral-400">{t('liveMonitoring.trend')}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {stats.velocity?.trend || 'stable'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {stats.prediction?.confidence || 0}%
              </div>
              <div className="text-sm text-neutral-400">{t('liveMonitoring.confidence')}</div>
              <div className="text-xs text-neutral-500 mt-1">
                🎯 {t('liveMonitoring.prediction')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={onRefresh}
              variant="ghost"
              className="flex items-center justify-center gap-2 py-3 h-auto hover:bg-white/10 transition-all duration-200"
            >
              <span>🔄</span>
              {t('liveMonitoring.forceRefresh')}
            </Button>

            <Button
              onClick={() => addLogEntry('info', t('liveMonitoring.manualCheckpoint'), '📍')}
              variant="ghost"
              className="flex items-center justify-center gap-2 py-3 h-auto hover:bg-white/10 transition-all duration-200"
            >
              <span>📍</span>
              {t('liveMonitoring.checkpoint')}
            </Button>

            <Button
              onClick={() => setLogs([])}
              variant="ghost"
              className="flex items-center justify-center gap-2 py-3 h-auto hover:bg-white/10 transition-all duration-200"
            >
              <span>🗑️</span>
              {t('liveMonitoring.clearLogs')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
