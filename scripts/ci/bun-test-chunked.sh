#!/bin/sh
# POSIX chunked serial A/B test runner (Bun 1.3.14 segfaults full-suite runs at ~2GB RSS).
# Each chunk = fresh bun process => memory reset. Same file list + chunking for both sides.
ROOT="$1"
OUT="$2"
LIST="$3"
CHUNK=40

cd "$ROOT" || exit 9
: > "$OUT"
total=$(wc -l < "$LIST" | tr -d ' ')
chunks=$(( (total + CHUNK - 1) / CHUNK ))
i=1
while [ $i -le $chunks ]; do
  start=$(( (i - 1) * CHUNK + 1 ))
  end=$(( i * CHUNK ))
  echo "===== CHUNK $i/$chunks =====" >> "$OUT"
  sed -n "${start},${end}p" "$LIST" | xargs bun test --isolate >> "$OUT" 2>&1
  echo "CHUNK_EXIT=$?" >> "$OUT"
  i=$(( i + 1 ))
done
echo "ALL_CHUNKS_DONE" >> "$OUT"
