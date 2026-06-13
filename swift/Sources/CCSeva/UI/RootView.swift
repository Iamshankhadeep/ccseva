import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case live = "Live"
    case analytics = "Analytics"
    case terminal = "Terminal"
    case settings = "Settings"

    var id: String { rawValue }

    /// SF Symbol approximating the Electron tab icon.
    var systemImage: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .live: return "waveform.path.ecg"
        case .analytics: return "chart.xyaxis.line"
        case .terminal: return "terminal"
        case .settings: return "gearshape"
        }
    }
}

/// Popover root: warm background + header + tab bar + tab content.
struct RootView: View {
    @EnvironmentObject private var store: UsageStore
    @State private var selectedTab: AppTab = .dashboard
    @State private var hoverQuit = false
    @State private var now = Date()

    private let clock = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            AppBackground()
            VStack(spacing: 12) {
                header
                tabBar
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .padding(14)
        }
        .frame(width: 600, height: 600)
        .onReceive(clock) { now = $0 }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            ClaudeLogo(size: 32)
            VStack(alignment: .leading, spacing: 1) {
                Text("CCSeva")
                    .font(.firaCode(18, weight: .bold))
                    .foregroundStyle(Gradients.claudeText)
                Text("Track API usage")
                    .font(.firaCode(11))
                    .foregroundStyle(Color.neutral400)
            }
            Spacer()

            // Time chip
            Text(timeString)
                .font(.firaCode(11, weight: .medium))
                .foregroundStyle(Color.neutral300)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))

            // Refresh
            iconButton(system: "arrow.clockwise", spinning: store.isRefreshing) {
                store.manualRefresh()
            }
            .help("Refresh usage data and limits")

            // Quit
            Button {
                NSApp.terminate(nil)
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(hoverQuit ? Color.critFrom : Color.neutral400)
                    .frame(width: 28, height: 28)
                    .background(
                        (hoverQuit ? Color.critFrom.opacity(0.12) : Color.clear),
                        in: RoundedRectangle(cornerRadius: 8)
                    )
            }
            .buttonStyle(.plain)
            .onHover { hoverQuit = $0 }
            .help("Quit CCSeva")
        }
    }

    @ViewBuilder
    private func iconButton(system: String, spinning: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            ZStack {
                if spinning {
                    ProgressView().controlSize(.small)
                } else {
                    Image(systemName: system)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.neutral300)
                }
            }
            .frame(width: 28, height: 28)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    private var timeString: String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f.string(from: now)
    }

    // MARK: - Tab bar

    private var tabBar: some View {
        HStack(spacing: 6) {
            ForEach(AppTab.allCases) { tab in
                let active = selectedTab == tab
                Button {
                    selectedTab = tab
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: tab.systemImage)
                            .font(.system(size: 12, weight: .medium))
                        Text(tab.rawValue)
                            .font(.firaCode(11, weight: active ? .semibold : .medium))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .foregroundStyle(active ? Color.white : Color.neutral400)
                    .background {
                        if active {
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(Gradients.claudeActive)
                                .shadow(color: Color.claudePrimary.opacity(0.4), radius: 6, y: 2)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(Color.neutral900.opacity(0.6), in: RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10).stroke(Color.neutral800, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var content: some View {
        switch selectedTab {
        case .dashboard: DashboardView()
        case .live: LiveView()
        case .analytics: AnalyticsView()
        case .terminal: TerminalView()
        case .settings: SettingsView()
        }
    }
}
