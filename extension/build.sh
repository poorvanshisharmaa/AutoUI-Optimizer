#!/usr/bin/env bash
# build.sh — packages the extension into a .zip ready for Chrome Web Store upload
# Usage: bash build.sh
# After updating config.js with real URLs, re-run this to get a new zip.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../dist"
ZIP_NAME="autoui-optimizer-extension.zip"

echo "Building AutoUI Optimizer extension..."

# Generate icons if missing
if [ ! -f "$SCRIPT_DIR/icons/icon128.png" ]; then
  echo "  Generating icons..."
  python3 "$SCRIPT_DIR/icons/generate_icons.py"
fi

# Validate manifest
python3 -c "import json; json.load(open('$SCRIPT_DIR/manifest.json'))" \
  && echo "  manifest.json valid" \
  || { echo "  ERROR: invalid manifest.json"; exit 1; }

# Validate config.js exists and has both URLs
grep -q "DEFAULT_API" "$SCRIPT_DIR/config.js"  || { echo "ERROR: config.js missing DEFAULT_API"; exit 1; }
grep -q "DASHBOARD_URL" "$SCRIPT_DIR/config.js" || { echo "ERROR: config.js missing DASHBOARD_URL"; exit 1; }
echo "  config.js valid"

mkdir -p "$OUT_DIR"

# Remove old zip
rm -f "$OUT_DIR/$ZIP_NAME"

# Create zip — exclude dev/build artifacts
cd "$SCRIPT_DIR"
zip -r "$OUT_DIR/$ZIP_NAME" . \
  --exclude "*.sh" \
  --exclude "*.md" \
  --exclude ".DS_Store" \
  --exclude "node_modules/*" \
  --exclude "icons/generate_icons.py" \
  --exclude ".git/*"

SIZE=$(du -sh "$OUT_DIR/$ZIP_NAME" | cut -f1)
echo ""
echo "Build complete!"
echo "  Output: $OUT_DIR/$ZIP_NAME  ($SIZE)"
echo ""

# Print current URLs from config.js for confirmation
API=$(grep "DEFAULT_API" "$SCRIPT_DIR/config.js" | grep -o '"[^"]*onrender[^"]*\|"[^"]*localhost[^"]*"' | tr -d '"')
DASH=$(grep "DASHBOARD_URL" "$SCRIPT_DIR/config.js" | grep -o '"[^"]*"' | tr -d '"')
echo "  API URL   : $API"
echo "  Dashboard : $DASH"
echo ""
echo "To test locally:"
echo "  chrome://extensions → Developer Mode → Load unpacked → $(dirname $SCRIPT_DIR)/extension"
echo ""
echo "To publish:"
echo "  https://chrome.google.com/webstore/devconsole → Upload $ZIP_NAME"
