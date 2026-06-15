import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type {
  ActiveBlockInfo,
  BlockBurnRate,
  BlockProjection,
  DailyUsage,
  MenuBarData,
  PredictionInfo,
  ResetTimeInfo,
  UsageStats,
  UserConfiguration,
  VelocityInfo,
  WeeklyUsage,
} from '../types/usage.js';
import { ResetTimeService } from './resetTimeService.js';
import { SessionTracker } from './sessionTracker.js';

const execFileAsync = promisify(execFile);
const resolver = createRequire(import.meta.url);

/** Map of platform-arch to the ccusage native binary package name. */
const NATIVE_BINARY_PACKAGES: Record<string, string> = {
  'darwin-arm64': '@ccusage/ccusage-darwin-arm64',
  'darwin-x64': '@ccusage/ccusage-darwin-x64',
  'linux-arm64': '@ccusage/ccusage-linux-arm64',
  'linux-x64': '@ccusage/ccusage-linux-x64',
  'win32-arm64': '@ccusage/ccusage-win32-arm64',
  'win32-x64': '@ccusage/ccusage-win32-x64',
};

const CLI_TIMEOUT_MS = 30000;
const CLI_MAX_BUFFER = 50 * 1024 * 1024; // 50MB; JSON output can be large

interface CliCommand {
  command: string;
  baseArgs: string[];
}

/**
 * Spawning binaries from inside an asar archive is not possible; electron-builder
 * unpacks the ccusage packages (see asarUnpack), so point at the unpacked copy.
 */
function toSpawnablePath(resolvedPath: string): string {
  return resolvedPath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}

// --- ccusage v20 CLI JSON shapes ---

interface CliTokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

interface CliBlock {
  id: string;
  startTime: string;
  endTime: string;
  actualEndTime: string | null;
  isActive: boolean;
  isGap: boolean;
  entries: number; // count of usage entries in the block (not an array)
  tokenCounts: CliTokenCounts;
  totalTokens: number;
  costUSD: number;
  models: string[];
  burnRate: BlockBurnRate | null;
  projection: BlockProjection | null;
}

interface CliModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

interface CliDailyEntry {
  date: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
  totalTokens: number;
  modelsUsed: string[];
  modelBreakdowns: CliModelBreakdown[];
}

interface CliWeeklyEntry {
  week: string; // YYYY-MM-DD of week start
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
  totalTokens: number;
  modelsUsed: string[];
  modelBreakdowns: CliModelBreakdown[];
}

/** Session block with parsed dates, used internally for calculations. */
interface SessionBlock {
  id: string;
  startTime: Date;
  endTime: Date;
  actualEndTime?: Date;
  isActive: boolean;
  isGap: boolean;
  totalTokens: number;
  tokenCounts: CliTokenCounts;
  costUSD: number;
  models: string[];
  burnRate: BlockBurnRate | null;
  projection: BlockProjection | null;
}

export class CCUsageService {
  private static instance: CCUsageService;
  private cachedStats: UsageStats | null = null;
  private lastUpdate = 0;
  private readonly CACHE_DURATION = 3000; // 3 seconds like Python script
  private cachedWeekly: WeeklyUsage[] | null = null;
  private lastWeeklyUpdate = 0;
  private readonly WEEKLY_CACHE_DURATION = 60000; // weekly data changes slowly
  private cliCommand: CliCommand | null = null;
  private resetTimeService: ResetTimeService;
  private sessionTracker: SessionTracker;
  private historicalBlocks: SessionBlock[] = []; // Store session blocks for analysis
  private currentActiveBlock: SessionBlock | null = null; // Store current active block
  // Plan selected by the user ("auto" by default for auto-detection)
  private selectedPlan: 'auto' | 'Pro' | 'Max5' | 'Max20' | 'Custom' = 'auto';
  // Actual plan used for calculations after applying auto detection/selection
  private currentPlan: 'Pro' | 'Max5' | 'Max20' | 'Custom' = 'Pro';
  // Custom token limit specified by the user when plan === 'Custom'
  private customTokenLimit: number | undefined = undefined;
  // Basis for cost shown in menu bar
  private menuBarCostSource: 'today' | 'sessionWindow' = 'today';

