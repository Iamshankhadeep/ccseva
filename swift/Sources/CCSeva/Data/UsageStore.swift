import AppKit
import Combine
import Foundation

/// How the limit gauges are currently sourced.
enum LimitsState: Equatable {
    /// Server data from the OAuth usage endpoint.
    case live
    /// Local estimation (active block tokens vs configured plan limit).
    case estimated(reason: String)

    var isLive: Bool { self == .live }
}

/// Single source of truth for the app. Owns the scanner actor, the FSEvents
/// watcher, the fallback/limits timers and all derived UI state.
@MainActor
final class UsageStore: ObservableObject {
    @Published private(set) var snapshot: UsageSnapshot?
    @Published private(set) var limits: LimitsSnapshot?
    @Published private(set) var limitsState: LimitsState = .estimated(reason: "not fetched yet")
    @Published private(set) var menuBarTitle: String = "--"
    @Published private(set) var isRefreshing = false
    @Published private(set) var lastRefreshAt: Date?
    @Published private(set) var settings: AppSettings

    private let dataSource = UsageDataSource()
    private let limitsProvider: LimitsProvider
    private let notifier = Notifier()
    private let settingsManager = SettingsManager.shared

    private var watcher: FileWatcher?
    private var fallbackTimer: Timer?
    private var limitsTimer: Timer?
    private var alternateTimer: Timer?
    private var alternateShowsCost = false

    private var usageTaskRunning = false
    private var limitsTaskRunning = false
    private var limitsBackoffUntil = Date.distantPast

    /// Last two five-hour utilization readings, used for the slope-based
    /// "you'll hit the limit at HH:mm" prediction.
    private var fiveHourHistory: [(at: Date, utilization: Double)] = []

    init(limitsProvider: LimitsProvider = OAuthLimitsProvider()) {
        self.limitsProvider = limitsProvider
        self.settings = settingsManager.load()
    }

    // MARK: - Lifecycle

    func start() {
        refreshUsage()
        refreshLimits(force: true)

        let roots = UsageDataSource.discoverRoots().map(\.path)
        if !roots.isEmpty {
            let watcher = FileWatcher(paths: roots, debounce: 3.0) { [weak self] in
                Task { @MainActor [weak self] in
                    self?.fileActivityDetected()
                }
            }
            watcher.start()
            self.watcher = watcher
        }
        rescheduleTimers()
    }

    func stop() {
        watcher?.stop()
        fallbackTimer?.invalidate()
        limitsTimer?.invalidate()
        alternateTimer?.invalidate()
    }

