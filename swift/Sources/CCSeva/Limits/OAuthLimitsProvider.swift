import Foundation

/// Fetches server-truth limit windows from Claude Code's (undocumented) OAuth
/// usage endpoint: GET https://api.anthropic.com/api/oauth/usage
///
/// Observed response shape (2026-06): a JSON object whose values are either
/// null or window objects `{ "utilization": <number>, "resets_at": <iso8601?> }`,
/// e.g. keys "five_hour", "seven_day", "seven_day_opus", "seven_day_sonnet",
/// plus a non-window "extra_usage" object. The decoder is deliberately loose:
/// any object value carrying a numeric "utilization" AND a "resets_at" key is
/// treated as a window; everything else is ignored. Utilization is treated as
/// percent (the endpoint reports percent integers) and clamped to 0...100; only
/// a strictly fractional value in (0, 1) is interpreted as a 0-1 fraction.
final class OAuthLimitsProvider: LimitsProvider {
    private static let endpoint = URL(string: "https://api.anthropic.com/api/oauth/usage")!
    private static var loggedShapeOnce = false

    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 20
        session = URLSession(configuration: config)
    }

    func fetch() async throws -> LimitsSnapshot {
        guard let token = ClaudeCredentials.accessToken() else {
            throw LimitsError.noCredentials
        }

        var request = URLRequest(url: Self.endpoint)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("oauth-2025-04-20", forHTTPHeaderField: "anthropic-beta")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("claude-cli/2.1.175 (external, cli)", forHTTPHeaderField: "User-Agent")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw LimitsError.network(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw LimitsError.badResponse("non-HTTP response")
        }
        switch http.statusCode {
        case 200: break
        case 401, 403: throw LimitsError.unauthorized
        case 429: throw LimitsError.rateLimited
        default: throw LimitsError.badStatus(http.statusCode)
        }

        return try Self.decode(data: data)
    }

    static func decode(data: Data) throws -> LimitsSnapshot {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw LimitsError.badResponse("top level is not an object")
        }

        #if DEBUG
        if !loggedShapeOnce {
            loggedShapeOnce = true
            FileHandle.standardError.write(
                Data("CCSeva limits response keys: \(object.keys.sorted())\n".utf8))
        }
        #endif

        var raw: [(key: String, utilization: Double, resetsAt: Date?)] = []
        for (key, value) in object {
            // A "window" is any object that has a numeric utilization and carries a
            // resets_at key (this excludes e.g. "extra_usage").
            guard let dict = value as? [String: Any],
                  dict.keys.contains("resets_at"),
                  let utilization = (dict["utilization"] as? NSNumber)?.doubleValue
            else { continue }
            let resetsAt = (dict["resets_at"] as? String).flatMap(ISO8601.parse)
            raw.append((key, utilization, resetsAt))
        }

        guard !raw.isEmpty else {
            throw LimitsError.badResponse("no window-like objects found")
        }

        let windows = raw
            .map { LimitWindow(
                key: $0.key,
                label: Self.label(for: $0.key),
                utilization: normalizeUtilization($0.utilization),
                resetsAt: $0.resetsAt
            ) }
            .sorted { sortRank($0.key) < sortRank($1.key) }

        return LimitsSnapshot(windows: windows, fetchedAt: Date())
    }

    /// The endpoint reports percent integers (e.g. five_hour=1 means 1%), so
    /// values are treated as percent and clamped to 0...100. A value with a
    /// nonzero fractional part that is < 1 can never be a meaningful percent
    /// reading, so only that case is interpreted as a 0-1 fraction API variant.
    private static func normalizeUtilization(_ value: Double) -> Double {
        var percent = value
        if percent < 1, percent.truncatingRemainder(dividingBy: 1) != 0 {
            percent *= 100
        }
        return min(100, max(0, percent))
    }

    private static func label(for key: String) -> String {
        switch key {
        case "five_hour": return "5-hour session"
        case "seven_day": return "Weekly (all models)"
        case "seven_day_opus": return "Weekly (Opus)"
        case "seven_day_sonnet": return "Weekly (Sonnet)"
        case "seven_day_oauth_apps": return "Weekly (OAuth apps)"
        default:
            return key.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private static func sortRank(_ key: String) -> Int {
        switch key {
        case "five_hour": return 0
        case "seven_day": return 1
        case "seven_day_opus": return 2
        case "seven_day_sonnet": return 3
        default: return 100
        }
    }
}
