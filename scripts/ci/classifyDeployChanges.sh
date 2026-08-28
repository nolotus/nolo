#!/usr/bin/env bash
set -Eeuo pipefail

BASE_SHA="${1:-}"
TARGET_SHA="${2:-HEAD}"

# Missing or stale refs must fall back to the full deploy. A false positive here
# costs time; a false negative could leave alpha running old code.
if [[ -z "$BASE_SHA" ]] \
  || ! git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null \
  || ! git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
  echo deploy
  exit 0
fi

changed=0
while IFS= read -r -d '' path; do
  [[ -n "$path" ]] || continue
  changed=1
  case "$path" in
    docs/*) ;;
    *)
      echo deploy
      exit 0
      ;;
  esac
done < <(git diff --no-renames --name-only -z "$BASE_SHA" "$TARGET_SHA")

if [[ "$changed" == "1" ]]; then
  echo skip
else
  # Equal refs are unexpected for a webhook job; stay conservative.
  echo deploy
fi
