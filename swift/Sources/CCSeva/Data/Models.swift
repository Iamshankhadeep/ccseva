import Foundation

/// A single deduplicated assistant usage entry parsed from a Claude Code JSONL transcript line.
struct UsageEntry {
    let timestamp: Date
    let model: String
    let inputTokens: Int
    let outputTokens: Int
    let cacheCreationTokens: Int
    let cacheReadTokens: Int
    /// Cost in USD. Taken from `costUSD` on the line when present (in practice it never is),
    /// otherwise computed from the embedded pricing table.
    let costUSD: Double
    /// Last path component of the `cwd` field; used for per-project breakdowns.
    let projectName: String
    /// False when the model was not found in the pricing table (cost is 0 in that case).
    let priced: Bool

    var totalTokens: Int { inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens }
}

/// Token sums broken down by type.
struct TokenCounts {
    var input = 0
    var output = 0
    var cacheCreation = 0
    var cacheRead = 0

    var total: Int { input + output + cacheCreation + cacheRead }

    mutating func add(_ entry: UsageEntry) {
        input += entry.inputTokens
        output += entry.outputTokens
        cacheCreation += entry.cacheCreationTokens
        cacheRead += entry.cacheReadTokens
    }
}

/// Burn rate computed over the entries inside a session block.
struct BurnRate {
    let tokensPerMinute: Double
    let costPerHour: Double
}

/// Projection of an active block to its scheduled end.
struct BlockProjection {
    let remainingMinutes: Double
    let projectedTotalTokens: Int
    let projectedCost: Double
}

/// A 5-hour session block, mirroring ccusage's session block algorithm.
///
/// Blocks start at the entry timestamp floored to the UTC hour. A new block begins
/// when an entry is more than 5h after the block start OR more than 5h after the
/// previous entry (idle gap).
struct SessionBlock: Identifiable {
    let id: String
    let startTime: Date
    /// startTime + 5 hours (scheduled window end).
    let endTime: Date
    /// Timestamp of the last entry in the block.
    let actualEndTime: Date
    /// Timestamp of the first entry in the block.
    let firstEntryTime: Date
    let isActive: Bool
    var tokens = TokenCounts()
    var costUSD: Double = 0
    var models: [String] = []
    var entryCount: Int = 0

    var totalTokens: Int { tokens.total }

    /// tokens/min and $/hour over the active span of the block.
    var burnRate: BurnRate? {
        let durationMinutes = actualEndTime.timeIntervalSince(firstEntryTime) / 60.0
        guard durationMinutes > 0.5, totalTokens > 0 else { return nil }
        return BurnRate(
            tokensPerMinute: Double(totalTokens) / durationMinutes,
            costPerHour: costUSD / durationMinutes * 60.0
        )
    }

    func projection(now: Date) -> BlockProjection? {
        guard isActive, let rate = burnRate else { return nil }
        let remaining = max(0, endTime.timeIntervalSince(now) / 60.0)
        return BlockProjection(
            remainingMinutes: remaining,
            projectedTotalTokens: totalTokens + Int(rate.tokensPerMinute * remaining),
            projectedCost: costUSD + (rate.costPerHour / 60.0) * remaining
        )
    }
}

/// Per-day aggregation (local timezone).
struct DailyUsage: Identifiable {
    let date: Date
    let dateKey: String
    var tokens = TokenCounts()
    var cost: Double = 0
    var modelCosts: [String: Double] = [:]

    var id: String { dateKey }
}

/// Per-week aggregation; weeks start on Monday (local timezone).
struct WeeklyUsage: Identifiable {
    let weekStart: Date
    var tokens = TokenCounts()
    var cost: Double = 0

    var id: Date { weekStart }
}

/// Per-model aggregation.
struct ModelUsage: Identifiable {
    let model: String
    var tokens = TokenCounts()
    var cost: Double = 0
    var priced: Bool = true

    var id: String { model }
}

/// Per-project cost for the current month.
struct ProjectCost: Identifiable {
    let name: String
    var cost: Double = 0
    var totalTokens: Int = 0

    var id: String { name }
}

/// Scan bookkeeping for diagnostics.
struct ScanStats {
    var filesSeen = 0
    var filesParsed = 0
    var rawUsageLines = 0
    var duplicatesSkipped = 0
    var scanDuration: TimeInterval = 0
}

/// Immutable result of a full scan + aggregation pass; published to the UI.
struct UsageSnapshot {
    let generatedAt: Date
    let stats: ScanStats
    let totalEntries: Int
    let blocks: [SessionBlock]
    let activeBlock: SessionBlock?
    /// Last 30 days, ascending by date.
    let daily: [DailyUsage]
    /// Last 8 weeks, ascending by week start.
    let weekly: [WeeklyUsage]
    /// Last 30 days per-model breakdown, sorted by cost descending.
    let modelBreakdown: [ModelUsage]
    /// Current-month per-project cost, sorted descending.
    let projectsThisMonth: [ProjectCost]
    let todayTokens: Int
    let todayCost: Double
    let hasUnpricedModels: Bool
    let unknownModels: [String]
    /// Max total tokens seen in any single block; used for plan auto-detection.
    let maxBlockTokens: Int

    static let empty = UsageSnapshot(
        generatedAt: Date(), stats: ScanStats(), totalEntries: 0, blocks: [],
        activeBlock: nil, daily: [], weekly: [], modelBreakdown: [],
        projectsThisMonth: [], todayTokens: 0, todayCost: 0,
        hasUnpricedModels: false, unknownModels: [], maxBlockTokens: 0
    )
}
