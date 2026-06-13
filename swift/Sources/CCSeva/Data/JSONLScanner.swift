import Foundation

/// Scans Claude Code JSONL transcripts under the configured roots and produces
/// `UsageSnapshot`s. Runs off the main actor; all state is actor-isolated.
///
/// Performance strategy:
/// - Only the bytes appended since the last scan are read (FileHandle seek+read;
///   no memory mapping, which could SIGBUS on a concurrent truncation) and split
///   on newline bytes.
/// - A cheap byte-level prefilter (`"type":"assistant"`) skips most lines before
///   any JSON decoding happens.
/// - Incremental cache: per-file (identity, mtime, size, byte offset). Transcripts
///   are append-only, so on re-scan only the appended bytes are parsed. If a file
///   shrank or was replaced (different file identity) it is re-parsed from
///   scratch. Unchanged files reuse cached entries.
actor UsageDataSource {
    private struct PendingEntry {
        let dedupKey: String
        let entry: UsageEntry
    }

    private struct FileState {
        /// Filesystem identity (fileResourceIdentifier) used to detect rotation:
        /// a same-named file replacing the original must be re-parsed from 0.
        var identity: NSObject?
        var mtime: TimeInterval
        var size: UInt64
        /// Byte offset just past the last fully-consumed newline.
        var offset: Int
        var entries: [PendingEntry]
    }

    private var files: [String: FileState] = [:]
    private static let assistantNeedle = Array("\"type\":\"assistant\"".utf8)

    // MARK: - Roots

    /// Data roots: `$CLAUDE_CONFIG_DIR` (comma-separated) plus `~/.claude` and
    /// `~/.config/claude` when they exist. Each root's `projects` dir is scanned.
    nonisolated static func discoverRoots() -> [URL] {
        let fm = FileManager.default
        var candidates: [URL] = []
        let env = ProcessInfo.processInfo.environment["CLAUDE_CONFIG_DIR"] ?? ""
        for part in env.split(separator: ",") {
            let trimmed = part.trimmingCharacters(in: .whitespaces)
            if !trimmed.isEmpty { candidates.append(URL(fileURLWithPath: trimmed)) }
        }
        let home = fm.homeDirectoryForCurrentUser
        candidates.append(home.appendingPathComponent(".claude"))
        candidates.append(home.appendingPathComponent(".config/claude"))

        var seen = Set<String>()
        var roots: [URL] = []
        for candidate in candidates {
            let projects = candidate.appendingPathComponent("projects")
            var isDir: ObjCBool = false
            guard fm.fileExists(atPath: projects.path, isDirectory: &isDir), isDir.boolValue,
                  seen.insert(projects.path).inserted
            else { continue }
            roots.append(projects)
        }
        return roots
    }

    // MARK: - Scan

    /// Full scan + aggregation pass. Cheap when nothing changed on disk.
    func scan(now: Date = Date()) -> UsageSnapshot {
        let started = Date()
        var stats = ScanStats()
        let fm = FileManager.default
        var livePaths = Set<String>()

        for root in Self.discoverRoots() {
            let keys: [URLResourceKey] = [
                .contentModificationDateKey, .fileSizeKey, .isRegularFileKey,
                .fileResourceIdentifierKey,
            ]
            guard let enumerator = fm.enumerator(
                at: root, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles]
            ) else { continue }

            for case let url as URL in enumerator {
                guard url.pathExtension == "jsonl" else { continue }
                guard let values = try? url.resourceValues(forKeys: Set(keys)),
                      values.isRegularFile == true
                else { continue }
                let path = url.path
                livePaths.insert(path)
                stats.filesSeen += 1

                let size = UInt64(values.fileSize ?? 0)
                let mtime = values.contentModificationDate?.timeIntervalSince1970 ?? 0
                let identity = values.fileResourceIdentifier as? NSObject

                if let state = files[path], state.size == size, state.mtime == mtime,
                   Self.identitiesEqual(state.identity, identity) {
                    continue // unchanged; cached entries remain valid
                }

                var state = files[path]
                    ?? FileState(identity: identity, mtime: 0, size: 0, offset: 0, entries: [])
                if !Self.identitiesEqual(state.identity, identity) || size < UInt64(state.offset) {
                    // File replaced (rotation) or shrank (rewritten): full re-parse.
                    state = FileState(identity: identity, mtime: 0, size: 0, offset: 0, entries: [])
                }
                guard let appended = Self.readAppendedBytes(url: url, from: state.offset) else {
                    continue
                }
                let (parsed, consumed) = Self.parseEntries(in: appended, from: 0)
                state.entries.append(contentsOf: parsed)
                state.offset += consumed
                state.size = size
                state.mtime = mtime
                state.identity = identity
                files[path] = state
                stats.filesParsed += 1
            }
        }

        // Drop cache entries for deleted files.
        for path in files.keys where !livePaths.contains(path) {
            files.removeValue(forKey: path)
        }

        // Global dedupe (streaming writes duplicate assistant rows): keep first seen,
        // iterating files in stable path order.
        var seenKeys = Set<String>()
        var entries: [UsageEntry] = []
        for path in files.keys.sorted() {
            guard let state = files[path] else { continue }
            for pending in state.entries {
                stats.rawUsageLines += 1
                if seenKeys.insert(pending.dedupKey).inserted {
                    entries.append(pending.entry)
                } else {
                    stats.duplicatesSkipped += 1
                }
            }
        }
        entries.sort { $0.timestamp < $1.timestamp }
        stats.scanDuration = Date().timeIntervalSince(started)

        return Aggregator.buildSnapshot(entries: entries, stats: stats, now: now)
    }

    // MARK: - File reading

    private static func identitiesEqual(_ a: NSObject?, _ b: NSObject?) -> Bool {
        switch (a, b) {
        case (nil, nil): return true
        case let (a?, b?): return a.isEqual(b)
        default: return false
        }
    }

    /// Reads bytes from `offset` to EOF with a plain (non-mapped) read: a mapped
    /// file can SIGBUS if truncated concurrently, and seeking avoids re-reading
    /// the already-parsed prefix of large transcripts.
    private static func readAppendedBytes(url: URL, from offset: Int) -> Data? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        do {
            try handle.seek(toOffset: UInt64(offset))
            return try handle.readToEnd() ?? Data()
        } catch {
            return nil
        }
    }

    // MARK: - Line parsing

    private struct RawLine: Decodable {
        let type: String?
        let timestamp: String?
        let requestId: String?
        let costUSD: Double?
        let isApiErrorMessage: Bool?
        let cwd: String?
        let message: RawMessage?

        struct RawMessage: Decodable {
            let id: String?
            let model: String?
            let usage: RawUsage?
        }

        struct RawUsage: Decodable {
            let input_tokens: Int?
            let output_tokens: Int?
            let cache_creation_input_tokens: Int?
            let cache_read_input_tokens: Int?
        }
    }

    /// Parses complete lines in `data` starting at byte `from`. Returns parsed entries
    /// and the offset just past the last newline (a partial trailing line is left for
    /// the next scan).
    private static func parseEntries(in data: Data, from start: Int) -> ([PendingEntry], consumed: Int) {
        guard start < data.count else { return ([], start) }

        // Pass 1: collect ranges of candidate lines (containing the assistant marker).
        var candidates: [Range<Int>] = []
        var consumed = start
        data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            guard let base = raw.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
            let count = data.count
            var lineStart = start
            var i = start
            while i < count {
                if base[i] == 0x0A { // '\n'
                    if i > lineStart, lineContains(base, lineStart..<i, needle: assistantNeedle) {
                        candidates.append(lineStart..<i)
                    }
                    lineStart = i + 1
                    consumed = lineStart
                }
                i += 1
            }
        }

        // Pass 2: JSON-decode candidates; silently skip anything malformed.
        let decoder = JSONDecoder()
        var result: [PendingEntry] = []
        result.reserveCapacity(candidates.count)
        for range in candidates {
            let lineData = data.subdata(in: range)
            guard let raw = try? decoder.decode(RawLine.self, from: lineData),
                  raw.type == "assistant",
                  raw.isApiErrorMessage != true,
                  let message = raw.message,
                  let messageId = message.id,
                  let model = message.model, model != "<synthetic>",
                  let usage = message.usage,
                  let timestampString = raw.timestamp,
                  let timestamp = ISO8601.parse(timestampString)
            else { continue }

            let input = usage.input_tokens ?? 0
            let output = usage.output_tokens ?? 0
            let cacheCreation = usage.cache_creation_input_tokens ?? 0
            let cacheRead = usage.cache_read_input_tokens ?? 0

            let (computedCost, priced) = PricingTable.cost(
                model: model, input: input, output: output,
                cacheCreation: cacheCreation, cacheRead: cacheRead
            )
            // costUSD is essentially never present in current transcripts, but honor it if it is.
            let cost = raw.costUSD ?? computedCost

            let project = raw.cwd.flatMap { URL(fileURLWithPath: $0).lastPathComponent } ?? "unknown"
            // Dedup key per ccusage: message.id + requestId; ~1.4% of rows have no
            // requestId — fall back to message.id alone.
            let dedupKey = raw.requestId.map { "\(messageId):\($0)" } ?? messageId

            result.append(PendingEntry(
                dedupKey: dedupKey,
                entry: UsageEntry(
                    timestamp: timestamp, model: model,
                    inputTokens: input, outputTokens: output,
                    cacheCreationTokens: cacheCreation, cacheReadTokens: cacheRead,
                    costUSD: raw.costUSD != nil ? cost : computedCost,
                    projectName: project,
                    priced: priced || raw.costUSD != nil
                )
            ))
        }
        return (result, consumed)
    }

    /// Naive byte search of `needle` within `range` of `base`; fast enough given the
    /// rare first byte ('"') and short needle.
    private static func lineContains(
        _ base: UnsafePointer<UInt8>, _ range: Range<Int>, needle: [UInt8]
    ) -> Bool {
        let n = needle.count
        guard range.count >= n else { return false }
        let first = needle[0]
        var i = range.lowerBound
        let limit = range.upperBound - n
        while i <= limit {
            if base[i] == first {
                var j = 1
                while j < n, base[i + j] == needle[j] { j += 1 }
                if j == n { return true }
            }
            i += 1
        }
        return false
    }
}
