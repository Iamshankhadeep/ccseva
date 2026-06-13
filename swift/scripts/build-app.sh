#!/bin/bash
# Builds CCSeva.app (arm64, release) into swift/dist/.
set -euo pipefail

cd "$(dirname "$0")/.."

swift build -c release --arch arm64
BIN_PATH="$(swift build -c release --arch arm64 --show-bin-path)/CCSeva"

APP="dist/CCSeva.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$BIN_PATH" "$APP/Contents/MacOS/CCSeva"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key>
	<string>CCSeva</string>
	<key>CFBundleIdentifier</key>
	<string>com.iamshankhadeep.ccseva</string>
	<key>CFBundleName</key>
	<string>CCSeva</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>2.0.0</string>
	<key>CFBundleVersion</key>
	<string>2.0.0</string>
	<key>LSMinimumSystemVersion</key>
	<string>14.0</string>
	<key>LSUIElement</key>
	<true/>
	<key>NSSupportsAutomaticTermination</key>
	<false/>
</dict>
</plist>
PLIST

codesign --force -s - "$APP"
echo "Built and ad-hoc signed: $APP"
