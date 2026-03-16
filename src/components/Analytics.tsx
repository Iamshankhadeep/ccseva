import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UsageStats } from '../types/usage';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface AnalyticsProps {
  stats: UsageStats;
  preferences: Record<string, unknown>;
}

type ChartTimeRange = '7d' | '30d';
type ChartType = 'area' | 'line' | 'bar';

// Helper functions extracted to reduce complexity
const formatNumber = (num: number) => {
  if (!num || Number.isNaN(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatCurrency = (amount: number) => {
  if (!amount || Number.isNaN(amount)) return '$0.000';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(amount);
};

const getDepletionText = (stats: UsageStats, t: any) => {
  if (!stats.predictedDepleted || stats.burnRate <= 0) return t('analytics.noDepletion');

  try {
    const depletionDate = new Date(stats.predictedDepleted);
    if (Number.isNaN(depletionDate.getTime())) return t('analytics.noDepletion');

    const now = new Date();
    const diffTime = depletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return t('analytics.alreadyDepleted');
    if (diffDays === 0) return t('analytics.today');
    if (diffDays === 1) return t('analytics.tomorrow');
    if (diffDays < 7) return `${diffDays} ${t('analytics.days')}`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} ${t('analytics.weeks')}`;
    return `${Math.ceil(diffDays / 30)} ${t('analytics.months')}`;
  } catch {
    return t('analytics.noDepletion');
  }
};

// Separate component for control tabs
const ControlTabs: React.FC<{
  timeRange: ChartTimeRange;
  setTimeRange: (range: ChartTimeRange) => void;
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
  selectedMetric: 'tokens' | 'cost';
  setSelectedMetric: (metric: 'tokens' | 'cost') => void;
}> = ({ timeRange, setTimeRange, chartType, setChartType, selectedMetric, setSelectedMetric }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3 mb-5">
      {/* Time Range */}
      <div className="flex bg-neutral-800/50 rounded-xl p-1 backdrop-blur-sm border border-white/10">
        {(['7d', '30d'] as ChartTimeRange[]).map((range) => (
          <Button
            key={range}
            onClick={() => setTimeRange(range)}
            variant="ghost"
            size="sm"
            className={`px-3 py-1.5 h-auto rounded-lg text-sm font-medium transition-all ${
              timeRange === range
                ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-600'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg
              className="w-4 h-4 inline mr-1.5"
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
            {range === '7d' ? t('analytics.sevenDays') : t('analytics.thirtyDays')}
          </Button>
        ))}
      </div>

      {/* Chart Type */}
      <div className="flex bg-neutral-800/50 rounded-xl p-1 backdrop-blur-sm border border-white/10">
        {(
          [
            {
              type: 'area',
              label: t('analytics.area'),
              icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9',
            },
            { type: 'line', label: t('analytics.line'), icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            {
              type: 'bar',
              label: t('analytics.bar'),
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10',
            },
          ] as { type: ChartType; label: string; icon: string }[]
        ).map(({ type, label, icon }) => (
          <Button
            key={type}
            onClick={() => setChartType(type)}
            variant="ghost"
            size="sm"
            className={`px-3 py-1.5 h-auto rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              chartType === type
                ? 'bg-purple-500 text-white shadow-lg hover:bg-purple-600'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            {label}
          </Button>
        ))}
      </div>

      {/* Metric Toggle */}
      <div className="flex bg-neutral-800/50 rounded-xl p-1 backdrop-blur-sm border border-white/10">
        {(
          [
            {
              metric: 'tokens',
              label: t('analytics.tokens'),
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              metric: 'cost',
              label: t('analytics.cost'),
              icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
            },
          ] as { metric: 'tokens' | 'cost'; label: string; icon: string }[]
        ).map(({ metric, label, icon }) => (
          <Button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            variant="ghost"
            size="sm"
            className={`px-3 py-1.5 h-auto rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              selectedMetric === metric
                ? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// Summary stats component
const SummaryStats: React.FC<{
  totalWeekTokens: number;
  totalWeekCost: number;
  avgDailyTokens: number;
  avgDailyCost: number;
}> = ({ totalWeekTokens, totalWeekCost, avgDailyTokens, avgDailyCost }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-4 gap-3">
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-white mb-1">{formatNumber(totalWeekTokens)}</div>
          <div className="text-xs text-neutral-400">{t('analytics.totalTokensWeek')}</div>
        </CardContent>
      </Card>
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(totalWeekCost)}</div>
          <div className="text-xs text-neutral-400">{t('analytics.totalCostWeek')}</div>
        </CardContent>
      </Card>
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-white mb-1">
            {formatNumber(Math.round(avgDailyTokens))}
          </div>
          <div className="text-xs text-neutral-400">{t('analytics.avgDailyTokens')}</div>
        </CardContent>
      </Card>
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-white mb-1">{formatCurrency(avgDailyCost)}</div>
          <div className="text-xs text-neutral-400">{t('analytics.avgDailyCost')}</div>
        </CardContent>
      </Card>
    </div>
  );
};

// Hook for chart data processing
const useChartData = (stats: UsageStats, timeRange: ChartTimeRange) => {
  return useMemo(() => {
    const rawData = timeRange === '7d' ? stats.thisWeek : stats.thisMonth;

    return rawData.map((day, index) => ({
      date: new Date(day.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      shortDate: new Date(day.date).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
      }),
      fullDate: day.date,
      totalTokens: day.totalTokens,
      totalCost: day.totalCost,
      dayIndex: index,
    }));
  }, [stats, timeRange]);
};

// Hook for model breakdown data
const useModelBreakdownData = (stats: UsageStats, t: any) => {
  return useMemo(() => {
    const today = stats.today;
    if (!today.models || Object.keys(today.models).length === 0) {
      return [];
    }

    return Object.entries(today.models).map(([model, data], index) => ({
      name: model
        .replace('claude-3-5-', '')
        .replace('claude-3-', '')
        .replace('sonnet-4-', 'Sonnet 4-')
        .replace('sonnet', 'Sonnet')
        .replace('opus', 'Opus')
        .replace('haiku', 'Haiku')
        .replace('20250514', '')
        .trim(),
      value: data.tokens,
      cost: data.cost,
      percentage: today.totalTokens > 0 ? (data.tokens / today.totalTokens) * 100 : 0,
      color: index === 0 ? '#8B5CF6' : index === 1 ? '#3B82F6' : '#10B981',
    }));
  }, [stats, t]);
};

// Chart path generation utility
const generateChartPath = (
  chartData: ReturnType<typeof useChartData>,
  chartType: ChartType,
  selectedMetric: 'tokens' | 'cost',
  maxValue: number,
  padding: number,
  plotWidth: number,
  plotHeight: number
) => {
  if (chartData.length === 0 || plotWidth <= 0 || plotHeight <= 0) return '';

  const points = chartData.map((d, i) => {
    const x = padding + (i / Math.max(chartData.length - 1, 1)) * plotWidth;
    const value = selectedMetric === 'tokens' ? d.totalTokens : d.totalCost;
    const normalizedValue = maxValue > 0 ? value / maxValue : 0;
    const y = padding + plotHeight - normalizedValue * plotHeight;
    return { x, y, value };
  });

  if (chartType === 'area') {
    const pathData = points
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return `${pathData} L ${points[points.length - 1]?.x || padding} ${padding + plotHeight} L ${padding} ${padding + plotHeight} Z`;
  }

  if (chartType === 'line') {
    return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  }

  return '';
};

// Custom hook for chart dimensions
const useChartDimensions = () => {
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 240 });
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const { clientWidth } = chartContainerRef.current;
        setChartDimensions({ width: clientWidth, height: 240 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return { chartDimensions, chartContainerRef };
};

// Main Chart Component
const MainChart: React.FC<{
  chartData: ReturnType<typeof useChartData>;
  chartType: ChartType;
  selectedMetric: 'tokens' | 'cost';
  timeRange: ChartTimeRange;
  chartDimensions: { width: number; height: number };
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ chartData, chartType, selectedMetric, timeRange, chartDimensions, chartContainerRef }) => {
  const { t } = useTranslation();
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    const values = chartData.map((d) =>
      selectedMetric === 'tokens' ? d.totalTokens : d.totalCost
    );
    const max = Math.max(...values);
    return max > 0 ? max : 1;
  }, [chartData, selectedMetric]);

  const chartWidth = chartDimensions.width;
  const chartHeight = chartDimensions.height;
  const padding = 40;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  const chartPath = generateChartPath(
    chartData,
    chartType,
    selectedMetric,
    maxValue,
    padding,
    plotWidth,
    plotHeight
  );

  return (
    <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {selectedMetric === 'tokens'
                ? t('analytics.tokenUsageTrends')
                : t('analytics.costTrends')}
            </h3>
            <p className="text-sm text-neutral-400">
              {timeRange === '7d' ? t('analytics.lastSevenDays') : t('analytics.lastThirtyDays')} •{' '}
              {chartType} {t('analytics.visualization')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="glass px-3 py-1 rounded-lg">
              <span className="text-xs text-neutral-300">
                {t('analytics.max')}{' '}
                {selectedMetric === 'tokens' ? formatNumber(maxValue) : formatCurrency(maxValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div ref={chartContainerRef} className="relative w-full" style={{ height: chartHeight }}>
          {chartWidth > 0 && (
            <svg
              width={chartWidth}
              height={chartHeight}
              className="absolute inset-0"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={selectedMetric === 'tokens' ? '#3B82F6' : '#10B981'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={selectedMetric === 'tokens' ? '#3B82F6' : '#10B981'}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={`grid-${ratio}`}
                  x1={padding}
                  y1={padding + plotHeight * ratio}
                  x2={chartWidth - padding}
                  y2={padding + plotHeight * ratio}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeDasharray="2,2"
                />
              ))}

              {/* Y-Axis Labels */}
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
                const value = maxValue * ratio;
                const y = padding + plotHeight * (1 - ratio);
                const displayValue =
                  selectedMetric === 'tokens' ? formatNumber(value) : formatCurrency(value);

                return (
                  <text
                    key={`y-label-${ratio}`}
                    x={padding - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-neutral-400 text-xs"
                  >
                    {displayValue}
                  </text>
                );
              })}

              {/* Chart Data */}
              {chartData.length > 0 && (
                <>
                  {chartType === 'area' && chartPath && (
                    <path
                      d={chartPath}
                      fill="url(#chartGradient)"
                      stroke={selectedMetric === 'tokens' ? '#3B82F6' : '#10B981'}
                      strokeWidth="2"
                    />
                  )}

                  {chartType === 'line' && chartPath && (
                    <path
                      d={chartPath}
                      fill="none"
                      stroke={selectedMetric === 'tokens' ? '#3B82F6' : '#10B981'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {chartType === 'bar' &&
                    chartData.map((d, i) => {
                      const barWidth = (plotWidth / chartData.length) * 0.7;
                      const x =
                        padding +
                        (i * plotWidth) / chartData.length +
                        (plotWidth / chartData.length - barWidth) / 2;
                      const value = selectedMetric === 'tokens' ? d.totalTokens : d.totalCost;
                      const normalizedValue = maxValue > 0 ? value / maxValue : 0;
                      const barHeight = normalizedValue * plotHeight;
                      const y = padding + plotHeight - barHeight;

                      return (
                        <rect
                          key={`bar-${d.fullDate}-${d.dayIndex}`}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill={selectedMetric === 'tokens' ? '#3B82F6' : '#10B981'}
                          rx="4"
                        />
                      );
                    })}

                  {/* Data Points */}
                  {chartType !== 'bar' &&
                    chartData.map((d, i) => {
                      const x = padding + (i / Math.max(chartData.length - 1, 1)) * plotWidth;
                      const value = selectedMetric === 'tokens' ? d.totalTokens : d.totalCost;
                      const normalizedValue = maxValue > 0 ? value / maxValue : 0;
                      const y = padding + plotHeight - normalizedValue * plotHeight;

                      return (
                        <circle
                          key={`point-${d.fullDate}-${d.dayIndex}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill={selectedMetric === 'tokens' ? '#3B82F6' : '#10B981'}
                          stroke="white"
                          strokeWidth="2"
                          className="hover:r-6 transition-all cursor-pointer"
                        />
                      );
                    })}
                </>
              )}

              {/* X-Axis Labels */}
              {chartData.map((d, i) => {
                const x =
                  chartType === 'bar'
                    ? padding +
                      (i * plotWidth) / chartData.length +
                      plotWidth / chartData.length / 2
                    : padding + (i / Math.max(chartData.length - 1, 1)) * plotWidth;
                const y = chartHeight - 10;

                return (
                  <text
                    key={`label-${d.fullDate}-${d.dayIndex}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="fill-neutral-400 text-xs"
                  >
                    {d.shortDate}
                  </text>
                );
              })}
            </svg>
          )}

          {/* Empty State */}
          {chartData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-neutral-400">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-sm">{t('analytics.noDataAvailable')}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const Analytics: React.FC<AnalyticsProps> = ({ stats }) => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<ChartTimeRange>('7d');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [selectedMetric, setSelectedMetric] = useState<'tokens' | 'cost'>('tokens');
  const { chartDimensions, chartContainerRef } = useChartDimensions();

  const chartData = useChartData(stats, timeRange);
  const modelBreakdownData = useModelBreakdownData(stats, t);

  const totalWeekTokens = stats.thisWeek.reduce((sum, day) => sum + day.totalTokens, 0);
  const totalWeekCost = stats.thisWeek.reduce((sum, day) => sum + day.totalCost, 0);
  const avgDailyTokens = totalWeekTokens / 7;
  const avgDailyCost = totalWeekCost / 7;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header Section */}
        <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-gradient mb-1">{t('analytics.header')}</h2>
                <p className="text-sm text-neutral-400">{t('analytics.description')}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="glass px-3 py-1 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-neutral-300">{t('analytics.liveData')}</span>
                  </div>
                </div>
              </div>
            </div>

            <ControlTabs
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              chartType={chartType}
              setChartType={setChartType}
              selectedMetric={selectedMetric}
              setSelectedMetric={setSelectedMetric}
            />

            <SummaryStats
              totalWeekTokens={totalWeekTokens}
              totalWeekCost={totalWeekCost}
              avgDailyTokens={avgDailyTokens}
              avgDailyCost={avgDailyCost}
            />
          </CardContent>
        </Card>

        <MainChart
          chartData={chartData}
          chartType={chartType}
          selectedMetric={selectedMetric}
          timeRange={timeRange}
          chartDimensions={chartDimensions}
          chartContainerRef={chartContainerRef}
        />

        {/* Bottom Section - Model Distribution & Performance */}
        <div className="grid grid-cols-1 gap-4">
          {/* Model Distribution */}
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">{t('analytics.modelDistribution')}</CardTitle>
                  <CardDescription>{t('analytics.todaysUsageByModel')}</CardDescription>
                </div>

                <div className="bg-neutral-800/50 px-3 py-1 rounded-lg border border-neutral-700">
                  <span className="text-xs text-neutral-300">
                    {modelBreakdownData.length} {t('analytics.models')}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {modelBreakdownData.length > 0 ? (
                <div className="flex items-center gap-8">
                  {/* Large Donut Chart */}
                  <div className="relative w-40 h-40 flex-shrink-0">
                    <svg width="160" height="160" className="transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="16"
                      />

                      {modelBreakdownData.map((model, index) => {
                        const circumference = 2 * Math.PI * 60;
                        const strokeDasharray = circumference;
                        const strokeDashoffset =
                          circumference - (model.percentage / 100) * circumference;
                        const rotation =
                          modelBreakdownData
                            .slice(0, index)
                            .reduce((sum, prev) => sum + prev.percentage, 0) * 3.6;

                        return (
                          <circle
                            key={model.name}
                            cx="80"
                            cy="80"
                            r="60"
                            fill="none"
                            stroke={model.color}
                            strokeWidth="16"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{
                              transformOrigin: '80px 80px',
                              transform: `rotate(${rotation}deg)`,
                            }}
                            className="transition-all duration-500"
                          />
                        );
                      })}
                    </svg>

                    {/* Center Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">
                          {formatNumber(stats.today.totalTokens)}
                        </div>
                        <div className="text-xs text-neutral-400">{t('analytics.tokens')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Model List */}
                  <div className="flex-1 space-y-3">
                    {modelBreakdownData.map((model) => (
                      <div
                        key={model.name}
                        className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-700"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: model.color }}
                          />
                          <div>
                            <div className="text-base font-bold text-white">{model.name}</div>
                            <div className="text-sm text-neutral-400">
                              {model.percentage.toFixed(1)}% {t('analytics.usageLabel')}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-bold text-white">
                            {formatNumber(model.value)}
                          </div>
                          <div className="text-sm text-neutral-400">
                            {formatCurrency(model.cost)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-400">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 opacity-50"
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
                  <p className="text-sm">{t('analytics.noModelData')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-neutral-900/80 backdrop-blur-sm border-neutral-800">
            <CardHeader>
              <CardTitle className="text-white">{t('analytics.performanceMetrics')}</CardTitle>
              <CardDescription>{t('analytics.keyInsights')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {/* Burn Rate */}
                <Card className="bg-neutral-800/50 border-neutral-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
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
                              <div className="text-xl font-bold text-white cursor-help">
                                {formatNumber(stats.burnRate)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('analytics.burnRateTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-sm text-neutral-400">{t('analytics.burnRate')}</div>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          stats.burnRate > 1000
                            ? 'bg-red-500/20 text-red-300'
                            : stats.burnRate > 500
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {stats.burnRate > 1000
                          ? t('analytics.high')
                          : stats.burnRate > 500
                            ? t('analytics.moderate')
                            : t('analytics.normal')}
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400 mb-2">
                      {t('analytics.tokensPerHour')}
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          stats.burnRate > 1000
                            ? 'bg-red-500'
                            : stats.burnRate > 500
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((stats.burnRate / 2000) * 100, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Efficiency */}
                <Card className="bg-neutral-800/50 border-neutral-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xl font-bold text-white cursor-help">
                                {stats.percentageUsed.toFixed(1)}%
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('analytics.usagePercentage')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-sm text-neutral-400">
                            {t('analytics.efficiency')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400 mb-2">
                      {t('analytics.planUtilization')}
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                        style={{ width: `${Math.min(stats.percentageUsed, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Depletion */}
                <Card className="bg-neutral-800/50 border-neutral-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xl font-bold text-white cursor-help">
                                {getDepletionText(stats, t)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('analytics.depletionTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-sm text-neutral-400">{t('analytics.depletion')}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400">{t('analytics.depletionRate')}</div>
                  </CardContent>
                </Card>

                {/* Average Cost */}
                <Card className="bg-neutral-800/50 border-neutral-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-white">
                            {stats.today.totalTokens > 0 && stats.today.totalCost > 0
                              ? formatCurrency(
                                  (stats.today.totalCost / stats.today.totalTokens) * 1000
                                )
                              : '$0.000'}
                          </div>
                          <div className="text-sm text-neutral-400">{t('analytics.avgCost')}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400">
                      {t('analytics.costPerThousandTokens')}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
};
