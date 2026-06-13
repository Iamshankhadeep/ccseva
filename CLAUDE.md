# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CCSeva is a macOS menu bar Electron application that monitors Claude Code usage in real-time. The app spawns the `ccusage` CLI (v20+, a native Rust binary shipped via npm) with `--json` output to fetch token usage data and displays it through a modern React-based UI with tabbed navigation, analytics, notifications, and visualizations.

## Essential Commands

### Development
```bash
npm run electron-dev  # Start with hot reload (recommended for development)
npm run dev           # Build frontend only in watch mode
npm start            # Start built app
```

### Building
```bash
npm run build        # Production build (webpack + tsc compilation)
npm run pack         # Package app with electron-builder
npm run dist         # Build and create distribution package
npm run dist:mac     # Build for macOS specifically
```

### Code Quality
```bash
npm run lint         # Run Biome linter
npm run lint:fix     # Fix linting issues automatically
npm run format       # Format code with Biome
npm run format:check # Check code formatting
npm run check        # Run linting and formatting checks
npm run check:fix    # Fix linting and formatting issues
npm run type-check   # TypeScript type checking without emit
```

### Dependencies
```bash
npm install          # Install all dependencies
```

## Architecture Overview

### Dual-Process Electron Architecture
The app follows standard Electron patterns with clear separation:

- **Main Process** (`main.ts`): Manages system tray, IPC, and background services
- **Renderer Process** (`src/`): React app handling UI and user interactions
- **Preload Script** (`preload.ts`): Secure bridge exposing `electronAPI` to renderer

### Key Architectural Components

#### Service Layer (Singleton Pattern)
- **CCUsageService**: Spawns the `ccusage` CLI (native binary resolved from the `@ccusage/ccusage-<platform>-<arch>` optional dependencies) and parses its `--json` output, implementing a 3-second cache for stats and a 60-second cache for weekly data. Supports plan configuration and actual session-based reset times.
- **SettingsService**: Manages user preferences persistence to `~/.ccseva/settings.json` including plan selection, custom token limits, timezone, and reset hour settings
- **NotificationService**: Manages macOS notifications with cooldown periods and threshold detection
- **ResetTimeService**: Handles Claude usage reset time calculations and timezone management
- **SessionTracker**: Tracks user sessions and activity patterns for analytics

#### Data Flow
1. Main process polls CCUsageService every 30 seconds
2. Service executes `ccusage claude blocks|daily|weekly --json --mode calculate --offline` via `execFile` (30s timeout, 50MB max buffer)
3. The parsed JSON output is mapped to typed interfaces (`UsageStats`, `MenuBarData`, `WeeklyUsage`)
4. Menu bar updates with percentage display, renderer receives data via IPC
5. React app renders tabbed interface with dashboard, analytics, and live monitoring views
6. NotificationService triggers alerts based on usage thresholds and patterns

#### Modern UI Component Architecture
```
App.tsx (main container with state management)
├── NavigationTabs (tabbed interface)
├── Dashboard (overview with stats cards)
├── LiveMonitoring (real-time usage tracking)
├── Analytics (charts and historical data)
├── TerminalView (command-line interface simulation)
├── SettingsPanel (user preferences)
├── LoadingScreen (app initialization)
├── ErrorBoundary (error handling)
├── NotificationSystem (toast notifications)
└── ui/ (Radix UI components)
    ├── Button, Card, Progress, Tabs
    ├── Alert, Badge, Tooltip, Switch
    └── Avatar, Popover, Select, Slider
```

### Build System Specifics

#### Dual Compilation Process
The build requires both Webpack (renderer) and TypeScript compiler (main/preload):
```bash
webpack --mode production && tsc main.ts preload.ts --outDir dist
```

#### Critical Path Dependencies
- **ccusage npm package (v20+)**: Direct dependency; ships a CLI launcher plus platform-specific native binaries as optional dependencies (`@ccusage/ccusage-darwin-arm64`, etc.). The JavaScript library API was removed in ccusage v19
- **Tailwind CSS v3**: PostCSS processing with custom gradient themes
- **React 19**: Uses new JSX transform (`react-jsx`)
- **Radix UI**: Component library for accessible UI primitives
- **Biome**: Fast linter and formatter replacing ESLint/Prettier

### IPC Communication Pattern

