import Foundation

/// Pure aggregation logic: 5-hour session blocks, daily/weekly rollups,
/// per-model and per-project breakdowns.
enum Aggregator {
    static let sessionDuration: TimeInterval = 5 * 60 * 60

    /// Floors a date to the start of its UTC hour (ccusage block anchoring rule).
    static func floorToUTCHour(_ date: Date) -> Date {
        Date(timeIntervalSince1970: floor(date.timeIntervalSince1970 / 3600) * 3600)
    }

    /// Replicates ccusage's session block windowing:
    /// - entries sorted ascending by timestamp
    /// - a block starts at floorToUTCHour(first entry)
    /// - a new block starts when an entry is >5h after the block start OR >5h
    ///   after the previous entry (idle gap)
    /// - a block is active when (now - lastEntry < 5h) && (now < startTime + 5h)
    static func computeBlocks(entries: [UsageEntry], now: Date) -> [SessionBlock] {
        guard !entries.isEmpty else { return [] }
        var blocks: [SessionBlock] = []
        var blockStart = floorToUTCHour(entries[0].timestamp)
        var blockEntries: [UsageEntry] = []

        func closeBlock() {
            guard let first = blockEntries.first, let last = blockEntries.last else { return }
            let endTime = blockStart.addingTimeInterval(sessionDuration)
            let isActive = now.timeIntervalSince(last.timestamp) < sessionDuration && now < endTime
            var block = SessionBlock(
                id: ISO8601.plain.string(from: blockStart),
                startTime: blockStart,
                endTime: endTime,
                actualEndTime: last.timestamp,
                firstEntryTime: first.timestamp,
                isActive: isActive
            )
            var models = Set<String>()
            for entry in blockEntries {
                block.tokens.add(entry)
                block.costUSD += entry.costUSD
                models.insert(entry.model)
            }
            block.models = models.sorted()
            block.entryCount = blockEntries.count
            blocks.append(block)
        }

        for entry in entries {
            if let last = blockEntries.last {
                let beyondWindow = entry.timestamp.timeIntervalSince(blockStart) > sessionDuration
                let idleGap = entry.timestamp.timeIntervalSince(last.timestamp) > sessionDuration
                if beyondWindow || idleGap {
                    closeBlock()
                    blockEntries = []
                    blockStart = floorToUTCHour(entry.timestamp)
                }
            }
            blockEntries.append(entry)
        }
        closeBlock()
        return blocks
    }

    static func buildSnapshot(entries: [UsageEntry], stats: ScanStats, now: Date) -> UsageSnapshot {
        let blocks = computeBlocks(entries: entries, now: now)
        let activeBlock = blocks.last(where: { $0.isActive })

        var calendar = Calendar(identifier: .gregorian)
        calendar.firstWeekday = 2 // Monday

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"

        // Snap cutoffs to bucket boundaries so the oldest day/week bucket is
        // complete rather than silently truncated at a mid-day/mid-week instant.
        let dailyCutoff = calendar.startOfDay(
            for: calendar.date(byAdding: .day, value: -30, to: now) ?? now
        )
        let weeklyAnchor = calendar.date(byAdding: .weekOfYear, value: -8, to: now) ?? now
        let weeklyCutoff = calendar.dateInterval(of: .weekOfYear, for: weeklyAnchor)?.start
            ?? weeklyAnchor

        var dailyMap: [String: DailyUsage] = [:]
        var weeklyMap: [Date: WeeklyUsage] = [:]
        var modelMap: [String: ModelUsage] = [:]
        var projectMap: [String: ProjectCost] = [:]
        var unknownModels = Set<String>()
        var maxBlockTokens = 0

        for block in blocks {
            maxBlockTokens = max(maxBlockTokens, block.totalTokens)
        }

        for entry in entries {
            if !entry.priced { unknownModels.insert(entry.model) }

            // Daily (local timezone), last 30 days.
            if entry.timestamp >= dailyCutoff {
                let key = dayFormatter.string(from: entry.timestamp)
                var day = dailyMap[key] ?? DailyUsage(
                    date: calendar.startOfDay(for: entry.timestamp), dateKey: key
                )
                day.tokens.add(entry)
                day.cost += entry.costUSD
                day.modelCosts[entry.model, default: 0] += entry.costUSD
                dailyMap[key] = day

                // Per-model breakdown over the same 30-day window.
                var model = modelMap[entry.model] ?? ModelUsage(model: entry.model)
                model.tokens.add(entry)
                model.cost += entry.costUSD
                model.priced = entry.priced
                modelMap[entry.model] = model
            }

            // Weekly (Monday start, local timezone), last 8 weeks.
            if entry.timestamp >= weeklyCutoff,
               let weekInterval = calendar.dateInterval(of: .weekOfYear, for: entry.timestamp) {
                var week = weeklyMap[weekInterval.start] ?? WeeklyUsage(weekStart: weekInterval.start)
                week.tokens.add(entry)
                week.cost += entry.costUSD
                weeklyMap[weekInterval.start] = week
            }

            // Per-project cost for the current month.
            if calendar.isDate(entry.timestamp, equalTo: now, toGranularity: .month) {
                var project = projectMap[entry.projectName] ?? ProjectCost(name: entry.projectName)
                project.cost += entry.costUSD
                project.totalTokens += entry.totalTokens
                projectMap[entry.projectName] = project
            }
        }

        let todayKey = dayFormatter.string(from: now)
        let today = dailyMap[todayKey]

        return UsageSnapshot(
            generatedAt: now,
            stats: stats,
            totalEntries: entries.count,
            blocks: blocks,
            activeBlock: activeBlock,
            daily: dailyMap.values.sorted { $0.date < $1.date },
            weekly: weeklyMap.values.sorted { $0.weekStart < $1.weekStart },
            modelBreakdown: modelMap.values.sorted { $0.cost > $1.cost },
            projectsThisMonth: projectMap.values.sorted { $0.cost > $1.cost },
            todayTokens: today?.tokens.total ?? 0,
            todayCost: today?.cost ?? 0,
            hasUnpricedModels: !unknownModels.isEmpty,
            unknownModels: unknownModels.sorted(),
            maxBlockTokens: maxBlockTokens
        )
    }
}
