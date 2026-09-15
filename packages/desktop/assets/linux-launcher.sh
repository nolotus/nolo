#!/bin/sh
# nolo-linux-launcher-preflight
#
# This file is the source of truth for the wrapper that installs get as
# `bin/launcher`; the real Electrobun launcher is shipped next to it as
# `bin/launcher-bin` and injected by
# packages/desktop/scripts/linuxLauncherPreflight.ts.
#
# WHY: CEF refuses to initialize when its profile lock — a symlink
# "<hostname>-<pid>" at ~/.cache/<identifier>/<channel>/CEF/SingletonLock — names a
# different host than this machine ("another Chromium process on another machine is
# already using this profile"). Electrobun 2.0.2 does not abort when CefInitialize
# fails: it continues into BrowserWindow creation and dies inside libcef.so with
# SIGSEGV, so the user sees a silent crash on launch. Such a lock is left behind when
# the machine is renamed (hostname change) or when a cache dir is copied/synced from
# another machine. App code (Resources/app) cannot fix it: CEF is initialized before
# app code runs, so the only hook we own is this entry point itself.
#
# WHAT: exactly that provably stale case. The Singleton* entries are MOVED (never
# deleted) into a timestamped backup directory next to the CEF profile, then the real
# launcher runs. Same-host locks are left untouched: live-or-dead-pid staleness stays
# Chromium's decision, so a second instance, extra windows and per-channel isolation
# behave exactly as before.
set -u

self_path=$0
if resolved=$(readlink -f -- "$self_path" 2>/dev/null) && [ -n "$resolved" ]; then
  self_path=$resolved
fi
script_dir=$(CDPATH= cd -- "$(dirname -- "$self_path")" 2>/dev/null && pwd) || script_dir=
app_dir=$(dirname -- "${script_dir:-$self_path}")

real_launcher=$app_dir/bin/launcher-bin
if [ ! -x "$real_launcher" ]; then
  echo "[nolo-launcher] cannot find the Nolo Desktop launcher binary: $real_launcher" >&2
  echo "[nolo-launcher] this file is a generated wrapper around bin/launcher-bin; reinstall Nolo Desktop." >&2
  exit 1
fi

clear_stale_cross_host_lock() {
  [ -n "${HOME:-}" ] || return 0
  version_file=$app_dir/Resources/version.json
  [ -f "$version_file" ] || return 0

  json=$(tr -d '\n' < "$version_file" 2>/dev/null) || return 0
  [ -n "$json" ] || return 0
  # First occurrence only (a duplicated or nested key must not silently point the
  # preflight at another directory), then charset-validate: identifier/channel are
  # build identifiers, so anything outside [A-Za-z0-9._-] means "do not touch".
  identifier=$(printf '%s' "$json" | grep -o '"identifier"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed 's/^[^:]*:[[:space:]]*"//; s/"$//')
  channel=$(printf '%s' "$json" | grep -o '"channel"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n 1 | sed 's/^[^:]*:[[:space:]]*"//; s/"$//')
  case $identifier in ''|*[!A-Za-z0-9._-]*) return 0 ;; esac
  case $channel in ''|*[!A-Za-z0-9._-]*) return 0 ;; esac

  profile_dir=$HOME/.cache/$identifier/$channel/CEF
  lock_file=$profile_dir/SingletonLock
  [ -L "$lock_file" ] || return 0

  lock_target=$(readlink -- "$lock_file" 2>/dev/null) || return 0
  [ -n "$lock_target" ] || return 0
  lock_host=${lock_target%-*}
  this_host=$(uname -n 2>/dev/null) || return 0
  [ -n "$this_host" ] || return 0
  [ "$lock_host" != "$this_host" ] || return 0

  backup_dir=$HOME/.cache/$identifier/$channel/preflight-lock-backup/$(date +%Y%m%d-%H%M%S)-$$
  mkdir -p -- "$backup_dir" 2>/dev/null || return 0

  moved=0
  for name in SingletonLock SingletonCookie SingletonSocket; do
    if [ -e "$profile_dir/$name" ] || [ -L "$profile_dir/$name" ]; then
      if mv -- "$profile_dir/$name" "$backup_dir/$name" 2>/dev/null; then
        moved=$((moved + 1))
      fi
    fi
  done

  echo "[nolo-launcher] recovered stale CEF profile lock from host '$lock_host' (this host: '$this_host'); moved $moved file(s) to $backup_dir" >&2
  return 0
}

clear_stale_cross_host_lock
exec "$real_launcher" "$@"
