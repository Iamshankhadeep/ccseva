import CoreServices
import Foundation

/// Thin FSEvents wrapper: watches directory trees with file-level events,
/// debounces bursts (Claude Code writes transcripts continuously while
/// streaming) and invokes the callback on a private queue.
final class FileWatcher {
    /// All mutable state (`stream`, `pending`) is confined to `queue`, which is
    /// also the FSEvents callback queue — start/stop synchronize onto it so a
    /// teardown can never race an in-flight callback using passUnretained(self).
    private var stream: FSEventStreamRef?
    private let queue = DispatchQueue(label: "com.iamshankhadeep.ccseva.fsevents")
    private let paths: [String]
    private let debounceInterval: TimeInterval
    private let onChange: () -> Void
    private var pending: DispatchWorkItem?

    init(paths: [String], debounce: TimeInterval = 3.0, onChange: @escaping () -> Void) {
        self.paths = paths
        self.debounceInterval = debounce
        self.onChange = onChange
    }

    func start() {
        queue.sync {
            guard stream == nil, !paths.isEmpty else { return }

            var context = FSEventStreamContext()
            context.info = Unmanaged.passUnretained(self).toOpaque()

            let callback: FSEventStreamCallback = { _, info, _, _, _, _ in
                guard let info else { return }
                let watcher = Unmanaged<FileWatcher>.fromOpaque(info).takeUnretainedValue()
                watcher.scheduleFire()
            }

            let flags = FSEventStreamCreateFlags(
                kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes
            )
            guard let created = FSEventStreamCreate(
                kCFAllocatorDefault,
                callback,
                &context,
                paths as CFArray,
                FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
                2.0, // coalescing latency (seconds)
                flags
            ) else { return }

            stream = created
            FSEventStreamSetDispatchQueue(created, queue)
            FSEventStreamStart(created)
        }
    }

    func stop() {
        queue.sync {
            pending?.cancel()
            pending = nil
            guard let stream else { return }
            FSEventStreamStop(stream)
            FSEventStreamInvalidate(stream)
            FSEventStreamRelease(stream)
            self.stream = nil
        }
    }

    /// Always runs on `queue` (the FSEvents callback queue).
    private func scheduleFire() {
        pending?.cancel()
        let item = DispatchWorkItem { [onChange] in onChange() }
        pending = item
        queue.asyncAfter(deadline: .now() + debounceInterval, execute: item)
    }

    deinit {
        stop()
    }
}
