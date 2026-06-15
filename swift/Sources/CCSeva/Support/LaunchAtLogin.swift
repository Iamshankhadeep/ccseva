import Foundation
import ServiceManagement

/// Wraps the modern (macOS 13+) login-item API. Registering adds the running
/// `.app` bundle as a login item; the OS persists this, so there's nothing to
/// store in settings.json. Works for an app launched from /Applications.
@MainActor
enum LaunchAtLogin {
    /// True when the main app is currently registered as a login item.
    static var isEnabled: Bool {
        SMAppService.mainApp.status == .enabled
    }

    /// Register or unregister the app as a login item.
    /// - Returns: `true` on success, `false` if the OS rejected the change
    ///   (e.g. the app isn't in /Applications or the user disabled it in
    ///   System Settings).
    @discardableResult
    static func setEnabled(_ enabled: Bool) -> Bool {
        let service = SMAppService.mainApp
        do {
            if enabled {
                if service.status != .enabled { try service.register() }
            } else {
                if service.status == .enabled { try service.unregister() }
            }
            return true
        } catch {
            FileHandle.standardError.write(Data(
                "[CCSeva] launch-at-login \(enabled ? "register" : "unregister") failed: \(error)\n".utf8
            ))
            return false
        }
    }
}
