#!/usr/bin/env bash
# build.sh — packages the extension into a .zip ready for Chrome Web Store upload
# Usage: bash build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../dist"
ZIP_NAME="autoui-optimizer-extension.zip"

echo "🔨 Building AutoUI Optimizer extension..."

# 1. Ensure icons exist
if [ ! -f "$SCRIPT_DIR/icons/icon128.png" ]; then
  echo "  Generating icons..."
  cd "$SCRIPT_DIR/icons"
  python3 generate_icons.py
  cd "$SCRIPT_DIR"
fi

# 2. Validate manifest
echo "  Validating manifest.json..."
python3 -c "import json,sys; json.load(open('$SCRIPT_DIR/manifest.json'))" \
  && echo "  manifest.json is valid JSON" \
  || { echo "  ERROR: manifest.json is invalid"; exit 1; }

# 3. Create dist directory
mkdir -p "$OUT_DIR"

# 4. Create zip (exclude dev files, source maps, node_modules)
cd "$SCRIPT_DIR"
zip -r "$OUT_DIR/$ZIP_NAME" . \
  --exclude "*.sh" \
  --exclude "*.md" \
  --exclude "*.DS_Store" \
  --exclude "node_modules/*" \
  --exclude "icons/generate_icons.py" \
  --exclude ".git/*"

SIZE=$(du -sh "$OUT_DIR/$ZIP_NAME" | cut -f1)
echo ""
echo "✅ Build complete!"
echo "   Output : $OUT_DIR/$ZIP_NAME"
echo "   Size   : $SIZE"
echo ""
echo "📦 Next steps:"
echo "   1. Test locally: chrome://extensions → Load unpacked → select this folder"
echo "   2. Upload to store: https://chrome.google.com/webstore/devconsole"
echo "      - One-time \$5 developer registration fee required"
echo "      - Upload $ZIP_NAME as a new item"