    private func rescheduleTimers() {
        fallbackTimer?.invalidate()
        let interval = TimeInterval(max(settings.refreshIntervalSeconds, 10))
        fallbackTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.refreshUsage() }
        }

        limitsTimer?.invalidate()
        limitsTimer = Timer.scheduledTimer(withTimeInterval: 120, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.refreshLimits() }
        }

        alternateTimer?.invalidate()
        if settings.menuBarDisplayMode == .alternate {
            alternateTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    self.alternateShowsCost.toggle()
                    self.updateMenuBarTitle()
                }
            }
        }
    }

    private func fileActivityDetected() {
        refreshUsage()
        // Server-side usage likely moved too; refresh limits if the cache is stale-ish.
        if let fetched = limits?.fetchedAt, Date().timeIntervalSince(fetched) > 30 {
            refreshLimits()
        } else if limits == nil {
            refreshLimits()
        }
    }

    // MARK: - Refresh

    func refreshUsage() {
        guard !usageTaskRunning else { return }
        usageTaskRunning = true
        isRefreshing = true
        Task {
            let snap = await dataSource.scan()
            self.snapshot = snap
            self.lastRefreshAt = Date()
            self.usageTaskRunning = false
            self.isRefreshing = false
            self.didUpdate()
        }
    }

    func refreshLimits(force: Bool = false) {
        guard !limitsTaskRunning else { return }
        let now = Date()
        if !force {
            if now < limitsBackoffUntil { return }
            if let fetched = limits?.fetchedAt, now.timeIntervalSince(fetched) < 110 { return }
        }
        limitsTaskRunning = true
        Task {
            do {
                let snap = try await limitsProvider.fetch()
                self.limits = snap
                self.limitsState = .live
                self.limitsBackoffUntil = .distantPast
                if let fiveHour = snap.fiveHour {
                    self.fiveHourHistory.append((snap.fetchedAt, fiveHour.utilization))
                    if self.fiveHourHistory.count > 2 {
                        self.fiveHourHistory.removeFirst(self.fiveHourHistory.count - 2)
                    }
                }
            } catch let error as LimitsError {
                self.limitsState = .estimated(reason: error.description)
                switch error {
                case .unauthorized: self.limitsBackoffUntil = Date().addingTimeInterval(15 * 60)
                case .rateLimited: self.limitsBackoffUntil = Date().addingTimeInterval(10 * 60)
                case .noCredentials: self.limitsBackoffUntil = Date().addingTimeInterval(10 * 60)
                default: self.limitsBackoffUntil = Date().addingTimeInterval(5 * 60)
                }
            } catch {
                self.limitsState = .estimated(reason: error.localizedDescription)
                self.limitsBackoffUntil = Date().addingTimeInterval(5 * 60)
            }
            self.limitsTaskRunning = false
            self.didUpdate()
        }
    }

    func manualRefresh() {
        refreshUsage()
        refreshLimits(force: true)
    }

    private func didUpdate() {
        updateMenuBarTitle()
        if let (utilization, isLive) = fiveHourUtilization() {
            notifier.evaluate(utilizationPercent: utilization, isLive: isLive)
        }
    }

    // MARK: - Settings

    func updateSettings(_ newSettings: AppSettings) {
        guard newSettings != settings else { return }
        settings = newSettings
        settingsManager.save(newSettings)
        rescheduleTimers()
        updateMenuBarTitle()
    }

    var settingsFilePath: String { settingsManager.settingsURL.path }

    // MARK: - Derived values

    /// Effective plan token limit for local estimation.
    var localTokenLimit: Int {
        settings.tokenLimit(observedMaxBlockTokens: snapshot?.maxBlockTokens ?? 0)
    }

    /// Five-hour window utilization in percent: server-truth when available,
    /// otherwise estimated from the active block vs the plan token limit.
    func fiveHourUtilization() -> (value: Double, isLive: Bool)? {
        if limitsState.isLive, let window = limits?.fiveHour {
            return (window.utilization, true)
        }
        guard let snap = snapshot else { return nil }
        guard let block = snap.activeBlock else { return (0, false) }
        let limit = max(localTokenLimit, 1)
        return (min(100, Double(block.totalTokens) / Double(limit) * 100), false)
    }

    /// Local estimation gauge fallback when server data is missing.
    var estimatedFiveHourWindow: LimitWindow? {
        guard let snap = snapshot else { return nil }
        guard let block = snap.activeBlock else {
            return LimitWindow(key: "five_hour", label: "5-hour session", utilization: 0, resetsAt: nil)
        }
        let limit = max(localTokenLimit, 1)
        return LimitWindow(
            key: "five_hour",
            label: "5-hour session",
            utilization: min(100, Double(block.totalTokens) / Double(limit) * 100),
            resetsAt: block.endTime
        )
    }

    /// "At current pace you'll hit the session limit at HH:mm" when the
    /// projection crosses 100% before the window resets; otherwise an
    /// "on pace" message. Nil when there is no signal at all.
    var sessionPrediction: String? {
        let now = Date()

        // Preferred: slope of the last two server utilization readings.
        if limitsState.isLive, let window = limits?.fiveHour, let resetsAt = window.resetsAt {
            if fiveHourHistory.count == 2 {
                let (t0, u0) = fiveHourHistory[0]
                let (t1, u1) = fiveHourHistory[1]
                let minutes = t1.timeIntervalSince(t0) / 60
                if minutes > 0.5, u1 > u0 {
                    let slope = (u1 - u0) / minutes // % per minute
                    let minutesTo100 = (100 - window.utilization) / slope
                    let hitAt = now.addingTimeInterval(minutesTo100 * 60)
                    if hitAt < resetsAt {
                        return "At current pace you'll hit the session limit at \(Format.time(hitAt))"
                    }
                }
            }
            return window.utilization >= 100 ? "Session limit reached" : "On pace until reset"
        }

        // Fallback: local burn rate vs configured/auto-detected token limit.
        guard let block = snapshot?.activeBlock, let rate = block.burnRate,
              rate.tokensPerMinute > 0
        else { return nil }
        let limit = localTokenLimit
        let remainingTokens = Double(limit - block.totalTokens)
        if remainingTokens <= 0 { return "Estimated session limit reached" }
        let minutesToLimit = remainingTokens / rate.tokensPerMinute
        let hitAt = now.addingTimeInterval(minutesToLimit * 60)
        if hitAt < block.endTime {
            return "At current pace you'll hit the session limit at \(Format.time(hitAt)) (estimated)"
        }
        return "On pace until reset (estimated)"
    }

    // MARK: - Menu bar

    private func updateMenuBarTitle() {
        menuBarTitle = computeMenuBarTitle()
    }

    private func computeMenuBarTitle() -> String {
        switch settings.menuBarDisplayMode {
        case .percentage:
            return percentageTitle()
        case .cost:
            return costTitle()
        case .alternate:
            return alternateShowsCost ? costTitle() : percentageTitle()
        }
    }

    private func percentageTitle() -> String {
        guard let (value, _) = fiveHourUtilization() else { return "--" }
        let warning = value >= 90 ? " ⚠" : ""
        return "\(Int(value.rounded()))%\(warning)"
    }

    private func costTitle() -> String {
        guard let snap = snapshot else { return "--" }
        let cost: Double
        switch settings.menuBarCostSource {
        case .today: cost = snap.todayCost
        case .sessionWindow: cost = snap.activeBlock?.costUSD ?? 0
        }
        return String(format: "$%.2f", cost)
    }
}

