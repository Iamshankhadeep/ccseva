import Foundation

/// One server-side rate-limit window (e.g. the 5-hour session window).
struct LimitWindow: Identifiable {
    /// Raw key from the API response, e.g. "five_hour", "seven_day", "seven_day_opus".
    let key: String
    let label: String
    /// Percent, 0...100.
    let utilization: Double
    let resetsAt: Date?

    var id: String { key }
}

struct LimitsSnapshot {
    let windows: [LimitWindow]
    let fetchedAt: Date

    func window(key: String) -> LimitWindow? {
        windows.first { $0.key == key }
    }

    var fiveHour: LimitWindow? { window(key: "five_hour") }
    var sevenDay: LimitWindow? { window(key: "seven_day") }

    /// The most relevant model-specific weekly window, when present.
    var modelSpecificWeekly: LimitWindow? {
        for key in ["seven_day_opus", "seven_day_sonnet"] {
            if let w = window(key: key), w.utilization > 0 || w.resetsAt != nil {
                return w
            }
        }
        return nil
    }
}

enum LimitsError: Error, CustomStringConvertible {
    case noCredentials
    case unauthorized
    case rateLimited
    case badStatus(Int)
    case badResponse(String)
    case network(String)

    var description: String {
        switch self {
        case .noCredentials: return "no Claude Code credentials found"
        case .unauthorized: return "unauthorized (401) — token expired?"
        case .rateLimited: return "rate limited (429)"
        case .badStatus(let code): return "unexpected HTTP status \(code)"
        case .badResponse(let detail): return "unexpected response shape: \(detail)"
        case .network(let detail): return "network error: \(detail)"
        }
    }
}

/// Abstraction so the UI/store never talks to the network directly and a local
/// estimator can stand in when the endpoint is unavailable.
protocol LimitsProvider {
    func fetch() async throws -> LimitsSnapshot
}