  constructor() {
    this.resetTimeService = ResetTimeService.getInstance();
    this.sessionTracker = SessionTracker.getInstance();
  }

  static getInstance(): CCUsageService {
    if (!CCUsageService.instance) {
      CCUsageService.instance = new CCUsageService();
    }
    return CCUsageService.instance;
  }

  /**
   * Resolve how to invoke the ccusage CLI.
   * Prefers the platform-specific native binary; falls back to running the
   * ccusage JS launcher with the current executable in Node mode.
   */
  private resolveCli(): CliCommand {
    if (this.cliCommand) {
      return this.cliCommand;
    }

    const packageName = NATIVE_BINARY_PACKAGES[`${process.platform}-${process.arch}`];
    if (packageName) {
      try {
        const packageJsonPath = toSpawnablePath(resolver.resolve(`${packageName}/package.json`));
        const binaryName = process.platform === 'win32' ? 'ccusage.exe' : 'ccusage';
        const binaryPath = path.join(path.dirname(packageJsonPath), 'bin', binaryName);

        if (fs.existsSync(binaryPath)) {
          if (process.platform !== 'win32') {
            try {
              fs.accessSync(binaryPath, fs.constants.X_OK);
            } catch {
              fs.chmodSync(binaryPath, 0o755);
            }
          }
          this.cliCommand = { command: binaryPath, baseArgs: [] };
          return this.cliCommand;
        }
      } catch {
        // Native package not installed; fall through to the JS launcher
      }
    }

    // Fallback: run ccusage's cli.js launcher with the current executable.
    // ELECTRON_RUN_AS_NODE makes Electron behave like plain Node.
    const cliJsPath = toSpawnablePath(resolver.resolve('ccusage/dist/cli.js'));
    this.cliCommand = { command: process.execPath, baseArgs: [cliJsPath] };
    return this.cliCommand;
  }

