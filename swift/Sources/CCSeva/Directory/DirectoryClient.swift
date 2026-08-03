import Foundation

struct DirectoryPairing: Decodable {
    let deviceCode: String
    let userCode: String
    let verificationUri: URL
    let verificationUriComplete: URL
    let expiresIn: Int
    let interval: Int
}

private struct DirectoryTokenResponse: Decodable {
    struct Account: Decodable {
        let name: String?
        let email: String
    }

    let accessToken: String
    let deviceId: String
    let account: Account
}

private struct DirectorySyncResponse: Decodable {
    let accepted: Int
    let syncedAt: String
}

enum DirectoryClientError: LocalizedError, Equatable {
    case authorizationPending
    case accessDenied
    case expired
    case unauthorized
    case server(String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .authorizationPending: return "Waiting for approval in your browser."
        case .accessDenied: return "The connection request was denied."
        case .expired: return "The pairing code expired. Start again."
        case .unauthorized: return "This Mac was disconnected from claudecode.directory."
        case .server(let message): return message
        case .invalidResponse: return "claudecode.directory returned an invalid response."
        }
    }
}

struct DirectoryClient {
    static let productionURL = URL(string: "https://claudecode.directory")!

    let baseURL: URL
    private let session: URLSession

    init(baseURL: URL = DirectoryClient.configuredBaseURL, session: URLSession? = nil) {
        self.baseURL = baseURL
        if let session {
            self.session = session
        } else {
            let configuration = URLSessionConfiguration.ephemeral
            configuration.timeoutIntervalForRequest = 20
            configuration.timeoutIntervalForResource = 30
            self.session = URLSession(configuration: configuration)
        }
    }

    static var configuredBaseURL: URL {
        guard let value = ProcessInfo.processInfo.environment["CCSEVA_DIRECTORY_URL"],
              let url = URL(string: value), ["http", "https"].contains(url.scheme?.lowercased() ?? "")
        else { return productionURL }
        return url
    }

    func requestPairing(installationId: String, deviceName: String, appVersion: String) async throws -> DirectoryPairing {
        let body: [String: String] = [
            "installationId": installationId,
            "deviceName": deviceName,
            "appVersion": appVersion,
        ]
        let data = try await send(path: "/api/device/code", body: body)
        guard let pairing = try? JSONDecoder().decode(DirectoryPairing.self, from: data) else {
            throw DirectoryClientError.invalidResponse
        }
        return pairing
    }

    func pollToken(deviceCode: String) async throws -> DirectoryCredential {
        let (data, response) = try await request(path: "/api/device/token", body: ["deviceCode": deviceCode])
        switch response.statusCode {
        case 200:
            guard let result = try? JSONDecoder().decode(DirectoryTokenResponse.self, from: data) else {
                throw DirectoryClientError.invalidResponse
            }
            return DirectoryCredential(
                accessToken: result.accessToken,
                deviceId: result.deviceId,
                accountName: result.account.name,
                accountEmail: result.account.email
            )
        case 403: throw DirectoryClientError.accessDenied
        case 410: throw DirectoryClientError.expired
        case 428: throw DirectoryClientError.authorizationPending
        default: throw decodeServerError(data: data, status: response.statusCode)
        }
    }

    func sync(buckets: [UsageSyncBucket], credential: DirectoryCredential, appVersion: String) async throws {
        // Keep payloads bounded for old installations with years of history.
        let chunks = buckets.isEmpty ? [[]] : stride(from: 0, to: buckets.count, by: 500).map {
            Array(buckets[$0..<min($0 + 500, buckets.count)])
        }
        for chunk in chunks {
            let payload = DirectorySyncPayload(appVersion: appVersion, buckets: chunk)
            let data = try JSONEncoder.directory.encode(payload)
            var request = URLRequest(url: endpoint("/api/sync/v1/usage"))
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(credential.accessToken)", forHTTPHeaderField: "Authorization")
            request.httpBody = data
            let (responseData, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw DirectoryClientError.invalidResponse }
            if http.statusCode == 401 { throw DirectoryClientError.unauthorized }
            guard (200..<300).contains(http.statusCode),
                  (try? JSONDecoder().decode(DirectorySyncResponse.self, from: responseData)) != nil
            else { throw decodeServerError(data: responseData, status: http.statusCode) }
        }
    }

    func disconnect(credential: DirectoryCredential) async throws {
        var request = URLRequest(url: endpoint("/api/sync/v1/device"))
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(credential.accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw DirectoryClientError.invalidResponse }
        if http.statusCode == 401 { throw DirectoryClientError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            throw decodeServerError(data: data, status: http.statusCode)
        }
    }

    private func send<T: Encodable>(path: String, body: T) async throws -> Data {
        let (data, response) = try await request(path: path, body: body)
        guard (200..<300).contains(response.statusCode) else {
            throw decodeServerError(data: data, status: response.statusCode)
        }
        return data
    }

    private func request<T: Encodable>(path: String, body: T) async throws -> (Data, HTTPURLResponse) {
        var request = URLRequest(url: endpoint(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw DirectoryClientError.invalidResponse }
        return (data, http)
    }

    private func endpoint(_ path: String) -> URL {
        URL(string: path, relativeTo: baseURL)!.absoluteURL
    }

    private func decodeServerError(data: Data, status: Int) -> DirectoryClientError {
        if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let error = object["error"] as? String {
            return .server(error)
        }
        return .server("claudecode.directory returned HTTP \(status).")
    }
}

private struct DirectorySyncPayload: Encodable {
    let schemaVersion = 1
    let generatedAt = Date()
    let appVersion: String
    let buckets: [Bucket]

    init(appVersion: String, buckets: [UsageSyncBucket]) {
        self.appVersion = appVersion
        self.buckets = buckets.map(Bucket.init)
    }

    struct Bucket: Encodable {
        let bucketStart: Date
        let localDate: String
        let timezone: String
        let harness: String
        let provider: String
        let model: String
        let inputTokens: Int
        let outputTokens: Int
        let cacheCreationTokens: Int
        let cacheReadTokens: Int
        let estimatedCostMicros: Int64
        let eventCount: Int

        init(_ bucket: UsageSyncBucket) {
            bucketStart = bucket.bucketStart
            localDate = bucket.localDate
            timezone = bucket.timezone
            harness = bucket.harness
            provider = bucket.provider
            model = bucket.model
            inputTokens = bucket.tokens.input
            outputTokens = bucket.tokens.output
            cacheCreationTokens = bucket.tokens.cacheCreation
            cacheReadTokens = bucket.tokens.cacheRead
            estimatedCostMicros = bucket.estimatedCostMicros
            eventCount = bucket.eventCount
        }
    }
}

private extension JSONEncoder {
    static var directory: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}
