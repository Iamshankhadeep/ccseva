export interface UsageData {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface DailyUsage {
  date: string;
  totalTokens: number;
  totalCost: number;
  models: {
    [key: string]: {
      tokens: number;
      cost: number;
    };
  };
}

export interface ResetTimeInfo {
  nextResetTime: string; // ISO string of next reset
  timeUntilReset: number; // milliseconds until reset
  resetHour: number; // hour when reset occurs (0-23)
  timezone: string; // timezone identifier (e.g., 'America/Los_Angeles')
  percentUntilReset: number; // percentage of billing cycle completed (0-100)
  daysInCycle: number; // total days in current billing cycle
  daysSinceReset: number; // days elapsed since last reset
}

export interface VelocityInfo {
  current: number; // current tokens per hour
  average24h: number; // 24-hour rolling average tokens per hour
  average7d: number; // 7-day average tokens per hour
  trend: 'increasing' | 'decreasing' | 'stable'; // trend direction
  trendPercent: number; // percentage change from previous period
  peakHour: number; // hour of day with highest usage (0-23)
  isAccelerating: boolean; // true if usage rate is increasing
}

export interface PredictionInfo {
  depletionTime: string | null; // predicted depletion time
  confidence: number; // confidence level 0-100
  daysRemaining: number; // estimated days until depletion
  recommendedDailyLimit: number; // suggested daily token limit
  onTrackForReset: boolean; // will tokens last until reset
}

export interface ActualResetInfo {
  nextResetTime: Date | null; // actual next reset time from latest session
  timeUntilReset: number; // milliseconds until actual reset
  formattedTimeRemaining: string; // human-readable time remaining
}

export interface BlockBurnRate {
  tokensPerMinute: number; // raw tokens per minute (includes cache reads)
  tokensPerMinuteForIndicator: number; // weighted tokens per minute for display
  costPerHour: number; // USD per hour at current rate
}

export interface BlockProjection {
  totalTokens: number; // projected tokens at block end
  totalCost: number; // projected cost at block end (USD)
  remainingMinutes: number; // minutes until the block ends
}

export interface ActiveBlockInfo {
  startTime: string; // ISO string of block start
  endTime: string; // ISO string of block end (5-hour limit reset)
  tokensUsed: number; // tokens consumed in the current block
  costUSD: number; // cost of the current block
  models: string[]; // models used in the current block
  burnRate: BlockBurnRate | null; // precomputed burn rate from ccusage
  projection: BlockProjection | null; // precomputed projection from ccusage
}

export interface WeeklyUsage {
  weekStart: string; // YYYY-MM-DD of the week start (Monday)
  totalTokens: number;
  totalCost: number;
  models: {
    [key: string]: {
      tokens: number;
      cost: number;
    };
  };
}

export interface UsageStats {
  today: DailyUsage;
  thisWeek: DailyUsage[];
  thisMonth: DailyUsage[];
  burnRate: number; // tokens per hour (legacy, use velocity.current)
  velocity: VelocityInfo; // enhanced burn rate analysis
  prediction: PredictionInfo; // intelligent predictions
  resetInfo: ResetTimeInfo; // reset time tracking
  actualResetInfo?: ActualResetInfo; // actual reset time from session data
  activeBlock?: ActiveBlockInfo | null; // current 5-hour session block
  predictedDepleted: string | null; // when tokens will run out (legacy)
  currentPlan: 'Pro' | 'Max5' | 'Max20' | 'Custom';
  tokenLimit: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentageUsed: number;
  sessionTracking?: SessionTracking; // 5-hour rolling session tracking
  dataSource: 'live' | 'unavailable'; // 'unavailable' when the ccusage CLI could not be run
}

export interface UserConfiguration {
  resetHour: number; // hour when tokens reset (0-23)
  timezone: string; // user's timezone
  updateInterval: number; // milliseconds between updates
  warningThresholds: {
    low: number; // percentage for first warning
    high: number; // percentage for critical warning
  };
  plan: 'Pro' | 'Max5' | 'Max20' | 'Custom' | 'auto'; // 'auto' for auto-detection
  customTokenLimit?: number; // for custom plans
  menuBarCostSource?: 'today' | 'sessionWindow'; // basis for menu bar cost display
}

export interface SessionInfo {
  id: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  isGap: boolean;
  tokensUsed: number;
  duration: number; // milliseconds
  models: string[];
  costUSD: number;
  sessionType: 'active' | 'completed' | 'gap';
}

export interface SessionWindow {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // 5 hours in milliseconds
  sessions: SessionInfo[];
  totalTokens: number;
  totalCost: number;
  isComplete: boolean;
}

export interface SessionTracking {
  currentSession: SessionInfo | null;
  activeWindow: SessionWindow;
  recentSessions: SessionInfo[];
  sessionHistory: SessionWindow[];
  windowDuration: number; // 5 hours in milliseconds
  lastActivity: Date;
  sessionsInWindow: number;
  averageSessionLength: number;
}

export interface CCUsageBlock {
  id?: string;
  startTime: string;
  endTime?: string;
  actualEndTime?: string;
  isActive: boolean;
  isGap?: boolean;
  models?: string[];
  costUSD?: number;
  tokenCounts?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
}

export interface MenuBarData {
  tokensUsed: number;
  tokenLimit: number;
  percentageUsed: number;
  status: 'safe' | 'warning' | 'critical';
  cost: number;
  dataSource: 'live' | 'unavailable'; // 'unavailable' when the ccusage CLI could not be run
  timeUntilReset?: string; // formatted time until reset
  resetInfo?: ResetTimeInfo; // detailed reset information
  sessionTracking?: SessionTracking; // 5-hour rolling session tracking
}