Main process exposes these handlers:
- `get-usage-stats`: Returns full UsageStats object
- `get-weekly-usage`: Returns WeeklyUsage[] (weeks start Monday, matching Claude's weekly reset)
- `refresh-data`: Forces cache refresh and returns fresh data
- `usage-updated`: Event emitted to renderer every 30 seconds

Renderer accesses via `window.electronAPI` (type-safe interface in preload.ts).

## Data Processing Logic

### Usage Calculation
The app detects Claude plans automatically:
- **Pro**: ≤7,000 tokens
- **Max5**: ≤35,000 tokens  
- **Max20**: ≤140,000 tokens
- **Custom**: >140,000 tokens

### Burn Rate Algorithm
Calculates tokens/hour based on last 24 hours of usage data, used for depletion time predictions.

### Error Handling Strategy
- CCUsageService returns default stats on ccusage command failures
- React components display error states with retry buttons
- Main process continues functioning even if data fetch fails

## Development Considerations

### TypeScript Configuration
Uses strict mode with custom path aliases (`@/*` → `src/*`). Three separate tsconfig files:
- `tsconfig.json`: Main renderer process configuration
- `tsconfig.main.json`: Main Electron process configuration  
- `tsconfig.preload.json`: Preload script configuration

### Modern UI Architecture
- **Tailwind CSS v3**: Custom color palette for Claude branding with glass morphism effects
- **Radix UI Components**: Accessible, unstyled primitives for complex components
- **Sonner**: Toast notification system for user feedback
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variant management

### Menu Bar Integration
macOS-specific Tray API with text-only display (no icon). Features contextual menus and window positioning near menu bar with auto-hide behavior.

### Advanced Notification System
Implements intelligent notification logic:
- 5-minute cooldown between notifications
- Progressive alerts (70% warning → 90% critical) 
- Only notifies when status worsens, not repeated warnings
- Toast notifications within app for immediate feedback

## Required External Dependencies

- **`ccusage` npm package (v20+)**: Direct dependency managed in `package.json`; installs platform-specific native binaries through optional dependencies.
- **Claude Code**: Must be configured with valid credentials in `~/.claude` directory containing JSONL usage files, which the `ccusage` CLI uses as its data source.
- **macOS**: Tray and notification APIs are platform-specific

## Code Quality and Development Workflow

### Biome Configuration
The project uses Biome for linting and formatting with these key settings:
- **Import organization**: Automatically sorts and organizes imports
- **Strict linting**: Warns on `any` types, enforces import types, security rules
- **Consistent formatting**: 2-space indentation, single quotes for JS, double quotes for JSX
- **Line width**: 100 characters maximum

### ccusage Integration Best Practices

When integrating with the `ccusage` CLI (v20+):

1. **Use the `claude` subcommand**: Run `ccusage claude blocks|daily|weekly` — the top-level commands aggregate other coding agents too (Codex, Gemini, etc.), which would inflate numbers
2. **Always pass `--json --mode calculate --offline`**: JSON output, costs calculated from tokens, and embedded pricing data (no network calls)
3. **Resolve the native binary first**: Look up `@ccusage/ccusage-<platform>-<arch>/bin/ccusage` via `require.resolve`; fall back to running `ccusage/dist/cli.js` with `process.execPath` and `ELECTRON_RUN_AS_NODE=1`
4. **Note the blocks `entries` field is a count**: It is a number of usage entries, not an array — per-entry data is not available; use block-level `burnRate` and `projection` (precomputed by the CLI) instead
5. **Robust error handling**: Wrap CLI calls in `try/catch` to handle missing `~/.claude` configuration or a missing binary
6. **Caching strategy**: Keep the 3-second stats cache (60 seconds for weekly data) to avoid excessive CLI spawns
7. **Packaging**: `electron-builder.json` must `asarUnpack` `node_modules/ccusage/**` and `node_modules/@ccusage/**` so the binary is spawnable from packaged builds

## Recent Updates and Improvements

### ccusage v20 CLI Migration + Weekly & 5-Hour Block Features (Latest)
- **Upgraded ccusage 18.0.8 → 20.0.11**: ccusage v19 removed the JavaScript library API and v20 is a Rust rewrite; `CCUsageService` now spawns the native CLI binary and parses `--json` output instead of importing `ccusage/data-loader`
- **Native binary resolution**: Per-platform lookup of `@ccusage/ccusage-<platform>-<arch>` with a `cli.js` + `ELECTRON_RUN_AS_NODE` fallback and asar-unpacked path handling for packaged builds
- **5-hour block view**: New `activeBlock` field on `UsageStats` (start/end times, tokens, cost, CLI-precomputed burn rate and projection); surfaced as a detailed card in LiveMonitoring and a compact strip on the Dashboard with a "Resets in Xh Ym" countdown
- **Weekly usage view**: New `getWeeklyUsage()` service method and `get-weekly-usage` IPC channel backed by `ccusage claude weekly --start-of-week monday`; Analytics shows the last 8 weeks (tokens + cost) with the current week highlighted
- **Peak hour rework**: The v20 CLI reports `entries` as a count (not an array), so peak hour is now estimated by distributing block tokens proportionally across the hours each block was active

### Settings Management & Plan Selection
- **Claude Plan Settings**: Added comprehensive plan selection in SettingsPanel with Auto-detect, Pro, Max5, Max20, and Custom options
- **Persistent Settings**: Extended SettingsService to save plan preferences to `~/.ccseva/settings.json` with backward compatibility
- **Custom Token Limits**: Custom plan option allows users to set non-standard token limits with validation
- **Real-time Plan Display**: TerminalView now shows selected plan settings instead of just auto-detected plans
- **Settings UI Enhancement**: Professional plan selection dropdown with token limit display and current plan detection

### Session-Based Reset Time Accuracy
- **Active Session Integration**: Reset time now uses actual `activeBlock.endTime` from session data instead of estimated monthly cycles
- **Real-time Countdown**: SettingsPanel displays live countdown showing "X hours Y minutes left" updating every minute
- **Simplified Logic**: Removed complex fallback calculations, shows "No active session" when appropriate
- **Dashboard Integration**: Updated Dashboard to use actual session-based reset times consistently

### Cost Calculation Improvements
- **Enhanced Average Cost**: Fixed Analytics average cost per 1000 tokens calculation with better edge case handling
- **Data Validation**: Added checks for both `totalTokens > 0 AND totalCost > 0` to prevent division by zero
- **Accurate Pricing**: Formula `(totalCost / totalTokens) * 1000` now properly validated for real-world cost accuracy

### ccusage Integration History
- The service originally shelled out to a globally installed `ccusage` CLI, then moved to the package's `data-loader` JS API (v17/v18).
- With ccusage v19/v20 the JS API was removed, so the integration moved back to spawning the (now native, npm-bundled) CLI with `--json` output — see "ccusage v20 CLI Migration" above.
- `ccusage` remains a formal npm dependency in `package.json`, ensuring version consistency.

### Current Project Structure
```
ccseva/
├── main.ts                     # Electron main process with tray management
├── preload.ts                  # Secure IPC bridge
├── src/
│   ├── App.tsx                 # Main React container with state management
│   ├── components/             # Modern UI components
│   │   ├── Dashboard.tsx       # Overview with stats cards
│   │   ├── Analytics.tsx       # Charts and historical data
│   │   ├── LiveMonitoring.tsx  # Real-time usage tracking
│   │   ├── TerminalView.tsx    # CLI simulation interface
│   │   ├── SettingsPanel.tsx   # User preferences
│   │   ├── NavigationTabs.tsx  # Tabbed interface
│   │   ├── NotificationSystem.tsx # Toast notifications
│   │   ├── LoadingScreen.tsx   # App initialization
│   │   ├── ErrorBoundary.tsx   # Error handling
│   │   └── ui/                 # Radix UI components
│   ├── services/               # Business logic services
│   │   ├── ccusageService.ts   # ccusage CLI (--json) integration
│   │   ├── settingsService.ts  # User preferences persistence
│   │   ├── notificationService.ts # macOS notification management
│   │   ├── resetTimeService.ts # Reset time calculations
│   │   └── sessionTracker.ts   # Session tracking
│   ├── types/
│   │   ├── usage.ts            # TypeScript interfaces
│   │   └── electron.d.ts       # Electron API types
│   ├── lib/utils.ts            # Utility functions
│   └── styles/index.css        # Tailwind CSS with custom themes
├── biome.json                  # Biome linter/formatter config
├── components.json             # Radix UI component config
├── electron-builder.json       # App packaging configuration
├── webpack.config.js           # Renderer build configuration
├── tsconfig*.json              # TypeScript configurations (3 files)
├── tailwind.config.js          # Tailwind CSS configuration
└── postcss.config.js           # PostCSS configuration
```

### Git Repository Status
- **Initialized git repository** with comprehensive .gitignore
- **Two commits made**:
  1. Initial commit with full feature set
  2. Refactor commit improving ccusage integration
- **Clean working tree** ready for development

## Testing and Verification

Since there are no automated tests, manual verification checklist:

### Core Functionality
1. Menu bar text display appears with usage percentage
2. Click expands tabbed interface with multiple views
3. Right-click shows context menu with refresh/quit options
4. All tabs (Dashboard, Live, Analytics, Terminal, Settings) function correctly
5. Data updates every 30 seconds across all views
6. Error boundaries handle failures gracefully

### Data Integration
7. **ccusage CLI integration**: Verify the native binary resolves and `ccusage claude blocks/daily/weekly --json` calls succeed
8. **Data consistency**: Ensure displayed data matches `ccusage` CLI output
9. **Actual reset time accuracy**: Verify session-based reset times from active blocks
10. **Session tracking**: Confirm session data persistence and analytics
11. **Settings persistence**: Confirm plan and preference settings save to `~/.ccseva/settings.json`
12. **5-hour block view**: LiveMonitoring and Dashboard show current block tokens, burn rate, projection, and reset countdown
13. **Weekly view**: Analytics lists recent weeks (Monday start) with tokens/cost and highlights the current week

### Plan Management & Settings
14. **Plan selection**: Test Auto-detect, Pro, Max5, Max20, and Custom plan options in SettingsPanel
15. **Custom token limits**: Verify custom plan allows setting and validation of non-standard limits
16. **Real-time updates**: Confirm plan changes immediately update Dashboard and TerminalView displays
17. **Settings persistence**: Verify settings survive app restarts and maintain backward compatibility

### UI/UX Features
18. **Toast notifications**: In-app notifications work properly
19. **macOS notifications**: System alerts appear at thresholds
20. **Real-time countdown**: SettingsPanel shows live "X hours Y minutes left" updating every minute
21. **Plan display consistency**: TerminalView shows selected plan settings (not just auto-detected)
22. **Cost calculation accuracy**: Analytics shows correct average cost per 1000 tokens
23. **Theme consistency**: Tailwind styling renders correctly
24. **Responsive design**: Interface adapts to different window sizes
25. **Component interactions**: All Radix UI components function properly