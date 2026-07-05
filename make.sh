#!/bin/bash
# Wordout dev helper script
# Usage: ./make.sh <command>

set -e

REPO_DIR="$HOME/repos/wordout"
APK_URL="https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk"
AAB_URL="https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab"
APK_PATH="$REPO_DIR/releases/wordout-latest.apk"
AAB_PATH="$REPO_DIR/releases/wordout-latest.aab"
DEVICE_IP="192.168.68.107:5555"

cmd="$1"

cd "$REPO_DIR" 2>/dev/null || { echo "Repo not found at $REPO_DIR"; exit 1; }

adb_connect() {
  echo "Connecting to S24 Ultra at $DEVICE_IP..."
  adb connect "$DEVICE_IP" 2>/dev/null || true
  sleep 1
  if ! adb devices | grep -q "$DEVICE_IP"; then
    echo "⚠️  Could not connect to device. Is WiFi ADB enabled on the phone?"
    exit 1
  fi
}

case "$cmd" in
  build)
    echo "Triggering GitHub Actions build..."
    gh workflow run "Build APK"
    echo "Build started. Check status with: ./make.sh status"
    ;;

  status)
    echo "Recent workflow runs:"
    gh run list --limit 5
    ;;

  logs)
    echo "Latest run logs:"
    gh run view --log
    ;;

  watch)
    echo "Watching latest run..."
    gh run watch
    ;;

  install)
    echo "Downloading latest APK + AAB..."
    mkdir -p "$REPO_DIR/releases"
    wget -O "$APK_PATH" "$APK_URL"
    wget -O "$AAB_PATH" "$AAB_URL"
    adb_connect
    echo "Installing APK on device..."
    adb install -r "$APK_PATH"
    echo "✅ Installed. Copies saved to releases/"
    ;;

  push)
    echo "Installing local APK on device (no download)..."
    adb_connect
    adb install -r "$APK_PATH"
    echo "✅ Done."
    ;;

  fetch-aab)
    echo "Downloading latest AAB..."
    mkdir -p "$REPO_DIR/releases"
    wget -O "$AAB_PATH" "$AAB_URL"
    echo "✅ Saved to releases/wordout-latest.aab"
    ;;

  web)
    echo "Starting web dev server (cache cleared)..."
    npx expo start --web --clear
    ;;

  web-dirty)
    echo "Starting web dev server..."
    npx expo start --web
    ;;

  dev-android)
    echo "Starting dev server on connected Android device..."
    adb_connect
    npx expo start --android
    ;;

  adb-connect)
    adb_connect
    echo "✅ Connected."
    ;;

  build-install)
    echo "Triggering build, then waiting to install..."
    gh workflow run "Build APK"
    echo "Build started. Run './make.sh watch' to monitor, then './make.sh install' when done."
    ;;

  *)
    echo "Wordout dev helper"
    echo ""
    echo "Usage: ./make.sh <command>"
    echo ""
    echo "Commands:"
    echo "  build         Trigger GitHub Actions build"
    echo "  status        Show recent workflow runs"
    echo "  logs          Show latest run logs"
    echo "  watch         Watch latest run in real-time"
    echo "  install       Download latest APK + AAB, install APK on device"
    echo "  push          Install already-downloaded APK on device (no download)"
    echo "  fetch-aab     Download latest AAB only"
    echo "  web           Start web dev server (cache cleared)"
    echo "  web-dirty     Start web dev server (no cache clear)"
    echo "  dev-android   Start dev server on connected Android device (live reload)"
    echo "  adb-connect   Connect to S24 Ultra over WiFi"
    echo "  build-install Trigger build and remind to install after"
    ;;
esac
