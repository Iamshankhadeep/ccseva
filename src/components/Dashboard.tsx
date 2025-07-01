import type React from 'react';
import type { UsageStats } from '../types/usage';
import { PLAN_DEFINITIONS } from '../constants/plans';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Helper component for model usage item
const ModelUsageItem = ({
  modelName,
  modelData,
  totalTokens,
  index,
}: {
  modelName: string;
  modelData: { tokens: number; cost: number };
  totalTokens: number;
  index: number;
}) => {
  const percentage = totalTokens > 0 ? (modelData.tokens / totalTokens) * 100 : 0;
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getModelColor = (index: number) => {
    return index === 0 ? 'bg-purple-500' : index === 1 ? 'bg-blue-500' : 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${getModelColor(index)}`} />
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm font-medium text-white cursor-help">{modelName}</span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-semibold">{modelName}</p>
                <p className="text-sm mt-1">
                  {formatNumber(modelData.tokens)} tokens • {formatCurrency(modelData.cost)}
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {percentage.toFixed(1)}% of today's usage
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
          <span className="text-sm text-neutral-400">
            {formatNumber(modelData.tokens)} ({percentage.toFixed(1)}%)
          </span>
        </div>
        <Progress value={percentage} className="w-full h-1.5" />
      </div>
    </div>
  );
};

// Helper for formatting numbers and currency
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper for getting status-related values
const getStatusHelpers = (status: 'safe' | 'warning' | 'critical') => {
  const getStatusColor = () => {
    switch (status) {
      case 'critical':
        return 'from-red-600 to-red-700';
      case 'warning':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-green-600 to-emerald-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      default:
        return '🟢';
    }
  };

  return { getStatusColor, getStatusIcon };
};

// Component for key metrics row
const KeyMetricsRow: React.FC<{
  stats: UsageStats;
  timeRemaining: string;
}> = ({ stats, timeRemaining }) => (
  <div className="space-y-6">
    {/* 5-Hour Rolling Window Stats */}
    {stats.rollingWindow && (
      <Card className="bg-neutral-800/50 border-neutral-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <h4 className="text-sm font-semibold text-white">5-Hour Rolling Window</h4>
            </div>
            <Badge variant={stats.rollingWindow.percentageOfLimit > 90 ? 'destructive' : 
                           stats.rollingWindow.percentageOfLimit > 70 ? 'secondary' : 
                           'default'}>
              {Math.round(stats.rollingWindow.percentageOfLimit)}% used
            </Badge>
          </div>
          
          <Progress 
            value={stats.rollingWindow.windowProgress} 
            className="mb-3 h-2"
          />
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-neutral-400">Messages</div>
              <div className="text-white font-medium">
                {stats.rollingWindow.messagesInWindow} / {PLAN_DEFINITIONS[stats.currentPlan]?.messagesPerWindow || 'Custom'}
              </div>
            </div>
            <div>
              <div className="text-neutral-400">Tokens</div>
              <div className="text-white font-medium">
                {formatNumber(stats.rollingWindow.tokensInWindow)}
              </div>
            </div>
            <div>
              <div className="text-neutral-400">Time Left</div>
              <div className="text-white font-medium">
                {Math.floor(stats.rollingWindow.timeRemaining / (60 * 60 * 1000))}h {Math.floor((stats.rollingWindow.timeRemaining % (60 * 60 * 1000)) / (60 * 1000))}m
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
    
    {/* Original metrics */}
    <div className="grid grid-cols-3 gap-4 text-center">
      <div className="space-y-2">
        <div className="text-2xl font-bold text-neutral-100 font-primary">
          {formatNumber(stats.tokensUsed)}
        </div>
        <div className="text-sm text-neutral-400 font-primary">Tokens Used</div>
        <div className="text-xs text-neutral-500 font-primary">
          of {formatNumber(stats.tokenLimit)}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-2xl font-bold text-neutral-100 font-primary">
          {formatCurrency(stats.today.totalCost)}
        </div>
        <div className="text-sm text-neutral-warm-400 font-primary">Cost Today</div>
        <div className="text-xs text-neutral-500 font-primary">
          {stats.today.totalTokens.toLocaleString()} tokens
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-2xl font-bold text-neutral-100 font-primary">
          {formatNumber(stats.tokensRemaining)}
        </div>
        <div className="text-sm text-neutral-warm-400 font-primary">Remaining</div>
        <div className="text-xs text-neutral-500 font-primary">{timeRemaining}</div>
      </div>
    </div>
  </div>
);

// Component for circular progress charts
const CircularProgressChart: React.FC<{
  percentage: number;
  status?: 'safe' | 'warning' | 'critical';
  label: string;
  subtitle: string;
  emoji: string;
  isTime?: boolean;
}> = ({ percentage, status, label, subtitle, emoji, isTime }) => (
  <div className="flex items-center justify-center">
    <div className="relative">
      <svg width="180" height="180" className="transform -rotate-90">
        <circle
          cx="90"
          cy="90"
          r="75"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
        />
        <circle
          cx="90"
          cy="90"
          r="75"
          fill="none"
          stroke={isTime ? 'url(#gradient-time)' : `url(#gradient-token-${status})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 75}`}
          strokeDashoffset={`${2 * Math.PI * 75 * (1 - percentage / 100)}`}
          className="transition-all duration-1000 ease-out"
        />
        {!isTime && status && (
          <defs>
            <linearGradient id={`gradient-token-${status}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                stopColor={
                  status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981'
                }
              />
              <stop
                offset="100%"
                stopColor={
                  status === 'critical' ? '#dc2626' : status === 'warning' ? '#d97706' : '#059669'
                }
              />
            </linearGradient>
          </defs>
        )}
        {isTime && (
          <defs>
            <linearGradient id="gradient-time" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(204, 120, 92, 1)" />
              <stop offset="100%" stopColor="rgba(255, 107, 53, 1)" />
            </linearGradient>
          </defs>
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-neutral-100 mb-1 font-primary">
            {Math.round(percentage)}%
          </div>
          <div className="text-sm text-neutral-400 uppercase tracking-wide font-primary">
            {label}
          </div>
          <div className="text-xs text-neutral-500 mt-1 font-primary">
            {emoji} {subtitle}
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface DashboardProps {
  stats: UsageStats;
  status: 'safe' | 'warning' | 'critical';
  timeRemaining: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, status, timeRemaining }) => {
  const { getStatusColor, getStatusIcon } = getStatusHelpers(status);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Hero Section */}
        <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gradient mb-2 font-primary">Usage Dashboard</h2>
              <p className="text-neutral-400 text-sm font-primary">
                Real-time monitoring of your Claude API usage
              </p>
            </div>

            {/* Dual Progress Display - Token and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CircularProgressChart
                      percentage={stats.percentageUsed}
                      status={status}
                      label="Tokens"
                      subtitle={status}
                      emoji={getStatusIcon()}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-semibold">
                      {status === 'critical'
                        ? '🔴 Critical Usage'
                        : status === 'warning'
                          ? '🟡 Warning Level'
                          : '🟢 Safe Usage'}
                    </p>
                    <p className="text-sm mt-1">
                      {status === 'critical'
                        ? 'Over 90% of daily limit used'
                        : status === 'warning'
                          ? '70-90% of daily limit used'
                          : 'Less than 70% of daily limit used'}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>

            <KeyMetricsRow stats={stats} timeRemaining={timeRemaining} />
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Current Plan */}
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-r ${getStatusColor()} flex items-center justify-center shadow-lg`}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="text-lg font-bold text-neutral-100 font-primary cursor-help">
                        {stats.currentPlan}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Your detected Claude plan based on daily token limit:{' '}
                        {formatNumber(stats.tokenLimit)} tokens/day
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-sm text-neutral-400 font-primary">Current Plan</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 font-primary">Daily Limit</span>
                  <span className="text-neutral-100 font-medium font-primary">
                    {formatNumber(stats.tokenLimit)}
                  </span>
                </div>
                <Progress value={Math.min(stats.percentageUsed, 100)} className="w-full h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Burn Rate */}
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                    />
                  </svg>
                </div>
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="text-lg font-bold text-neutral-100 font-primary cursor-help">
                        {formatNumber(stats.burnRate)}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Rate of token consumption per hour based on your last 24 hours of usage</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-neutral-400 font-primary cursor-help">
                        Tokens/Hour
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Current burn rate - how fast you're consuming your daily token allowance
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-neutral-400 font-primary cursor-help">
                        Depletion Time
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Estimated time until your daily token limit is reached at current usage rate
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-neutral-100 font-medium font-primary">{timeRemaining}</span>
                </div>
                <Badge
                  variant={
                    stats.burnRate > 1000
                      ? 'destructive'
                      : stats.burnRate > 500
                        ? 'secondary'
                        : 'default'
                  }
                  className="w-full justify-center"
                >
                  {stats.burnRate > 1000
                    ? 'High Usage'
                    : stats.burnRate > 500
                      ? 'Moderate Usage'
                      : 'Normal Usage'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Today's Usage */}
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Today</h3>
                  <p className="text-sm text-neutral-400">Usage Summary</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Tokens</span>
                  <span className="text-white font-medium">
                    {stats.today.totalTokens.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Cost</span>
                  <span className="text-white font-medium">
                    {formatCurrency(stats.today.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Models</span>
                  <span className="text-white font-medium">
                    {Object.keys(stats.today.models).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">This Week</h3>
                  <p className="text-sm text-neutral-400">7-Day Summary</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Cost</span>
                  <span className="text-white font-medium">
                    {formatCurrency(stats.thisWeek.reduce((sum, day) => sum + day.totalCost, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Tokens</span>
                  <span className="text-white font-medium">
                    {stats.thisWeek.reduce((sum, day) => sum + day.totalTokens, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Avg Daily</span>
                  <span className="text-white font-medium">
                    {formatCurrency(
                      stats.thisWeek.reduce((sum, day) => sum + day.totalCost, 0) / 7
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Breakdown */}
        <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Model Usage</CardTitle>
                <CardDescription>Today's distribution by model</CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-neutral-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-neutral-800 border-neutral-700 text-white">
                  <div className="space-y-3">
                    <div className="font-semibold">Model Usage Breakdown</div>
                    <div className="text-sm text-neutral-300 space-y-2">
                      <p>
                        • <strong>Tokens:</strong> Number of tokens consumed by each model today
                      </p>
                      <p>
                        • <strong>Cost:</strong> Estimated cost based on model pricing
                      </p>
                      <p>
                        • <strong>Percentage:</strong> Share of your total daily usage
                      </p>
                      <p>
                        • <strong>Colors:</strong> Purple (primary), Blue (secondary), Green
                        (tertiary)
                      </p>
                    </div>
                    <div className="text-xs text-neutral-400 border-t border-neutral-700 pt-2">
                      Click on any model name for detailed tooltip information
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.today.models && Object.keys(stats.today.models).length > 0 ? (
                Object.entries(stats.today.models).map(([modelName, modelData], index) => (
                  <ModelUsageItem
                    key={modelName}
                    modelName={modelName}
                    modelData={modelData}
                    totalTokens={stats.today.totalTokens}
                    index={index}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm">No model usage data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {/* <div className="glass-card p-4">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-ghost flex items-center justify-center gap-2 py-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Analytics
          </button>
          
          <button className="btn btn-ghost flex items-center justify-center gap-2 py-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Data
          </button>
        </div>
      </div> */}
      </div>
    </TooltipProvider>
  );
};
