import Foundation
import UserNotifications

/// Threshold notifications for the 5-hour window utilization.
///
/// Behavior ported from the Electron app's NotificationService:
/// - warning at >=70%, critical at >=90%
/// - 5-minute cooldown between notifications
/// - only notifies when the status WORSENS (normal -> warning -> critical);
///   dropping back down rearms the levels.
///
/// Delivery: UNUserNotificationCenter when running from an .app bundle,
/// `osascript -e 'display notification ...'` otherwise (bare SwiftPM binaries
/// cannot use UNUserNotificationCenter).
final class Notifier {
    enum Level: Int, Comparable {
        case normal = 0
        case warning = 1
        case critical = 2

        static func < (lhs: Level, rhs: Level) -> Bool { lhs.rawValue < rhs.rawValue }
    }

    private var lastLevel: Level = .normal
    private var lastNotifiedAt: Date?
    private let cooldown: TimeInterval = 5 * 60

    private var canUseUserNotifications: Bool {
        Bundle.main.bundleIdentifier != nil && Bundle.main.bundlePath.hasSuffix(".app")
    }

    init() {
        // Request authorization up front so the first center.add doesn't race
        // the permission prompt (the first notification would be dropped).
        if canUseUserNotifications {
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        }
    }

    func evaluate(utilizationPercent: Double, isLive: Bool, now: Date = Date()) {
        let level: Level
        switch utilizationPercent {
        case 90...: level = .critical
        case 70..<90: level = .warning
        default: level = .normal
        }

        if level < lastLevel {
            // Dropping back down rearms the levels.
            lastLevel = level
            return
        }
        guard level > lastLevel else { return }
        // During cooldown, keep lastLevel unchanged so an escalation that
        // arrives now (e.g. warning -> critical) can still fire later.
        if let last = lastNotifiedAt, now.timeIntervalSince(last) < cooldown { return }
        lastNotifiedAt = now
        lastLevel = level

        let source = isLive ? "" : " (estimated)"
        let title = level == .critical ? "Claude usage critical" : "Claude usage warning"
        let body = String(
            format: "Session window at %.0f%%%@ of the 5-hour limit.",
            utilizationPercent, source
        )
        deliver(title: title, body: body)
    }

    private func deliver(title: String, body: String) {
        if canUseUserNotifications {
            let center = UNUserNotificationCenter.current()
            center.getNotificationSettings { settings in
                switch settings.authorizationStatus {
                case .authorized, .provisional:
                    let content = UNMutableNotificationContent()
                    content.title = title
                    content.body = body
                    let request = UNNotificationRequest(
                        identifier: UUID().uuidString, content: content, trigger: nil
                    )
                    center.add(request)
                default:
                    // Denied (or still undetermined): osascript still works.
                    Self.deliverViaOsascript(title: title, body: body)
                }
            }
        } else {
            Self.deliverViaOsascript(title: title, body: body)
        }
    }

    private static func deliverViaOsascript(title: String, body: String) {
        let escapedBody = body.replacingOccurrences(of: "\"", with: "\\\"")
        let escapedTitle = title.replacingOccurrences(of: "\"", with: "\\\"")
        let script = "display notification \"\(escapedBody)\" with title \"\(escapedTitle)\""
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]
        try? process.run()
    }
}
