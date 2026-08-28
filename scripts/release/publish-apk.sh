#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
APK_PATH="${APK_PATH:-android/app/build/outputs/apk/release/app-universal-release.apk}"
APK_NAME="${APK_NAME:-nolo-latest.apk}"

case "$BRANCH" in
  alpha)
    REMOTE_HOST="${REMOTE_HOST:-${ALPHA_SSH_HOST:-}}"
    REMOTE_USER="${REMOTE_USER:-root}"
    REMOTE_DIR="${REMOTE_DIR:-/root/bun-nolo/public/downloads}"
    PUBLIC_BASE="${PUBLIC_BASE:-https://us.nolo.chat/public/downloads}"
    ;;
  main)
    REMOTE_HOST="${REMOTE_HOST:-${MAIN_SSH_HOST:-}}"
    REMOTE_USER="${REMOTE_USER:-nolotus}"
    REMOTE_DIR="${REMOTE_DIR:-/home/nolotus/bun-nolo/public/downloads}"
    PUBLIC_BASE="${PUBLIC_BASE:-https://nolo.chat/public/downloads}"
    ;;
  *)
    echo "[publish-apk] Unsupported branch: $BRANCH"
    echo "[publish-apk] Use: alpha | main"
    exit 1
    ;;
esac

if [[ -z "$REMOTE_HOST" ]]; then
  echo "[publish-apk] Missing real SSH host. Set REMOTE_HOST, or ALPHA_SSH_HOST for alpha / MAIN_SSH_HOST for main; do not use the Cloudflare hostname." >&2
  exit 1
fi

if [[ ! -f "$APK_PATH" ]]; then
  echo "[publish-apk] APK not found: $APK_PATH"
  echo "[publish-apk] Build it first: cd android && ./gradlew app:assembleRelease"
  exit 1
fi

REMOTE_TARGET="$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$APK_NAME"
PUBLIC_URL="$PUBLIC_BASE/$APK_NAME"

echo "[publish-apk] Branch      : $BRANCH"
echo "[publish-apk] Local APK   : $APK_PATH"
echo "[publish-apk] Remote path : $REMOTE_TARGET"

ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"
scp "$APK_PATH" "$REMOTE_TARGET"

echo "[publish-apk] Uploaded. Verifying..."
curl -sI "$PUBLIC_URL" | sed -n '1,8p'

echo "[publish-apk] Done"
echo "[publish-apk] Download URL: $PUBLIC_URL"
