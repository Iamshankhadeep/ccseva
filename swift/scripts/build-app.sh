#!/bin/bash
# Builds CCSeva.app (arm64, release) into swift/dist/.
set -euo pipefail

cd "$(dirname "$0")/.."

APP_VERSION="${CCSEVA_VERSION:-2.0.0}"
APP_VERSION="${APP_VERSION#v}"
if [[ ! "$APP_VERSION" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]]; then
	echo "Invalid CCSEVA_VERSION: $APP_VERSION" >&2
	exit 1
fi

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

# Keep the SwiftPM resource bundle in the standard signed-app resource directory.
# CCSevaResources resolves this location in packaged builds and falls back to
# Bundle.module when running directly through SwiftPM.
RESOURCE_BUNDLE="$BIN_DIR/CCSeva_CCSeva.bundle"
if [ -d "$RESOURCE_BUNDLE" ]; then
	cp -R "$RESOURCE_BUNDLE" "$APP/Contents/Resources/"
else
	echo "WARNING: resource bundle not found at $RESOURCE_BUNDLE (fonts will not load)" >&2
fi

cat > "$APP/Contents/Info.plist" <<PLIST
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
	<string>$APP_VERSION</string>
	<key>CFBundleVersion</key>
	<string>$APP_VERSION</string>
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
