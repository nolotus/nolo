#!/usr/bin/env bash

set -Eeuo pipefail

render_url="${1:-${NOLO_RENDER_HEALTH_URL:-http://127.0.0.1:${APP_HTTP_PORT:-38123}/}}"
verify_originals="${NOLO_VERIFY_ASSET_ORIGINALS:-1}"
attempts="${NOLO_VERIFY_ASSET_ATTEMPTS:-3}"
retry_delay_seconds="${NOLO_VERIFY_ASSET_RETRY_DELAY_SECONDS:-3}"

manifest_url="$(python3 - "$render_url" <<'PY'
import sys
from urllib.parse import urljoin

print(urljoin(sys.argv[1], "/public/latest-assets.json"))
PY
)"

verify_once() {
  local html_file
  local manifest_file
  local asset_file
  local status=0
  html_file="$(mktemp)"
  manifest_file="$(mktemp)"
  asset_file="$(mktemp)"

  if ! curl -fsS "$render_url" -o "$html_file"; then
    status=1
  fi

  if (( status == 0 )) && ! curl -fsS "$manifest_url" -o "$manifest_file"; then
    status=1
  fi

  if (( status == 0 )) && ! python3 - "$render_url" "$html_file" "$manifest_url" "$manifest_file" > "$asset_file" <<'PY'
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin

render_url, html_path, manifest_url, manifest_path = sys.argv[1:5]
seen = set()

def emit(base_url: str, value: object) -> None:
    if not isinstance(value, str):
        return
    path = value.split("?", 1)[0]
    if not path.startswith("/public/assets/"):
        return
    if not (path.endswith(".css") or path.endswith(".js")):
        return
    absolute = urljoin(base_url, value)
    if absolute in seen:
        return
    seen.add(absolute)
    print(absolute)

html = Path(html_path).read_text(encoding="utf-8", errors="replace")
for match in re.finditer(r'''(?:href|src)=["']([^"']+)["']''', html):
    emit(render_url, match.group(1))

try:
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8", errors="replace"))
except json.JSONDecodeError as error:
    raise SystemExit(f"invalid public/latest-assets.json: {error}") from error

for key in ("js", "css", "artifactRuntimeJs"):
    emit(manifest_url, manifest.get(key))

for value in manifest.get("artifactRuntimePreloads") or []:
    emit(manifest_url, value)
PY
  then
    status=1
  fi

  local asset_count=0
  local asset_failures=0

  if (( status == 0 )); then
    while IFS= read -r asset_url; do
      [[ -n "$asset_url" ]] || continue
      asset_count=$((asset_count + 1))
      echo "   asset ${asset_count}: ${asset_url}"

      if ! curl -fsS -H "Accept-Encoding: br,gzip" "$asset_url" -o /dev/null; then
        echo "   ❌ compressed path failed: ${asset_url}"
        asset_failures=1
      fi

      if [[ "$verify_originals" == "1" ]] && ! curl -fsS "$asset_url" -o /dev/null; then
        echo "   ❌ original missing: ${asset_url}"
        asset_failures=1
      fi
    done < "$asset_file"

    if (( asset_count == 0 )); then
      echo "❌ rendered page and public/latest-assets.json did not reference any /public/assets CSS/JS files"
      status=1
    fi

    if (( asset_failures != 0 )); then
      echo "❌ rendered web asset verification failed (${asset_count} files)"
      status=1
    fi
  fi

  rm -f "$html_file" "$manifest_file" "$asset_file"

  if (( status == 0 )); then
    echo "✅ rendered web asset verification passed (${asset_count} files, verifyOriginals=${verify_originals})"
  fi
  return "$status"
}

echo "🔎 verifyRenderedWebAssets.sh render=${render_url}"
for ((attempt = 1; attempt <= attempts; attempt++)); do
  echo "rendered web asset verification attempt ${attempt}/${attempts}"
  if verify_once; then
    exit 0
  fi

  if (( attempt < attempts )); then
    echo "⏳ rendered web asset verification failed; retrying in ${retry_delay_seconds}s"
    sleep "$retry_delay_seconds"
  fi
done

echo "❌ rendered web asset verification failed after ${attempts} attempts"
exit 1
