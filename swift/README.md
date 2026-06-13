# CCSeva (native Swift)

A lightweight, native macOS menu bar app that monitors Claude Code usage in real time — a
Swift/AppKit/SwiftUI replacement for the Electron CCSeva app in the repository root.
No Node, no Electron, no external dependencies: one ~2 MB binary.

## Build

Requires Xcode 16 / Swift 6 toolchain, macOS 14+ (built and tested on arm64).

```bash
cd swift
swift build                 # debug build
.build/debug/CCSeva --diagnose   # headless functional check (see below)

./scripts/build-app.sh      # release build → dist/CCSeva.app (ad-hoc signed)
open dist/CCSeva.app
```

The app is a menu-bar-only app (`LSUIElement`): look for the usage percentage in the
menu bar. Left-click opens the popover; right-click shows Refresh / Quit.

`CCSeva --diagnose` skips the UI entirely and runs the JSONL scan, 5-hour block
computation, weekly aggregation and a limits-endpoint probe, printing a summary.
Use it to sanity-check the data pipeline.

## Architecture

SwiftPM executable package (no .xcodeproj), Swift 5 language mode, macOS 14+.

```
Sources/CCSeva/
├── App/
│   └── AppDelegate.swift      # NSStatusItem + NSPopover(NSHostingController) shell
├── Data/
│   ├── JSONLScanner.swift     # actor: incremental ~/.claude JSONL parsing + dedup
│   ├── Aggregator.swift       # 5h session blocks, daily/weekly/model/project rollups
│   ├── Models.swift           # UsageEntry, SessionBlock, UsageSnapshot, ...
│   ├── Pricing.swift          # static per-token pricing (LiteLLM snapshot), prefix match
│   ├── FileWatcher.swift      # FSEvents wrapper (file events, 2s latency, 3s debounce)
│   └── UsageStore.swift       # @MainActor ObservableObject — single source of truth
├── Limits/
│   ├── LimitsProvider.swift   # protocol + window types
│   ├── OAuthLimitsProvider.swift  # api.anthropic.com/api/oauth/usage client
│   └── Credentials.swift      # Keychain ("Claude Code-credentials") / file token
├── Support/
│   ├── Settings.swift         # ~/.ccseva/settings.json (shared with Electron app)
│   ├── Notifier.swift         # UNUserNotificationCenter / osascript thresholds
│   ├── Formatting.swift       # ISO8601 parsing, token/cost/duration formatting
│   └── Diagnose.swift         # --diagnose headless check
└── UI/                        # SwiftUI popover: Dashboard / Live / Analytics / Settings
```

### Data pipeline

1. **Scan** — `UsageDataSource` (an actor) recursively scans `~/.claude/projects/**/*.jsonl`
   (plus `$CLAUDE_CONFIG_DIR` roots and `~/.config/claude` when present). Files are read
   incrementally (seek + plain read of only the appended bytes; no memory mapping), split
   on newline bytes, and prefiltered with a raw byte search for `"type":"assistant"`
   before any JSON decoding. An incremental cache keyed on (file identity, mtime, size,
   byte offset) means re-scans only parse appended bytes — transcripts are append-only —
   and a rotated/replaced or truncated file is re-parsed from scratch. A cold scan of
   ~200 MB takes ~1.5 s (release).
2. **Dedup** — streaming writes duplicate assistant rows (~52% on this machine). Dedup
   key is `message.id + ":" + requestId` (message.id alone when requestId is missing);
   first occurrence wins. Synthetic models and `isApiErrorMessage` rows are dropped.
3. **Cost** — `costUSD` is absent from transcripts in practice, so cost is computed from
   a static per-token pricing table snapshotted from LiteLLM, with longest-prefix model
   matching. Unknown (third-party) models cost $0 and are flagged "unpriced" in Analytics.
4. **Blocks** — ccusage's 5-hour session block algorithm: blocks anchor at the entry
   timestamp floored to the UTC hour; a new block starts when an entry is >5h after the
   block start or >5h after the previous entry. Burn rate and end-of-window projections
   come from the active block.
5. **Refresh** — FSEvents on the data roots (debounced 3 s) + a configurable fallback
   timer (default 60 s) + manual refresh.

### Limit gauges ("limit headroom") — unofficial endpoint

Subscription limits are enforced server-side, so local token counting can only estimate
them. The Dashboard's gauges read the same endpoint Claude Code itself uses:

```
GET https://api.anthropic.com/api/oauth/usage
Authorization: Bearer <accessToken>        # from Keychain "Claude Code-credentials"
anthropic-beta: oauth-2025-04-20
```

The response is an object of windows like `five_hour`, `seven_day`, `seven_day_opus`,
each `{ "utilization": <percent>, "resets_at": <iso8601> }`. **This endpoint is
undocumented and unofficial** — it may change or disappear at any time. The decoder is
deliberately defensive (any object with numeric `utilization` + a `resets_at` key counts
as a window; values are treated as percent and clamped to 0–100, with only strictly
fractional 0–1 values interpreted as fractions), polling is capped at once per 120 s
with backoff on 401/429, and on any failure the app falls back to local estimation
(active block tokens vs. the plan limit from Settings), badging gauges "estimated"
instead of "live".

The Keychain read shells out to `/usr/bin/security` with a 10 s hard timeout (the call
can otherwise hang on a keychain authorization prompt); a denied or failed read is
cached negatively for 30 minutes so you aren't re-prompted on every poll, falling back
to `~/.claude/.credentials.json` in the meantime.

The Dashboard also shows a pace prediction: with live data it uses the slope of the last
two utilization readings; otherwise the local burn rate — "At current pace you'll hit
the session limit at HH:mm" when the projection crosses 100% before the reset.

### Settings compatibility

`~/.ccseva/settings.json` is read and written in the same format as the Electron app
(`plan`, `customTokenLimit`, `timezone`, `resetHour`, `menuBarDisplayMode`
percentage/cost/alternate, `menuBarCostSource` today/sessionWindow). Unknown keys are
preserved on save, so the two apps can share the file. `refreshIntervalSeconds` is a
Swift-app extension key.

### Notifications

Warning at ≥70% and critical at ≥90% of the 5-hour window, 5-minute cooldown, and only
when the status *worsens*. Uses `UNUserNotificationCenter` when running from
`dist/CCSeva.app`; a bare `swift run` binary can't use that API, so it falls back to
`osascript -e 'display notification ...'`.

## Limitations

- The limits endpoint is unofficial (see above); expect occasional breakage.
- Pricing is a build-time snapshot; new models fall back to prefix matches or $0.
- Notifications from the bare binary (not the .app bundle) use osascript and won't
  appear in Notification Center settings.
- arm64 only by default (`scripts/build-app.sh`); add `--arch x86_64` for a universal build.
