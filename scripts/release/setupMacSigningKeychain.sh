#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[setup-mac-signing] This script requires macOS"
  exit 1
fi

if [[ -z "${ELECTROBUN_DEVELOPER_ID_P12_BASE64:-}" ]]; then
  echo "[setup-mac-signing] missing ELECTROBUN_DEVELOPER_ID_P12_BASE64"
  exit 1
fi

if [[ -z "${ELECTROBUN_DEVELOPER_ID_P12_PASSWORD:-}" ]]; then
  echo "[setup-mac-signing] missing ELECTROBUN_DEVELOPER_ID_P12_PASSWORD"
  exit 1
fi

KEYCHAIN_PASSWORD="${ELECTROBUN_KEYCHAIN_PASSWORD:-}"
if [[ -z "$KEYCHAIN_PASSWORD" ]]; then
  KEYCHAIN_PASSWORD="$(openssl rand -hex 16)"
fi

KEYCHAIN_PATH="${RUNNER_TEMP:-/tmp}/nolo-desktop-signing.keychain-db"
CERT_PATH="${RUNNER_TEMP:-/tmp}/nolo-developer-id.p12"

python3 - <<'PY' "$ELECTROBUN_DEVELOPER_ID_P12_BASE64" "$CERT_PATH"
import base64, pathlib, sys
encoded = sys.argv[1]
dest = pathlib.Path(sys.argv[2])
dest.write_bytes(base64.b64decode(encoded))
PY

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security import "$CERT_PATH" -k "$KEYCHAIN_PATH" -P "$ELECTROBUN_DEVELOPER_ID_P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH" login.keychain-db

echo "[setup-mac-signing] installed signing identities:"
security find-identity -v -p codesigning "$KEYCHAIN_PATH"
