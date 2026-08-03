import Foundation
import XCTest
@testable import CCSeva

final class DirectoryClientTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testPairingRequestAndResponse() async throws {
        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.url?.path, "/api/device/code")
            XCTAssertEqual(request.httpMethod, "POST")
            let body = try Self.requestBody(request)
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: String])
            XCTAssertEqual(json["installationId"], "install-123")
            return Self.response(
                request,
                status: 200,
                json: #"{"deviceCode":"secret","userCode":"ABCD-EFGH","verificationUri":"https://claudecode.directory/device","verificationUriComplete":"https://claudecode.directory/device?user_code=ABCD-EFGH","expiresIn":600,"interval":5}"#
            )
        }

        let pairing = try await client().requestPairing(
            installationId: "install-123",
            deviceName: "Test Mac",
            appVersion: "2.0.0"
        )
        XCTAssertEqual(pairing.userCode, "ABCD-EFGH")
        XCTAssertEqual(pairing.interval, 5)
    }

    func testPendingAuthorizationIsTyped() async throws {
        MockURLProtocol.requestHandler = { request in
            Self.response(request, status: 428, json: #"{"error":"authorization_pending"}"#)
        }

        do {
            _ = try await client().pollToken(deviceCode: String(repeating: "x", count: 40))
            XCTFail("Expected authorizationPending")
        } catch let error as DirectoryClientError {
            XCTAssertEqual(error, .authorizationPending)
        }
    }

    func testSyncUsesBearerAndContainsOnlyAggregateFields() async throws {
        var bucket = UsageSyncBucket(
            bucketStart: Date(timeIntervalSince1970: 1_775_000_000),
            localDate: "2026-04-01",
            timezone: "Asia/Kolkata",
            harness: "claude-code",
            provider: "anthropic",
            model: "claude-sonnet-4"
        )
        bucket.tokens = TokenCounts(input: 10, output: 2, cacheCreation: 3, cacheRead: 40)
        bucket.estimatedCostMicros = 1234
        bucket.eventCount = 2

        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.url?.path, "/api/sync/v1/usage")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer ccseva_test")
            let body = try Self.requestBody(request)
            let text = try XCTUnwrap(String(data: body, encoding: .utf8))
            XCTAssertTrue(text.contains("claude-sonnet-4"))
            XCTAssertTrue(text.contains("cacheReadTokens"))
            XCTAssertFalse(text.contains("project"))
            XCTAssertFalse(text.contains("prompt"))
            XCTAssertFalse(text.contains("content"))
            return Self.response(request, status: 200, json: #"{"accepted":1,"syncedAt":"2026-08-03T12:00:00Z"}"#)
        }

        let credential = DirectoryCredential(
            accessToken: "ccseva_test",
            deviceId: "device-1",
            accountName: "Test",
            accountEmail: "test@example.com"
        )
        try await client().sync(buckets: [bucket], credential: credential, appVersion: "2.0.0")
    }

    private func client() -> DirectoryClient {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        return DirectoryClient(
            baseURL: URL(string: "https://claudecode.directory")!,
            session: URLSession(configuration: configuration)
        )
    }

    private static func response(
        _ request: URLRequest,
        status: Int,
        json: String
    ) -> (HTTPURLResponse, Data) {
        (
            HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!,
            Data(json.utf8)
        )
    }

    private static func requestBody(_ request: URLRequest) throws -> Data {
        if let body = request.httpBody { return body }
        let stream = try XCTUnwrap(request.httpBodyStream)
        stream.open()
        defer { stream.close() }
        var result = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let count = stream.read(&buffer, maxLength: buffer.count)
            if count < 0 { throw try XCTUnwrap(stream.streamError) }
            if count == 0 { break }
            result.append(buffer, count: count)
        }
        return result
    }
}

private final class MockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.requestHandler else {
            client?.urlProtocol(self, didFailWithError: DirectoryClientError.invalidResponse)
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
