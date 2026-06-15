import Foundation

/// Reads the Claude Code OAuth access token.
///
/// Primary source: the macOS Keychain generic password item named
/// "Claude Code-credentials" (read via /usr/bin/security so no entitlement is
/// needed). Fallback: ~/.claude/.credentials.json with the same JSON shape:
/// { "claudeAiOauth": { "accessToken": "...", ... } }
///
/// The `security` call can block indefinitely on a keychain authorization
/// prompt, so it runs with a hard timeout, and a failed/denied read is cached
/// negatively for a while so the user isn't re-prompted on every poll.
enum ClaudeCredentials {
    private static let keychainTimeout: TimeInterval = 10
    private static let negativeCacheInterval: TimeInterval = 30 * 60
    private static let lock = NSLock()
    private static var keychainNegativeUntil = Date.distantPast

    static func accessToken() -> String? {
        if let token = fromKeychain() { return token }
        return fromFile()
    }

    private static func fromKeychain() -> String? {
        lock.lock()
        let blocked = Date() < keychainNegativeUntil
        lock.unlock()
        if blocked { return nil }

        guard let data = runSecurityTool(),
              let token = parseToken(from: data)
        else {
            lock.lock()
            keychainNegativeUntil = Date().addingTimeInterval(negativeCacheInterval)
            lock.unlock()
            return nil
        }
        return token
    }

    /// Runs `security find-generic-password -w` with a hard timeout, killing the
    /// process if the keychain authorization prompt keeps it blocked. stdout is
    /// drained on a separate queue so a full pipe cannot deadlock the child.
    private static func runSecurityTool() -> Data? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/security")
        process.arguments = ["find-generic-password", "-s", "Claude Code-credentials", "-w"]
        let stdout = Pipe()
        process.standardOutput = stdout
        process.standardError = FileHandle.nullDevice

        let exited = DispatchSemaphore(value: 0)
        process.terminationHandler = { _ in exited.signal() }

        var collected = Data()
        let readDone = DispatchSemaphore(value: 0)
        DispatchQueue.global(qos: .utility).async {
            collected = stdout.fileHandleForReading.readDataToEndOfFile()
            readDone.signal()
        }

        do {
            try process.run()
        } catch {
            return nil
        }

        if exited.wait(timeout: .now() + keychainTimeout) == .timedOut {
            process.terminate()
            if exited.wait(timeout: .now() + 1) == .timedOut {
                kill(process.processIdentifier, SIGKILL)
            }
            return nil
        }
        // The child has exited, so EOF is imminent; bound the wait anyway.
        guard readDone.wait(timeout: .now() + 2) == .success,
              process.terminationStatus == 0
        else { return nil }
        return collected
    }

    private static func fromFile() -> String? {
        let url = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/.credentials.json")
        guard let data = try? Data(contentsOf: url) else { return nil }
        return parseToken(from: data)
    }

    private static func parseToken(from data: Data) -> String? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let oauth = object["claudeAiOauth"] as? [String: Any],
              let token = oauth["accessToken"] as? String,
              !token.isEmpty
        else { return nil }
        return token
    }
}