  /**
   * Execute a ccusage CLI subcommand and parse its JSON output.
   * Always uses the `claude` subcommand so usage from other coding agents
   * (Codex, Gemini, etc.) is not included.
   */
  private async runCli<T>(args: string[]): Promise<T> {
    const { command, baseArgs } = this.resolveCli();
    const { stdout } = await execFileAsync(
      command,
      [...baseArgs, 'claude', ...args, '--json', '--mode', 'calculate', '--offline'],
      {
        timeout: CLI_TIMEOUT_MS,
        maxBuffer: CLI_MAX_BUFFER,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NO_COLOR: '1' },
      }
    );
    return JSON.parse(stdout) as T;
  }

  private async fetchBlocks(): Promise<SessionBlock[]> {
    const result = await this.runCli<{ blocks: CliBlock[] }>(['blocks', '--session-length', '5']);
    return (result.blocks ?? []).map((block) => ({
      id: block.id,
      startTime: new Date(block.startTime),
      endTime: new Date(block.endTime),
      actualEndTime: block.actualEndTime ? new Date(block.actualEndTime) : undefined,
      isActive: block.isActive,
      isGap: block.isGap,
      totalTokens: block.totalTokens,
      tokenCounts: block.tokenCounts,
      costUSD: block.costUSD,
      models: block.models,
      burnRate: block.burnRate,
      projection: block.projection,
    }));
  }

  private async fetchDaily(): Promise<CliDailyEntry[]> {
    const result = await this.runCli<{ daily: CliDailyEntry[] }>(['daily']);
    return result.daily ?? [];
  }

  private async fetchWeekly(): Promise<CliWeeklyEntry[]> {
    const result = await this.runCli<{ weekly: CliWeeklyEntry[] }>([
      'weekly',
      '--start-of-week',
      'monday',
    ]);
    return result.weekly ?? [];
  }

  private toISOStringLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

    // Calculate timezone offset
    const timezoneOffsetMinutes = date.getTimezoneOffset();
    const offsetSign = timezoneOffsetMinutes > 0 ? '-' : '+';
    const offsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60)
      .toString()
      .padStart(2, '0');
    const offsetMinutes = (Math.abs(timezoneOffsetMinutes) % 60).toString().padStart(2, '0');
    const timezoneOffsetString = `${offsetSign}${offsetHours}:${offsetMinutes}`;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezoneOffsetString}`;
  }

  updateConfiguration(config: Partial<UserConfiguration>): void {
    this.resetTimeService.updateConfiguration(config);

    if (config.plan !== undefined) {
      this.selectedPlan = config.plan;
    }
    if (config.customTokenLimit !== undefined) {
      this.customTokenLimit = config.customTokenLimit;
    }
    if (config.menuBarCostSource !== undefined) {
      this.menuBarCostSource = config.menuBarCostSource;
    }

    // Clear cache to force recalculation with new config
    this.cachedStats = null;
  }

  async getUsageStats(): Promise<UsageStats> {
    const now = Date.now();

    // Return cached data if it's still fresh
    if (this.cachedStats && now - this.lastUpdate < this.CACHE_DURATION) {
      return this.cachedStats;
    }

    try {
      // Get both session blocks and daily data for complete information
      const [blocks, dailyData] = await Promise.all([this.fetchBlocks(), this.fetchDaily()]);

      if (blocks.length === 0) {
        console.error('No blocks data received');
        this.currentActiveBlock = null;
        return this.getDefaultStats();
      }

      const stats = this.parseBlocksData(blocks, dailyData);

      this.cachedStats = stats;
      this.lastUpdate = now;
      this.historicalBlocks = blocks;

      return stats;
    } catch (error) {
      console.error('Error fetching usage stats:', error);

      // The ccusage CLI could not be run; return zeroed stats flagged as unavailable
      return this.getUnavailableStats();
    }
  }

  /**
   * Get weekly usage aggregated by ccusage (weeks start Monday, matching
   * Claude's weekly limit reset).
   */
  async getWeeklyUsage(): Promise<WeeklyUsage[]> {
    const now = Date.now();

    if (this.cachedWeekly && now - this.lastWeeklyUpdate < this.WEEKLY_CACHE_DURATION) {
      return this.cachedWeekly;
    }

    try {
      const weekly = await this.fetchWeekly();
      const mapped = weekly.map((week) => ({
        weekStart: week.week,
        totalTokens: week.totalTokens,
        totalCost: week.totalCost,
        models: this.mapModelBreakdowns(week.modelBreakdowns),
      }));

      this.cachedWeekly = mapped;
      this.lastWeeklyUpdate = now;
      return mapped;
    } catch (error) {
      console.error('Error fetching weekly usage:', error);
      return this.cachedWeekly ?? [];
    }
  }

  /**
   * Resolve the plan and token limit based on user selection and detected usage
   */
  private resolvePlan(blocks: SessionBlock[]): {
    plan: 'Pro' | 'Max5' | 'Max20' | 'Custom';
    tokenLimit: number;
  } {
    if (this.selectedPlan === 'auto') {
      // Auto-detect plan based on maximum usage across all blocks
      const maxTokens = this.getMaxTokensFromBlocks(blocks);
      const detectedPlan = this.detectPlan(maxTokens);
      return {
        plan: detectedPlan,
        tokenLimit: detectedPlan === 'Custom' ? maxTokens : this.getTokenLimit(detectedPlan),
      };
    }

    if (this.selectedPlan === 'Custom') {
      // Use custom token limit or fallback to detected limit
      const tokenLimit = this.customTokenLimit ?? this.getMaxTokensFromBlocks(blocks);
      return {
        plan: 'Custom',
        tokenLimit,
      };
    }

    // Use explicitly selected plan
    return {
      plan: this.selectedPlan,
      tokenLimit: this.getTokenLimit(this.selectedPlan),
    };
  }

  /**
   * Build the full usage stats from session blocks and daily data
   */
  private parseBlocksData(blocks: SessionBlock[], dailyData: CliDailyEntry[]): UsageStats {
    // Find active block
    const activeBlock = blocks.find((block) => block.isActive && !block.isGap);

    if (!activeBlock) {
      this.currentActiveBlock = null;
      return this.getDefaultStats();
    }

    // Store the active block for reset time calculation
    this.currentActiveBlock = activeBlock;

    // Get tokens from active session
    const tokensUsed = activeBlock.totalTokens;

    // Resolve plan and token limit based on user selection and detected usage
    const { plan, tokenLimit } = this.resolvePlan(blocks);
    this.currentPlan = plan;

    // Calculate burn rate from last hour across all sessions
    const burnRate = this.calculateHourlyBurnRate(blocks);

    // Calculate enhanced metrics
    const velocity = this.calculateVelocityFromBlocks(blocks, burnRate);
    const resetInfo = this.resetTimeService.calculateResetInfo();
    const prediction = this.calculatePredictionInfo(tokensUsed, tokenLimit, velocity, resetInfo);

    // Update session tracking with 5-hour rolling windows
    const sessionTracking = this.sessionTracker.updateFromBlocks(
      this.convertSessionBlocksToCC(blocks)
    );

    // Process the daily data from ccusage, filtering out synthetic models
    const processedDailyData: DailyUsage[] = dailyData.map((day) => ({
      date: day.date,
      totalTokens: day.totalTokens,
      totalCost: day.totalCost,
      models: this.mapModelBreakdowns(day.modelBreakdowns),
    }));

    const todayStr = this.toISOStringLocal(new Date()).split('T')[0];
    const todayData =
      processedDailyData.find((d) => d.date === todayStr) || this.getEmptyDailyUsage();

    // Get actual reset time from session data
    const actualResetInfo = this.getTimeUntilActualReset();

    return {
      today: todayData,
      thisWeek: processedDailyData.filter((d) => {
        const date = new Date(d.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      }),
      thisMonth: processedDailyData.filter((d) => {
        const date = new Date(d.date);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return date >= monthAgo;
      }),
      burnRate,
      velocity,
      prediction,
      resetInfo,
      actualResetInfo,
      activeBlock: this.buildActiveBlockInfo(activeBlock),
      predictedDepleted: prediction.depletionTime,
      currentPlan: this.currentPlan,
      tokenLimit,
      tokensUsed,
      tokensRemaining: Math.max(0, tokenLimit - tokensUsed),
      percentageUsed: Math.min(100, (tokensUsed / tokenLimit) * 100),
      // Enhanced session tracking
      sessionTracking,
      dataSource: 'live',
    };
  }

  /**
   * Build the serializable active block summary for the renderer
   */
  private buildActiveBlockInfo(block: SessionBlock): ActiveBlockInfo {
    return {
      startTime: block.startTime.toISOString(),
      endTime: block.endTime.toISOString(),
      tokensUsed: block.totalTokens,
      costUSD: block.costUSD,
      models: block.models.filter((model) => model !== '<synthetic>'),
      burnRate: block.burnRate,
      projection: block.projection,
    };
  }

  /**
   * Aggregate per-model breakdowns into a model -> {tokens, cost} map,
   * filtering out synthetic models
   */
  private mapModelBreakdowns(breakdowns: CliModelBreakdown[]): {
    [key: string]: { tokens: number; cost: number };
  } {
    const models: { [key: string]: { tokens: number; cost: number } } = {};
    for (const breakdown of breakdowns) {
      if (breakdown.modelName === '<synthetic>') continue;
      models[breakdown.modelName] = {
        tokens:
          breakdown.inputTokens +
          breakdown.outputTokens +
          breakdown.cacheCreationTokens +
          breakdown.cacheReadTokens,
        cost: breakdown.cost,
      };
    }
    return models;
  }

  /**
   * Convert SessionBlock array to CCUsageBlock array for compatibility
   */
  private convertSessionBlocksToCC(
    blocks: SessionBlock[]
  ): import('../types/usage.js').CCUsageBlock[] {
    return blocks.map((block) => ({
      id: block.id,
      startTime: block.startTime.toISOString(),
      endTime: block.endTime.toISOString(),
      actualEndTime: block.actualEndTime?.toISOString(),
      isActive: block.isActive,
      isGap: block.isGap,
      models: block.models,
      costUSD: block.costUSD,
      tokenCounts: block.tokenCounts,
    }));
  }

  /**
   * Get maximum tokens from all previous blocks (like Python's get_token_limit)
   */
  private getMaxTokensFromBlocks(blocks: SessionBlock[]): number {
    let maxTokens = 0;

    for (const block of blocks) {
      if (!block.isGap && !block.isActive && block.totalTokens > maxTokens) {
        maxTokens = block.totalTokens;
      }
    }

    // Return the highest found, or default to pro if none found
    return maxTokens > 0 ? maxTokens : 7000;
  }

  /**
   * Calculate hourly burn rate based on Python implementation
   */
  private calculateHourlyBurnRate(blocks: SessionBlock[]): number {
    if (!blocks || blocks.length === 0) return 0;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    let totalTokens = 0;

    for (const block of blocks) {
      if (block.isGap) continue;

      const startTime = block.startTime;

      // Determine session end time
      let sessionEnd: Date;
      if (block.isActive) {
        sessionEnd = now;
      } else if (block.actualEndTime) {
        sessionEnd = block.actualEndTime;
      } else {
        sessionEnd = block.endTime;
      }

      // Skip if session ended before the last hour
      if (sessionEnd < oneHourAgo) continue;

      // Calculate overlap with last hour
      const sessionStartInHour = startTime > oneHourAgo ? startTime : oneHourAgo;
      const sessionEndInHour = sessionEnd < now ? sessionEnd : now;

      if (sessionEndInHour <= sessionStartInHour) continue;

      // Calculate portion of tokens used in the last hour
      const totalSessionDuration = (sessionEnd.getTime() - startTime.getTime()) / (1000 * 60); // minutes
      const hourDuration =
        (sessionEndInHour.getTime() - sessionStartInHour.getTime()) / (1000 * 60); // minutes

      if (totalSessionDuration > 0) {
        totalTokens += block.totalTokens * (hourDuration / totalSessionDuration);
      }
    }

    // Return tokens per minute like Python script
    return totalTokens / 60;
  }

  /**
   * Calculate velocity info from blocks
   */
  private calculateVelocityFromBlocks(
    blocks: SessionBlock[],
    currentBurnRate: number
  ): VelocityInfo {
    const now = new Date();

    // Calculate 24-hour average
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last24HourBlocks = blocks.filter((b) => !b.isGap && b.startTime >= oneDayAgo);
    let tokens24h = 0;
    for (const block of last24HourBlocks) {
      tokens24h += block.totalTokens;
    }
    const average24h = tokens24h / 24; // tokens per hour

    // Calculate 7-day average
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DayBlocks = blocks.filter((b) => !b.isGap && b.startTime >= oneWeekAgo);
    let tokens7d = 0;
    for (const block of last7DayBlocks) {
      tokens7d += block.totalTokens;
    }
    const average7d = tokens7d / (7 * 24); // tokens per hour

    // Trend analysis
    const trendPercent =
      average24h > 0 ? ((currentBurnRate * 60 - average24h) / average24h) * 100 : 0;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (Math.abs(trendPercent) > 15) {
      trend = trendPercent > 0 ? 'increasing' : 'decreasing';
    }

    return {
      current: currentBurnRate * 60, // convert to tokens per hour
      average24h,
      average7d,
      trend,
      trendPercent: Math.round(trendPercent * 10) / 10,
      peakHour: this.calculatePeakHourFromBlocks(blocks),
      isAccelerating: trend === 'increasing' && trendPercent > 20,
    };
  }

  /**
   * Estimate the hour of day with the highest usage. The v20 CLI only reports
   * an entry count per block, so block tokens are distributed proportionally
   * across the hours each block was active.
   */
  private calculatePeakHourFromBlocks(blocks: SessionBlock[]): number {
    const hourBuckets = new Array<number>(24).fill(0);
    const now = new Date();

    for (const block of blocks) {
      if (block.isGap || block.totalTokens === 0) continue;

      const start = block.startTime.getTime();
      const end = (block.isActive ? now : (block.actualEndTime ?? block.endTime)).getTime();
      const duration = end - start;

      if (duration <= 0) {
        hourBuckets[block.startTime.getHours()] += block.totalTokens;
        continue;
      }

      let cursor = start;
      while (cursor < end) {
        // Advance to the next LOCAL hour boundary so chunks line up with
        // getHours() attribution (epoch-aligned boundaries skew results in
        // timezones with non-whole-hour UTC offsets).
        const cursorDate = new Date(cursor);
        cursorDate.setMinutes(60, 0, 0);
        const hourEnd = Math.min(end, cursorDate.getTime());
        const fraction = (hourEnd - cursor) / duration;
        hourBuckets[new Date(cursor).getHours()] += block.totalTokens * fraction;
        cursor = hourEnd;
      }
    }

    return hourBuckets.indexOf(Math.max(...hourBuckets));
  }

  private getEmptyDailyUsage(): DailyUsage {
    return {
      date: new Date().toISOString().split('T')[0],
      totalTokens: 0,
      totalCost: 0,
      models: {},
    };
  }

  async getMenuBarData(): Promise<MenuBarData> {
    const stats = await this.getUsageStats();

    // Determine cost based on configured source
    let cost = stats.today.totalCost;
    if (this.menuBarCostSource === 'sessionWindow') {
      if (stats.sessionTracking?.activeWindow.totalCost !== undefined) {
        cost = stats.sessionTracking.activeWindow.totalCost;
      } else if (this.historicalBlocks.length > 0) {
        cost = this.getSessionWindowCostFromBlocks(this.historicalBlocks);
      }
    }

    return {
      tokensUsed: stats.tokensUsed,
      tokenLimit: stats.tokenLimit,
      percentageUsed: stats.percentageUsed,
      status: this.getUsageStatus(stats.percentageUsed),
      cost,
      dataSource: stats.dataSource,
    };
  }

  /**
   * Zeroed stats returned when usage data cannot be fetched (e.g. the ccusage
   * CLI failed to spawn). Flagged so the UI can surface the failure instead of
   * presenting fabricated numbers as real data.
   */
  private getUnavailableStats(): UsageStats {
    return {
      ...this.getDefaultStats(),
      dataSource: 'unavailable',
    };
  }

  private detectPlan(totalTokens: number): 'Pro' | 'Max5' | 'Max20' | 'Custom' {
    if (totalTokens <= 7000) return 'Pro';
    if (totalTokens <= 35000) return 'Max5';
    if (totalTokens <= 140000) return 'Max20';
    return 'Custom';
  }

  private getTokenLimit(plan: string): number {
    switch (plan) {
      case 'Pro':
        return 7000;
      case 'Max5':
        return 35000;
      case 'Max20':
        return 140000;
      default:
        return 500000; // Custom high limit
    }
  }

  private getUsageStatus(percentageUsed: number): 'safe' | 'warning' | 'critical' {
    if (percentageUsed >= 90) return 'critical';
    if (percentageUsed >= 70) return 'warning';
    return 'safe';
  }

  private getDefaultStats(): UsageStats {
    const today = new Date().toISOString().split('T')[0];
    const resetInfo = this.resetTimeService.calculateResetInfo();

    const velocity: VelocityInfo = {
      current: 0,
      average24h: 0,
      average7d: 0,
      trend: 'stable',
      trendPercent: 0,
      peakHour: 12,
      isAccelerating: false,
    };

    const prediction: PredictionInfo = {
      depletionTime: null,
      confidence: 0,
      daysRemaining: 0,
      recommendedDailyLimit: 0,
      onTrackForReset: true,
    };

    return {
      today: {
        date: today,
        totalTokens: 0,
        totalCost: 0,
        models: {},
      },
      thisWeek: [],
      thisMonth: [],
      burnRate: 0, // legacy field
      velocity,
      prediction,
      resetInfo,
      activeBlock: null,
      predictedDepleted: null, // legacy field
      currentPlan:
        this.selectedPlan === 'auto'
          ? 'Pro'
          : (this.selectedPlan as 'Pro' | 'Max5' | 'Max20' | 'Custom'),
      tokenLimit:
        this.selectedPlan === 'Custom'
          ? (this.customTokenLimit ?? 500000)
          : this.getTokenLimit(this.selectedPlan === 'auto' ? 'Pro' : this.selectedPlan),
      tokensUsed: 0,
      tokensRemaining:
        this.selectedPlan === 'Custom'
          ? (this.customTokenLimit ?? 500000)
          : this.getTokenLimit(this.selectedPlan === 'auto' ? 'Pro' : this.selectedPlan),
      percentageUsed: 0,
      dataSource: 'live',
    };
  }

  /**
   * Calculate prediction information with confidence levels
   */
  private calculatePredictionInfo(
    tokensUsed: number,
    tokenLimit: number,
    velocity: VelocityInfo,
    resetInfo: ResetTimeInfo
  ): PredictionInfo {
    const tokensRemaining = Math.max(0, tokenLimit - tokensUsed);

    // Calculate confidence based on data availability and consistency
    let confidence = 50; // Base confidence
    if (velocity.current > 0 && velocity.average24h > 0) {
      confidence = Math.min(95, confidence + 30);

      // Reduce confidence if trend is highly volatile
      if (Math.abs(velocity.trendPercent) > 50) {
        confidence -= 20;
      }
    }

    // Predicted depletion time
    let depletionTime: string | null = null;
    let daysRemaining = 0;

    if (velocity.current > 0) {
      const hoursRemaining = tokensRemaining / velocity.current;
      daysRemaining = hoursRemaining / 24;
      depletionTime = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000).toISOString();
    }

    // Recommended daily limit to last until reset
    const recommendedDailyLimit = this.resetTimeService.calculateRecommendedDailyLimit(
      tokensRemaining,
      resetInfo
    );

    // Check if on track for reset
    const onTrackForReset = this.resetTimeService.isOnTrackForReset(
      tokensUsed,
      tokenLimit,
      resetInfo
    );

    return {
      depletionTime,
      confidence: Math.round(confidence),
      daysRemaining: Math.round(daysRemaining * 10) / 10,
      recommendedDailyLimit,
      onTrackForReset,
    };
  }

  /**
   * Get actual next reset time based on active session block end time
   */
  private getActualNextResetTime(): Date | null {
    if (!this.currentActiveBlock) {
      return null;
    }

    // Use only endTime from the active block
    return this.currentActiveBlock.endTime;
  }

  /**
   * Calculate time remaining until next reset based on actual session data
   */
  getTimeUntilActualReset(): {
    nextResetTime: Date | null;
    timeUntilReset: number;
    formattedTimeRemaining: string;
  } {
    const actualResetTime = this.getActualNextResetTime();

    if (!actualResetTime) {
      return {
        nextResetTime: null,
        timeUntilReset: 0,
        formattedTimeRemaining: 'No active session',
      };
    }

    const now = new Date();
    const timeUntilReset = Math.max(0, actualResetTime.getTime() - now.getTime());

    // Format time remaining
    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

    let formattedTimeRemaining: string;
    if (timeUntilReset <= 0) {
      formattedTimeRemaining = 'Reset available';
    } else if (hours > 0) {
      formattedTimeRemaining = `${hours} hours ${minutes} minutes left`;
    } else if (minutes > 0) {
      formattedTimeRemaining = `${minutes} minutes left`;
    } else {
      formattedTimeRemaining = 'Less than 1 minute left';
    }

    return {
      nextResetTime: actualResetTime,
      timeUntilReset,
      formattedTimeRemaining,
    };
  }

  /**
   * Calculate total cost within the rolling 5-hour session window from raw blocks
   */
  private getSessionWindowCostFromBlocks(blocks: SessionBlock[]): number {
    if (!blocks || blocks.length === 0) return 0;
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    let total = 0;

    for (const block of blocks) {
      if (block.isGap) continue;
      if (block.startTime >= windowStart) {
        total += block.costUSD || 0;
      }
    }
    return total;
  }
}
