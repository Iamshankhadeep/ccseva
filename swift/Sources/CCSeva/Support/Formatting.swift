import Foundation

/// Tolerant ISO8601 parsing. Claude Code transcripts use millisecond fractions
/// ("2026-06-12T20:44:08.787Z"); the OAuth usage endpoint uses microseconds with a
/// numeric offset ("2026-06-13T06:09:59.103222+00:00").
enum ISO8601 {
    static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func parse(_ string: String) -> Date? {
        if let d = fractional.date(from: string) { return d }
        if let d = plain.date(from: string) { return d }
        // Trim over-long fractional seconds (e.g. microseconds) down to milliseconds.
        if let dotIndex = string.firstIndex(of: ".") {
            let afterDot = string.index(after: dotIndex)
            var digitsEnd = afterDot
            while digitsEnd < string.endIndex, string[digitsEnd].isNumber {
                digitsEnd = string.index(after: digitsEnd)
            }
            let digits = string[afterDot..<digitsEnd]
            if digits.count > 3 {
                let trimmed = string[..<afterDot] + digits.prefix(3) + string[digitsEnd...]
                return fractional.date(from: String(trimmed)) ?? plain.date(from: String(trimmed))
            }
        }
        return nil
    }
}

enum Format {
    /// "1.24M", "35.2k", "412"
    static func tokens(_ count: Int) -> String {
        let n = Double(count)
        switch abs(n) {
        case 1_000_000...: return String(format: "%.2fM", n / 1_000_000)
        case 10_000...: return String(format: "%.1fk", n / 1_000)
        case 1_000...: return String(format: "%.2fk", n / 1_000)
        default: return "\(count)"
        }
    }

    static func cost(_ usd: Double) -> String {
        if usd >= 100 { return String(format: "$%.0f", usd) }
        return String(format: "$%.2f", usd)
    }

    /// "2h 14m" / "34m"
    static func duration(_ interval: TimeInterval) -> String {
        let minutes = max(0, Int(interval / 60))
        let h = minutes / 60
        let m = minutes % 60
        if h > 0 { return "\(h)h \(m)m" }
        return "\(m)m"
    }

    static func time(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: date)
    }

    static func shortModelName(_ model: String) -> String {
        var name = model
        if let range = name.range(of: "claude-") {
            name = String(name[range.upperBound...])
        }
        // Drop trailing date stamps like -20251001.
        if let match = name.range(of: #"-20\d{6}$"#, options: .regularExpression) {
            name.removeSubrange(match)
        }
        return name
    }
}
