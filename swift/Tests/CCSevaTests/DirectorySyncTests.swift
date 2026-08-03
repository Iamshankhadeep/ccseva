import XCTest
@testable import CCSeva

final class DirectorySyncTests: XCTestCase {
    func testSyncBucketsAggregateByLocalDayAndModel() throws {
        let timestamp = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-08-03T10:00:00Z"))
        let entries = [
            entry(at: timestamp, model: "claude-sonnet-4", input: 10, output: 5, cacheRead: 20, project: "secret-client"),
            entry(at: timestamp.addingTimeInterval(60), model: "claude-sonnet-4", input: 3, output: 2, cacheRead: 7, project: "other-secret"),
            entry(at: timestamp, model: "claude-opus-4", input: 4, output: 1, cacheRead: 0, project: "secret-client"),
        ]

        let snapshot = Aggregator.buildSnapshot(entries: entries, stats: ScanStats(), now: timestamp)

        XCTAssertEqual(snapshot.syncBuckets.count, 2)
        let sonnet = try XCTUnwrap(snapshot.syncBuckets.first { $0.model == "claude-sonnet-4" })
        XCTAssertEqual(sonnet.harness, "claude-code")
        XCTAssertEqual(sonnet.provider, "anthropic")
        XCTAssertEqual(sonnet.tokens.input, 13)
        XCTAssertEqual(sonnet.tokens.output, 7)
        XCTAssertEqual(sonnet.tokens.cacheRead, 27)
        XCTAssertEqual(sonnet.eventCount, 2)
    }

    func testSyncBucketsDoNotExposeProjectNames() throws {
        let timestamp = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-08-03T10:00:00Z"))
        let snapshot = Aggregator.buildSnapshot(
            entries: [entry(at: timestamp, model: "claude-sonnet-4", input: 1, output: 1, cacheRead: 0, project: "private-repository")],
            stats: ScanStats(),
            now: timestamp
        )

        let mirrorLabels = Mirror(reflecting: try XCTUnwrap(snapshot.syncBuckets.first)).children.compactMap(\.label)
        XCTAssertFalse(mirrorLabels.contains("projectName"))
        XCTAssertFalse(mirrorLabels.contains("requestId"))
        XCTAssertFalse(mirrorLabels.contains("content"))
    }

    private func entry(
        at timestamp: Date,
        model: String,
        input: Int,
        output: Int,
        cacheRead: Int,
        project: String
    ) -> UsageEntry {
        UsageEntry(
            timestamp: timestamp,
            model: model,
            inputTokens: input,
            outputTokens: output,
            cacheCreationTokens: 0,
            cacheReadTokens: cacheRead,
            costUSD: 0.01,
            projectName: project,
            priced: true
        )
    }
}
