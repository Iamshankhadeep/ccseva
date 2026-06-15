import Foundation

/// User preferences, persisted to ~/.ccseva/settings.json in the exact format the
/// Electron app uses, so both apps can share the file. Unknown JSON keys are
/// preserved on save.
struct AppSettings: Equatable {
    enum Plan: String, CaseIterable, Identifiable {
        case auto
        case pro = "Pro"
        case max5 = "Max5"
        case max20 = "Max20"
        case custom = "Custom"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .auto: return "Auto-detect"
            case .pro: return "Pro (7k tokens)"
            case .max5: return "Max5 (35k tokens)"
            case .max20: return "Max20 (140k tokens)"
            case .custom: return "Custom"
            }
        }
    }

    enum MenuBarDisplayMode: String, CaseIterable, Identifiable {
        case percentage, cost, alternate
        var id: String { rawValue }
    }

    enum CostSource: String, CaseIterable, Identifiable {
        case today
        case sessionWindow
        var id: String { rawValue }
    }

    var timezone: String = TimeZone.current.identifier
    var resetHour: Int = 0
    var plan: Plan = .auto
    var customTokenLimit: Int?
    var menuBarDisplayMode: MenuBarDisplayMode = .alternate
    var menuBarCostSource: CostSource = .today
    /// Fallback polling interval (seconds). CCSeva-Swift extension key.
    var refreshIntervalSeconds: Int = 60

    /// Token limit used ONLY for the local-estimation fallback when the server
    /// limits endpoint is unavailable. `observedMaxBlockTokens` drives auto-detect.
    func tokenLimit(observedMaxBlockTokens: Int) -> Int {
        switch plan {
        case .pro: return 7_000
        case .max5: return 35_000
        case .max20: return 140_000
        case .custom: return max(customTokenLimit ?? 7_000, 1)
        case .auto:
            let observed = observedMaxBlockTokens
            if observed <= 7_000 { return 7_000 }
            if observed <= 35_000 { return 35_000 }
            if observed <= 140_000 { return 140_000 }
            return observed
        }
    }
}

/// Load/save with unknown-key preservation: the file is read as a raw dictionary,
/// known fields are extracted, and saves merge the known fields back into the raw
/// dictionary before writing.
final class SettingsManager {
    static let shared = SettingsManager()

    let settingsURL: URL
    private var rawDictionary: [String: Any] = [:]

    init() {
        let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".ccseva")
        settingsURL = dir.appendingPathComponent("settings.json")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    func load() -> AppSettings {
        var settings = AppSettings()
        guard let data = try? Data(contentsOf: settingsURL),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return settings }
        rawDictionary = object

        if let tz = object["timezone"] as? String { settings.timezone = tz }
        if let hour = (object["resetHour"] as? NSNumber)?.intValue { settings.resetHour = hour }
        if let planString = object["plan"] as? String {
            settings.plan = AppSettings.Plan.allCases.first {
                $0.rawValue.lowercased() == planString.lowercased()
            } ?? .auto
        }
        if let limit = (object["customTokenLimit"] as? NSNumber)?.intValue, limit > 0 {
            settings.customTokenLimit = limit
        }
        if let mode = object["menuBarDisplayMode"] as? String,
           let parsed = AppSettings.MenuBarDisplayMode(rawValue: mode) {
            settings.menuBarDisplayMode = parsed
        }
        if let source = object["menuBarCostSource"] as? String,
           let parsed = AppSettings.CostSource(rawValue: source) {
            settings.menuBarCostSource = parsed
        }
        if let interval = (object["refreshIntervalSeconds"] as? NSNumber)?.intValue, interval >= 10 {
            settings.refreshIntervalSeconds = interval
        }
        return settings
    }

    func save(_ settings: AppSettings) {
        // Re-read the file first so keys edited externally since launch (e.g. by
        // the Electron app sharing this file) aren't clobbered by a stale
        // snapshot; read errors are ignored and the in-memory dictionary kept.
        if let data = try? Data(contentsOf: settingsURL),
           let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            rawDictionary = object
        }

        rawDictionary["timezone"] = settings.timezone
        rawDictionary["resetHour"] = settings.resetHour
        rawDictionary["plan"] = settings.plan.rawValue
        if let limit = settings.customTokenLimit {
            rawDictionary["customTokenLimit"] = limit
        } else {
            rawDictionary.removeValue(forKey: "customTokenLimit")
        }
        rawDictionary["menuBarDisplayMode"] = settings.menuBarDisplayMode.rawValue
        rawDictionary["menuBarCostSource"] = settings.menuBarCostSource.rawValue
        rawDictionary["refreshIntervalSeconds"] = settings.refreshIntervalSeconds

        guard let data = try? JSONSerialization.data(
            withJSONObject: rawDictionary, options: [.prettyPrinted, .sortedKeys]
        ) else { return }
        try? data.write(to: settingsURL, options: .atomic)
    }
}
