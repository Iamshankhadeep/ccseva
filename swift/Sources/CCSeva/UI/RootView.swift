import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case live = "Live"
    case analytics = "Analytics"
    case settings = "Settings"

    var id: String { rawValue }

    var systemImage: String {
        switch self {
        case .dashboard: return "gauge.medium"
        case .live: return "waveform.path.ecg"
        case .analytics: return "chart.bar.xaxis"
        case .settings: return "gearshape"
        }
    }
}

/// Popover root: header + tab bar + tab content.
struct RootView: View {
    @EnvironmentObject private var store: UsageStore
    @State private var selectedTab: AppTab = .dashboard

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            tabBar
            Divider()
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(width: 420, height: 560)
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text("CCSeva")
                    .font(.headline)
                if let at = store.lastRefreshAt {
                    Text("Updated \(at.formatted(date: .omitted, time: .shortened))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if store.isRefreshing {
                ProgressView()
                    .controlSize(.small)
            }
            Button {
                store.manualRefresh()
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.borderless)
            .help("Refresh usage data and limits")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private var tabBar: some View {
        HStack(spacing: 4) {
            ForEach(AppTab.allCases) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: tab.systemImage)
                            .font(.system(size: 13))
                        Text(tab.rawValue)
                            .font(.system(size: 10))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(
                        selectedTab == tab ? Color.accentColor.opacity(0.15) : .clear,
                        in: RoundedRectangle(cornerRadius: 6)
                    )
                    .foregroundStyle(selectedTab == tab ? Color.accentColor : Color.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private var content: some View {
        switch selectedTab {
        case .dashboard: DashboardView()
        case .live: LiveView()
        case .analytics: AnalyticsView()
        case .settings: SettingsView()
        }
    }
}