// MARK: - UI-facing derived values
//
// Purely additive helpers consumed by the SwiftUI layer. The data layer above
// is the source of truth; these only reshape it for presentation.
extension UsageStore {
    /// Local token-usage percentage of the active block vs the plan limit.
    var localTokenPercentage: Double {
        guard let block = snapshot?.activeBlock else { return 0 }
        let limit = max(localTokenLimit, 1)
        return min(100, Double(block.totalTokens) / Double(limit) * 100)
    }

    var tokenStatus: UsageStatus { UsageStatus(percentage: localTokenPercentage) }

    /// Tokens used in the current active block (0 when idle).
    var activeBlockTokens: Int { snapshot?.activeBlock?.totalTokens ?? 0 }

    /// Tokens remaining in the active block before hitting the plan limit.
    var tokensRemaining: Int { max(0, localTokenLimit - activeBlockTokens) }

    /// Fraction (0...1) of the current 5-hour block that has elapsed.
    var sessionElapsedFraction: Double {
        guard let block = snapshot?.activeBlock else { return 0 }
        let elapsed = Date().timeIntervalSince(block.startTime)
        return min(1, max(0, elapsed / Aggregator.sessionDuration))
    }

    /// "Xh Ym left" for the active block, or nil when idle.
    var sessionTimeLeft: String? {
        guard let block = snapshot?.activeBlock else { return nil }
        let remaining = block.endTime.timeIntervalSinceNow
        guard remaining > 0 else { return "resetting…" }
        return Format.duration(remaining)
    }

    /// Human label for the effective plan.
    var planDisplayName: String {
        switch settings.plan {
        case .auto:
            let limit = localTokenLimit
            if limit <= 7_000 { return "Pro" }
            if limit <= 35_000 { return "Max5" }
            if limit <= 140_000 { return "Max20" }
            return "Custom"
        case .pro: return "Pro"
        case .max5: return "Max5"
        case .max20: return "Max20"
        case .custom: return "Custom"
        }
    }

    /// Burn rate in tokens/hour for the active block (0 when idle).
    var burnRatePerHour: Int {
        guard let rate = snapshot?.activeBlock?.burnRate else { return 0 }
        return Int(rate.tokensPerMinute * 60)
    }

    /// Today's distinct model count.
    var todayModelCount: Int {
        guard let snap = snapshot else { return 0 }
        let key = todayKeyFormatter.string(from: Date())
        return snap.daily.first { $0.dateKey == key }?.modelCosts.count ?? 0
    }

    /// This-week (last 7 days) totals from the daily rollup.
    var weekTotals: (cost: Double, tokens: Int) {
        guard let snap = snapshot else { return (0, 0) }
        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        let recent = snap.daily.filter { $0.date >= cutoff }
        return (recent.reduce(0) { $0 + $1.cost }, recent.reduce(0) { $0 + $1.tokens.total })
    }

    /// Per-model usage for the dashboard "Model Usage" card. The retained snapshot
    /// does not keep raw entries, so this uses the 30-day model breakdown as the
    /// closest available distribution (today-only per-model tokens are not stored).
    var dashboardModelUsage: [ModelUsage] {
        Array((snapshot?.modelBreakdown ?? []).prefix(5))
    }

    private var todayKeyFormatter: DateFormatter {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }
}
