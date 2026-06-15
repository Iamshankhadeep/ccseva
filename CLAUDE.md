# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCSeva is a **native Swift** macOS menu bar app that monitors Claude Code usage in real time. It parses `~/.claude/projects/**/*.jsonl` transcripts directly (no external CLI), computes 5-hour session blocks, daily/weekly aggregates, and per-model/per-project costs, and surfaces **server-truth limit gauges** by reading Claude Code's OAuth usage endpoint. The UI is an `NSStatusItem` + `NSPopover` hosting SwiftUI, themed to match the original design (warm palette, Fira Code, Swift Charts).

The app lives entirely in `swift/`. It is lightweight (~3 MB installed, near-zero idle overhead) and has **zero third-party dependencies** — only Apple SDK frameworks (AppKit, SwiftUI, Charts, UserNotifications, ServiceManagement, CoreText).

> CCSeva was originally an Electron/React app. That implementation was fully removed in favor of this native rewrite; see the "History" section of `README.md` to find it in git history.

## Essential Commands

All commands run from `swift/`:

```bash
cd swift

swift build                       # debug build
swift build -c release            # release build
swift run CCSeva                  # build & run (debug)

./scripts/build-app.sh            # assemble dist/CCSeva.app (release, ad-hoc signed)

.build/release/CCSeva --diagnose  # headless data-pipeline smoke test (prints a summary, exits 0)
```

Install locally: `./scripts/build-app.sh` then `cp -R dist/CCSeva.app /Applications/` and `open /Applications/CCSeva.app`.

There is no linter/formatter config; follow the existing Swift style (the code builds with zero warnings — keep it that way).

## Architecture

### App shell (AppKit + SwiftUI)
- **`App/AppDelegate.swift`** — `@main` `NSApplicationDelegate`, accessory app (no Dock icon, `LSUIElement`). Owns the `NSStatusItem` (live usage text), a transient `NSPopover` (600×600) hosting `RootView` via `NSHostingController`, and a right-click `NSMenu` (Refresh/Quit). Registers the bundled Fira Code faces at launch. Handles the `--diagnose` flag.
- **`UI/`** — pure SwiftUI. `RootView` (header + 5-tab bar + content), `DashboardView`, `LiveView`, `AnalyticsView` (Swift Charts), `TerminalView`, `SettingsView`, shared `Components.swift`, and **`Theme.swift`** (the single design system: warm color palette, Fira Code font helper, `warmCard` modifier, gradient background, gradient icon tiles, the app icon, progress rings).

### Data layer (`Data/`)
- **`UsageStore.swift`** — `@MainActor` `ObservableObject`, the single source of truth shared by the status item and the SwiftUI tree. Drives the refresh pipeline (FSEvents-debounced + a fallback timer + manual refresh), the menu-bar title, notifications, predictions, and all UI-facing computed values.
- **`JSONLScanner.swift`** — an `actor` that recursively scans the Claude data roots, reading each `*.jsonl` incrementally (per-file offset + identity cache; re-reads only appended bytes; re-parses on rotation/shrink). Decodes only usage entries.
- **`Aggregator.swift`** — session-block windowing and daily/weekly/per-model/per-project rollups.
- **`Models.swift`**, **`Pricing.swift`** (embedded LiteLLM snapshot, longest-prefix model match), **`FileWatcher.swift`** (FSEventStream wrapper).

### Limits feature (`Limits/`)
The headline feature: real, server-side limit utilization rather than token heuristics.
- **`OAuthLimitsProvider.swift`** — calls Claude Code's **undocumented** `GET https://api.anthropic.com/api/oauth/usage` (headers `Authorization: Bearer <token>`, `anthropic-beta: oauth-2025-04-20`, a Claude-Code-like User-Agent). Decodes window objects (5-hour, weekly all-models, weekly model-specific) defensively; polls ≤120 s with backoff on 401/429.
- **`Credentials.swift`** — reads the OAuth token from the Keychain item "Claude Code-credentials" (via the `security` CLI, with a hard timeout + 30-min negative cache) or `~/.claude/.credentials.json`.
- **`LimitsProvider.swift`** — protocol; on failure the UI degrades to a local-estimation fallback badged "estimated".

