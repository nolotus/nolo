#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-strict}"

HAS_DEVELOPER_ID=0
HAS_API_KEY_NOTARY=0
HAS_APPLE_ID_NOTARY=0

if [[ -n "${ELECTROBUN_DEVELOPER_ID:-}" ]]; then
  HAS_DEVELOPER_ID=1
fi

if [[ -n "${ELECTROBUN_APPLEAPIISSUER:-}" && -n "${ELECTROBUN_APPLEAPIKEY:-}" && -n "${ELECTROBUN_APPLEAPIKEYPATH:-}" ]]; then
  HAS_API_KEY_NOTARY=1
fi

if [[ -n "${ELECTROBUN_APPLEID:-}" && -n "${ELECTROBUN_APPLEIDPASS:-}" && -n "${ELECTROBUN_TEAMID:-}" ]]; then
  HAS_APPLE_ID_NOTARY=1
fi

HAS_NOTARY=0
if [[ "$HAS_API_KEY_NOTARY" -eq 1 || "$HAS_APPLE_ID_NOTARY" -eq 1 ]]; then
  HAS_NOTARY=1
fi

echo "[verify-mac-signing-env] developer-id=$HAS_DEVELOPER_ID api-key-notary=$HAS_API_KEY_NOTARY apple-id-notary=$HAS_APPLE_ID_NOTARY mode=$MODE"

if [[ "$MODE" = "optional" ]]; then
  echo "[verify-mac-signing-env] ok"
  exit 0
fi

if [[ "$HAS_DEVELOPER_ID" -ne 1 ]]; then
  echo "[verify-mac-signing-env] missing ELECTROBUN_DEVELOPER_ID"
  exit 1
fi

if [[ "$HAS_NOTARY" -ne 1 ]]; then
  echo "[verify-mac-signing-env] missing notarization credentials"
  echo "[verify-mac-signing-env] provide either:"
  echo "  - ELECTROBUN_APPLEAPIISSUER + ELECTROBUN_APPLEAPIKEY + ELECTROBUN_APPLEAPIKEYPATH"
  echo "  - or ELECTROBUN_APPLEID + ELECTROBUN_APPLEIDPASS + ELECTROBUN_TEAMID"
  exit 1
fi

echo "[verify-mac-signing-env] ok"
