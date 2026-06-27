#!/bin/bash
set -e

# ── config ──────────────────────────────────────────────────────────────
REPO_DIR="/home/dilip/repos/wordout"
BUILDS_DIR="$REPO_DIR/builds"
APK_NAME="wordout.apk"

# ── get version from app.json ────────────────────────────────────────────
VERSION=$(node -e "console.log(require('./app.json').expo.version)")
BUILD=$(node -e "console.log(require('./app.json').expo.android.versionCode)")
TAG="v$VERSION"

echo "▶ Building Wordout $TAG (versionCode $BUILD)"

# ── build ────────────────────────────────────────────────────────────────
eas build --platform android --profile preview --local 2>&1 | tee ~/build_log.txt

# ── move APK to builds/ subdir ───────────────────────────────────────────
mkdir -p "$BUILDS_DIR"
mv "$REPO_DIR"/build-*.apk "$BUILDS_DIR/" 2>/dev/null || true

# ── find the APK ─────────────────────────────────────────────────────────
APK_PATH=$(ls -t "$BUILDS_DIR"/build-*.apk 2>/dev/null | head -1)

if [ -z "$APK_PATH" ]; then
  echo "✗ APK not found. Check ~/build_log.txt"
  exit 1
fi

echo "✓ APK found: $APK_PATH"

# ── copy to Downloads ────────────────────────────────────────────────────
cp "$APK_PATH" "$HOME/Downloads/$APK_NAME"
echo "✓ Copied to $HOME/Downloads/$APK_NAME"

# ── ADB install if phone connected ───────────────────────────────────────
if adb devices | grep -q "device$"; then
  echo "▶ Phone detected, installing..."
  adb install -r "$HOME/Downloads/$APK_NAME"
  echo "✓ Installed on device"
else
  echo "⚠ No phone connected, skipping ADB install"
fi

# ── GitHub Release ───────────────────────────────────────────────────────
echo "▶ Creating GitHub release $TAG..."

# Delete existing release/tag if exists (for re-runs)
gh release delete "$TAG" --yes 2>/dev/null || true
git tag -d "$TAG" 2>/dev/null || true
git push origin ":refs/tags/$TAG" 2>/dev/null || true

gh release create "$TAG" \
  "$HOME/Downloads/$APK_NAME" \
  --title "Wordout $TAG" \
  --notes "Release $TAG (versionCode $BUILD)" \
  --latest

echo "✓ GitHub release created: $TAG"
echo ""
echo "Install via:"
echo "  wget -O ~/Downloads/wordout.apk https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk && adb install -r ~/Downloads/wordout.apk"
