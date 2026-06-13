import SwiftUI

/// Preferences tab. Writes through to ~/.ccseva/settings.json (shared with the
/// Electron app; unknown keys are preserved).
struct SettingsView: View {
    @EnvironmentObject private var store: UsageStore
    @State private var customLimitText = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                planSection
                menuBarSection
                refreshSection
                aboutSection
            }
            .padding(14)
        }
        .onAppear {
            customLimitText = store.settings.customTokenLimit.map(String.init) ?? ""
        }
    }

    private var planSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Claude plan")
            Picker("Plan", selection: planBinding) {
                ForEach(AppSettings.Plan.allCases) { plan in
                    Text(plan.displayName).tag(plan)
                }
            }
            .labelsHidden()

            if store.settings.plan == .custom {
                HStack {
                    TextField("Custom token limit", text: $customLimitText)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 140)
                    Button("Apply") {
                        applyCustomLimit()
                    }
                }
            }

            Text("Used only for the local fallback estimate when the live limits endpoint is unavailable. Effective limit: \(Format.tokens(store.localTokenLimit)) tokens per 5h block.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var menuBarSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Menu bar")
            Picker("Display", selection: displayModeBinding) {
                Text("Percentage").tag(AppSettings.MenuBarDisplayMode.percentage)
                Text("Cost").tag(AppSettings.MenuBarDisplayMode.cost)
                Text("Alternate").tag(AppSettings.MenuBarDisplayMode.alternate)
            }
            .pickerStyle(.segmented)
            .labelsHidden()

            if store.settings.menuBarDisplayMode != .percentage {
                Picker("Cost source", selection: costSourceBinding) {
                    Text("Today's cost").tag(AppSettings.CostSource.today)
                    Text("Session window").tag(AppSettings.CostSource.sessionWindow)
                }
            }
        }
    }

    private var refreshSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Refresh")
            Picker("Fallback interval", selection: refreshIntervalBinding) {
                Text("30 seconds").tag(30)
                Text("60 seconds").tag(60)
                Text("2 minutes").tag(120)
                Text("5 minutes").tag(300)
            }
            Text("File changes under ~/.claude/projects refresh automatically (FSEvents). This interval is just the safety-net poll.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeader(title: "About")
            Text("Settings file: \(store.settingsFilePath)")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
            Text("Limit gauges use Claude Code's unofficial OAuth usage endpoint; when unreachable, CCSeva falls back to local estimates from your transcripts.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    // MARK: - Bindings

    private var planBinding: Binding<AppSettings.Plan> {
        Binding(
            get: { store.settings.plan },
            set: { newValue in
                var s = store.settings
                s.plan = newValue
                store.updateSettings(s)
            }
        )
    }

    private var displayModeBinding: Binding<AppSettings.MenuBarDisplayMode> {
        Binding(
            get: { store.settings.menuBarDisplayMode },
            set: { newValue in
                var s = store.settings
                s.menuBarDisplayMode = newValue
                store.updateSettings(s)
            }
        )
    }

    private var costSourceBinding: Binding<AppSettings.CostSource> {
        Binding(
            get: { store.settings.menuBarCostSource },
            set: { newValue in
                var s = store.settings
                s.menuBarCostSource = newValue
                store.updateSettings(s)
            }
        )
    }

    private var refreshIntervalBinding: Binding<Int> {
        Binding(
            get: { store.settings.refreshIntervalSeconds },
            set: { newValue in
                var s = store.settings
                s.refreshIntervalSeconds = newValue
                store.updateSettings(s)
            }
        )
    }

    private func applyCustomLimit() {
        guard let value = Int(customLimitText.trimmingCharacters(in: .whitespaces)), value > 0 else {
            customLimitText = store.settings.customTokenLimit.map(String.init) ?? ""
            return
        }
        var s = store.settings
        s.customTokenLimit = value
        store.updateSettings(s)
    }
}
