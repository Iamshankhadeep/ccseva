import AppKit
import Combine
import SwiftUI

/// AppKit shell: status item with live usage text, transient SwiftUI popover on
/// left-click, context menu on right-click. Runs as an accessory app (no Dock icon).
@main
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private static var retainedDelegate: AppDelegate?

    static func main() {
        if CommandLine.arguments.contains("--diagnose") {
            Diagnose.run()
            exit(0)
        }
        let app = NSApplication.shared
        let delegate = AppDelegate()
        retainedDelegate = delegate
        app.delegate = delegate
        app.setActivationPolicy(.accessory)
        app.run()
    }

    private var statusItem: NSStatusItem?
    private var popover: NSPopover?
    private var store: UsageStore?
    private var cancellables = Set<AnyCancellable>()
    /// When the transient popover last auto-closed; see togglePopover().
    private var popoverLastClosedAt: Date = .distantPast

    func applicationDidFinishLaunching(_ notification: Notification) {
        let store = UsageStore()
        self.store = store

        let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        self.statusItem = statusItem
        if let button = statusItem.button {
            button.title = "--"
            button.target = self
            button.action = #selector(statusItemClicked(_:))
            button.sendAction(on: [.leftMouseUp, .rightMouseUp])
        }

        let popover = NSPopover()
        popover.behavior = .transient
        popover.contentSize = NSSize(width: 420, height: 560)
        popover.contentViewController = NSHostingController(
            rootView: RootView().environmentObject(store)
        )
        self.popover = popover

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(popoverDidClose(_:)),
            name: NSPopover.didCloseNotification,
            object: popover
        )

        store.$menuBarTitle
            .receive(on: DispatchQueue.main)
            .sink { [weak self] title in
                self?.statusItem?.button?.title = title
            }
            .store(in: &cancellables)

        store.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        store?.stop()
    }

    // MARK: - Status item interactions

    @objc private func statusItemClicked(_ sender: Any?) {
        if NSApp.currentEvent?.type == .rightMouseUp {
            showContextMenu()
        } else {
            togglePopover()
        }
    }

    @objc private func popoverDidClose(_ notification: Notification) {
        popoverLastClosedAt = Date()
    }

    private func togglePopover() {
        guard let popover, let button = statusItem?.button else { return }
        if popover.isShown {
            popover.performClose(nil)
        } else {
            // The transient popover dismisses on the mouse-down of the very click
            // whose mouse-up triggers this action; without this guard a left-click
            // on the status item could never close the popover, only re-show it.
            guard Date().timeIntervalSince(popoverLastClosedAt) > 0.25 else { return }
            NSApp.activate(ignoringOtherApps: true)
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
        }
    }

    private func showContextMenu() {
        guard let statusItem else { return }
        let menu = NSMenu()

        let refreshItem = NSMenuItem(title: "Refresh", action: #selector(refresh), keyEquivalent: "r")
        refreshItem.target = self
        menu.addItem(refreshItem)
        menu.addItem(.separator())

        let quitItem = NSMenuItem(title: "Quit CCSeva", action: #selector(quit), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        // Standard trick: temporarily attach the menu so the next click pops it,
        // then detach so left-click keeps toggling the popover.
        statusItem.menu = menu
        statusItem.button?.performClick(nil)
        statusItem.menu = nil
    }

    @objc private func refresh() {
        store?.manualRefresh()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
