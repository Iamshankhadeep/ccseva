#!/bin/bash
# Builds CCSeva.app (arm64, release) into swift/dist/.
set -euo pipefail

cd "$(dirname "$0")/.."

swift build -c release --arch arm64
BIN_DIR="$(swift build -c release --arch arm64 --show-bin-path)"
BIN_PATH="$BIN_DIR/CCSeva"

APP="dist/CCSeva.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$BIN_PATH" "$APP/Contents/MacOS/CCSeva"

# App icon (shared with the Electron build) so Finder/Dock show the real mark.
if [ -f assets/icon.icns ]; then
	cp assets/icon.icns "$APP/Contents/Resources/AppIcon.icns"
elif [ -f ../assets/icon.icns ]; then
	cp ../assets/icon.icns "$APP/Contents/Resources/AppIcon.icns"
fi

# SwiftPM emits bundled resources (Fira Code fonts) into CCSeva_CCSeva.bundle next
# to the binary. Bundle.module resolves it relative to the executable at runtime,
# so it must sit in Contents/Resources alongside the app's other resources.
RESOURCE_BUNDLE="$BIN_DIR/CCSeva_CCSeva.bundle"
if [ -d "$RESOURCE_BUNDLE" ]; then
	cp -R "$RESOURCE_BUNDLE" "$APP/Contents/Resources/"
else
	echo "WARNING: resource bundle not found at $RESOURCE_BUNDLE (fonts will not load)" >&2
fi

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
	<key>CFBundleIconFile</key>
	<string>AppIcon</string>
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
