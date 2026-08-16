#!/usr/bin/env bash
# Launch Chrome with remote debugging enabled for Playwright/CDP automation.
# macOS only. Default port 9222; override with CHROME_CDP_PORT.

set -euo pipefail

PORT="${CHROME_CDP_PORT:-9222}"

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "This script currently supports macOS only. OSTYPE=$OSTYPE"
  exit 1
fi

CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME_APP" ]]; then
  echo "Google Chrome not found at: $CHROME_APP"
  exit 1
fi

# If Chrome is already running with the requested CDP port, just print it.
if lsof -Pi ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Chrome CDP already listening on http://127.0.0.1:$PORT"
  exit 0
fi

# Choose profile: daily Chrome profile or isolated automation profile.
USE_DEFAULT_PROFILE="${CHROME_CDP_USE_DEFAULT_PROFILE:-0}"
if [[ "$USE_DEFAULT_PROFILE" == "1" ]]; then
  PROFILE_DIR="${CHROME_CDP_PROFILE_DIR:-$HOME/Library/Application Support/Google/Chrome}"
  # Chrome locks the profile to one running instance. If normal Chrome is already
  # running with the default profile, a second launch will fail or steal windows.
  if pgrep -x "Google Chrome" >/dev/null 2>&1; then
    echo "ERROR: Google Chrome is already running."
    echo "To use your daily profile with CDP, quit Chrome completely first (Cmd+Q), then rerun."
    exit 1
  fi
  echo "Starting your daily Chrome profile with CDP on http://127.0.0.1:$PORT"
else
  PROFILE_DIR="${CHROME_CDP_PROFILE_DIR:-$HOME/Library/Application Support/Google/ChromeCDP}"
  mkdir -p "$PROFILE_DIR"
  echo "Starting isolated Chrome profile with CDP on http://127.0.0.1:$PORT"
fi

exec "$CHROME_APP" \
  --remote-debugging-port="$PORT" \
  --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "$@"
