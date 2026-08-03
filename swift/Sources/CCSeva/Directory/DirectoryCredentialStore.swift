import Foundation
import Security

struct DirectoryCredential: Codable, Equatable {
    let accessToken: String
    let deviceId: String
    let accountName: String?
    let accountEmail: String
}

/// Stores only the claudecode.directory device credential. Claude's own OAuth
/// credential is read by a separate component and is never copied into this item.
final class DirectoryCredentialStore {
    private let service = "com.iamshankhadeep.ccseva.directory"
    private let account = "sync"

    func load() -> DirectoryCredential? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else { return nil }
        return try? JSONDecoder().decode(DirectoryCredential.self, from: data)
    }

    @discardableResult
    func save(_ credential: DirectoryCredential) -> Bool {
        guard let data = try? JSONEncoder().encode(credential) else { return false }
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        let update = [kSecValueData as String: data]
        let status = SecItemUpdate(base as CFDictionary, update as CFDictionary)
        if status == errSecSuccess { return true }
        guard status == errSecItemNotFound else { return false }
        var add = base
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
    }

    func delete() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