### Support (`Support/`)
- **`Settings.swift`** — reads/writes `~/.ccseva/settings.json` in the **same format as the old Electron app** (unknown keys preserved on save; re-reads before writing to avoid clobbering external edits).
- **`Notifier.swift`** — `UNUserNotificationCenter` when bundled, `osascript` fallback otherwise; 70%/90% thresholds, 5-min cooldown, only notifies on worsening.
- **`LaunchAtLogin.swift`** — `SMAppService.mainApp` login-item toggle (macOS 13+).
- **`Formatting.swift`**, **`Diagnose.swift`** (the `--diagnose` headless check).

## Core Algorithms

### 5-hour session blocks (mirrors ccusage)
Sort usage entries ascending. `floorToHour` floors to the UTC hour. Start a new block when `(t − blockStart) > 5h` OR `(t − lastEntry) > 5h`. A block: `endTime = startTime + 5h`, `actualEndTime = last entry`, `isActive = (now − actualEnd < 5h) && (now < endTime)`. Burn rate = totalTokens / durationMinutes; projection extrapolates to `endTime`.

### Deduplication (mandatory)
Claude rewrites the same assistant message multiple times while streaming (~52% of rows are duplicates). Dedupe by `message.id + ":" + requestId` (fall back to `message.id` when `requestId` is absent). Filter out `model == "<synthetic>"` and `isApiErrorMessage` entries. `costUSD` is absent in current data — costs are always computed from tokens × per-model pricing.

### Daily/weekly aggregation
Grouped in the **local** timezone; weeks start **Monday** (matching Claude's weekly reset). Block windowing floors to **UTC** hours — keep the two consistent.

## Resources & Packaging

- `Package.swift` declares `resources: [.process("Resources")]`. Bundled assets (Fira Code TTFs + OFL license, `AppIcon.png`) are accessed at runtime via `Bundle.module`.
- SwiftPM emits these into `CCSeva_CCSeva.bundle`. **`scripts/build-app.sh` copies that bundle into `Contents/Resources/`** — without it, fonts won't load in the packaged `.app`. The script also copies `assets/icon.icns` (shared, at the repo root) as the bundle icon, writes `Info.plist` (`LSUIElement`, bundle id `com.iamshankhadeep.ccseva`, version 2.0.0, macOS 14+), and **ad-hoc codesigns** the app (required for `UserNotifications` and `SMAppService`).
- `assets/icon.icns` at the repo root is still used by the Swift build — do not remove it.

## CI / Release (`.github/workflows/`)
- **`ci.yml`** — a single `swift-build` job (macos-15, Xcode 16.4): `swift build -c release`, `build-app.sh`, asserts the bundle + resource bundle exist, runs `--diagnose`, uploads the app artifact.
- **`release.yml`** — on `v*` tags: builds the `.app`, packages a zip (`ditto`) + DMG (`hdiutil`), and publishes to GitHub Releases. Developer ID signing + notarization are **optional**, guarded on `MACOS_CERTIFICATE_BASE64` (and friends `MACOS_CERTIFICATE_PASSWORD`, `APPLE_DEVELOPER_NAME`, `APPLE_TEAM_ID`, `APPLE_ID`, `APPLE_APP_PASSWORD`) being present; without them it ships an ad-hoc-signed artifact.

## Testing / Verification

No automated tests. Verify changes by:
1. `swift build -c release` — must be warning-free.
2. `./scripts/build-app.sh` — assembles and codesigns `dist/CCSeva.app`.
3. `.build/release/CCSeva --diagnose` — confirm sane numbers (non-zero entries, plausible costs, dedup ~50%, an active block, current-week totals, limits-endpoint status) against real `~/.claude` data.
4. Install to `/Applications` and exercise the popover: all 5 tabs render, the menu-bar text updates, notifications/launch-at-login work.

## Notes & Constraints
- macOS 14+; Swift 6.1 / Xcode 16.4. `Package.swift` uses `swift-tools-version: 5.10` (Swift 5 language mode) to avoid strict-concurrency churn.
- The OAuth usage endpoint is unofficial and may change — keep it isolated behind `LimitsProvider` with the local-estimation fallback.
- Pricing is a build-time LiteLLM snapshot; unknown models price at $0 and are surfaced subtly in Analytics.
- Keep AppKit objects on `@MainActor`; do file IO/parsing in the scanner actor and publish results back to the main actor.
