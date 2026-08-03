import Foundation

enum DirectoryIdentity {
    private static let installationKey = "ccseva.directory.installation-id"

    static var installationId: String {
        if let existing = UserDefaults.standard.string(forKey: installationKey), !existing.isEmpty {
            return existing
        }
        let value = UUID().uuidString.lowercased()
        UserDefaults.standard.set(value, forKey: installationKey)
        return value
    }

    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "2.0.0-dev"
    }

    static var deviceName: String {
        Host.current().localizedName ?? "Mac"
    }
}
