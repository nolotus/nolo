#!/bin/sh
set -e

# Nolo CLI installer for macOS Apple Silicon and Linux x86_64.
# Usage: curl -fsSL https://nolo.chat/install-nolo.sh | sh
#        curl -fsSL https://us.nolo.chat/install-nolo.sh | sh
#
# What it does:
#   1. Downloads the prebuilt binary tarball for this platform.
#   2. Extracts it to ~/.nolo/<platform>/ and symlinks `nolo` into an install
#      dir (/usr/local/bin when writable, else ~/.local/bin, else ~/.nolo/bin).
#   3. When that install dir is not on PATH yet, adds a guarded PATH entry to
#      the shell startup files that already exist (~/.zshrc, ~/.bashrc,
#      ~/.bash_profile, ~/.profile) — or creates the one matching the login
#      shell when none exists — so a new bash/zsh terminal can run `nolo` with
#      no manual setup. Re-runs are idempotent (marker-guarded).
#
# Environment overrides:
#   NOLO_INSTALL_REPO         download base URL (default https://nolo.chat;
#                             us.nolo.chat is used as a fallback only when the
#                             default source fails and no explicit URL was given)
#   NOLO_INSTALL_TARBALL_URL  full tarball URL override
#   NOLO_INSTALL_CHANNEL      release channel: `latest` (default) or `alpha`.
#                             latest installs nolo-<platform>.tar.gz, alpha
#                             installs nolo-<platform>-alpha.tar.gz. Any other
#                             value is rejected before anything is downloaded.
#   NOLO_INSTALL_DIR          install dir for the `nolo` symlink
#   INSTALL_DIR               legacy alias for NOLO_INSTALL_DIR
#   NOLO_NO_MODIFY_PATH=1     leave shell startup files untouched and print the
#                             export line to add manually instead
#
# Integrity note: tarball integrity relies on HTTPS transport.
# SHA-256 verification is a future defense-in-depth improvement.

if [ -z "${HOME:-}" ]; then
  echo "Error: \$HOME is not set; cannot decide where to install nolo." >&2
  exit 1
fi

# Default to nolo.chat, with us.nolo.chat as a fallback if the primary
# source 404s. Override with NOLO_INSTALL_REPO env var.
if [ -z "$NOLO_INSTALL_REPO" ]; then
  NOLO_INSTALL_REPO="https://nolo.chat"
fi
REPO_BASE="$NOLO_INSTALL_REPO"

# 发布渠道：决定下载哪个固定对象名（alpha 为 nolo-<platform>-alpha.tar.gz）。
# 发布端生成 alpha 渠道的安装脚本时，正是把下面这一行里的默认值 latest 换成
# alpha（scripts/release/cliBinaryPublishPlan.ts 的 prepareCliInstallerSource），
# 所以这一行必须保持这种精确写法，且全文件只能出现一次。
NOLO_INSTALL_CHANNEL="${NOLO_INSTALL_CHANNEL:-latest}"
case "$NOLO_INSTALL_CHANNEL" in
  latest | alpha) ;;
  *)
    # 在解析平台/下载/改动安装目录之前就拒绝：未知渠道名没有对应的对象名，
    # 继续跑只会在网络上打一堆 404，或者在固有名回退里装错渠道。
    echo "Error: NOLO_INSTALL_CHANNEL must be 'latest' or 'alpha' (got '$NOLO_INSTALL_CHANNEL')." >&2
    exit 1
    ;;
esac

# Marks the PATH block written into shell startup files below: it keeps re-runs
# idempotent and lets users (or reviewers) find and delete the edit by hand.
PATH_MARKER="# nolo-cli-path"

install_dir() {
  if [ -n "$NOLO_INSTALL_DIR" ] || [ -n "$INSTALL_DIR" ]; then
    REQUESTED_DIR="${NOLO_INSTALL_DIR:-$INSTALL_DIR}"
    if [ "$REQUESTED_DIR" != "/" ]; then
      REQUESTED_DIR="${REQUESTED_DIR%/}"
    fi
    mkdir -p "$REQUESTED_DIR"
    echo "$REQUESTED_DIR"
    return
  fi
  if [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    echo "/usr/local/bin"
  elif [ -d "$HOME/.local/bin" ] && [ -w "$HOME/.local/bin" ]; then
    echo "$HOME/.local/bin"
  else
    mkdir -p "$HOME/.nolo/bin"
    echo "$HOME/.nolo/bin"
  fi
}

# Add the guarded PATH entry to one startup file. "$2" = "create" allows
# creating the file when it is missing (used for the login shell's primary
# startup file). Records the outcome in PATH_ENTRY_* / PATH_ENTRY_FILES.
add_path_entry() {
  rc_file="$1"
  if [ -f "$rc_file" ]; then
    if grep -qF "$PATH_MARKER" "$rc_file" 2>/dev/null; then
      if grep -qF "$BIN_DIR" "$rc_file" 2>/dev/null; then
        PATH_ENTRY_PRESENT=1
        return 0
      fi
      # A marked entry exists but points at another dir (earlier install landed
      # elsewhere): append a fresh block for the current install dir. The old
      # block is harmless — its `[ -d ... ]` guard only fires if that dir still
      # exists, and the new block prepends BIN_DIR.
    fi
  elif [ "$2" != "create" ]; then
    return 1
  fi

  if {
    printf '\n%s\n' "$PATH_MARKER"
    printf 'if [ -d "%s" ]; then\n' "$BIN_DIR"
    printf '  case ":$PATH:" in\n'
    printf '    *":%s:"*) ;;\n' "$BIN_DIR"
    printf '    *) PATH="%s:$PATH" ;;\n' "$BIN_DIR"
    printf '  esac\n'
    printf '  export PATH\n'
    printf 'fi\n'
  } >> "$rc_file" 2>/dev/null; then
    PATH_ENTRY_WRITTEN=1
    PATH_ENTRY_FILES="$PATH_ENTRY_FILES $rc_file"
    echo "Added $BIN_DIR to PATH in $rc_file"
    return 0
  fi

  echo "Warning: could not update $rc_file (permission denied)." >&2
  return 1
}

print_manual_path_hint() {
  echo "Add $BIN_DIR to your PATH, then open a new terminal:"
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
}

# `curl | sh` runs in a subshell, so exporting PATH here would never reach the
# user's interactive shell — the startup files are the only channel that works.
# bash and zsh also read different files: .zshrc for interactive zsh, .bashrc
# for interactive bash, .bash_profile/.profile for login shells (macOS
# terminals start login shells). Update every file that already exists and fall
# back to creating the login shell's primary file, so a bare `nolo` works in
# new terminals of either shell.
setup_path() {
  case ":$PATH:" in
    *":$BIN_DIR:"*)
      echo "nolo is already on your PATH ($BIN_DIR)."
      return 0
      ;;
  esac

  if [ "$NOLO_NO_MODIFY_PATH" = "1" ]; then
    print_manual_path_hint
    return 0
  fi

  primary_rc="$HOME/.profile"
  case "$(basename "${SHELL:-}")" in
    zsh)
      primary_rc="$HOME/.zshrc"
      ;;
    bash)
      if [ "$(uname -s)" = "Darwin" ]; then
        primary_rc="$HOME/.bash_profile"
      else
        primary_rc="$HOME/.bashrc"
      fi
      ;;
  esac

  PATH_ENTRY_WRITTEN=""
  PATH_ENTRY_PRESENT=""
  PATH_ENTRY_FILES=""

  add_path_entry "$HOME/.zshrc" "" || true
  add_path_entry "$HOME/.bashrc" "" || true
  add_path_entry "$HOME/.bash_profile" "" || true
  add_path_entry "$HOME/.profile" "" || true

  if [ -z "$PATH_ENTRY_WRITTEN" ] && [ -z "$PATH_ENTRY_PRESENT" ]; then
    add_path_entry "$primary_rc" "create" || true
  fi

  echo ""
  if [ -n "$PATH_ENTRY_WRITTEN" ]; then
    echo "PATH updated:${PATH_ENTRY_FILES}"
    echo "Open a new terminal (or run: exec \$SHELL -l) to use nolo here."
  elif [ -n "$PATH_ENTRY_PRESENT" ]; then
    echo "$BIN_DIR was already set up in your shell startup files."
    echo "Open a new terminal (or run: exec \$SHELL -l) to use nolo here."
  else
    print_manual_path_hint
  fi
}

CURRENT_LOCK_DIR=""
release_lock() {
  if [ -n "$CURRENT_LOCK_DIR" ] && [ -d "$CURRENT_LOCK_DIR" ]; then
    rm -f "$CURRENT_LOCK_DIR/pid" 2>/dev/null || true
    rmdir "$CURRENT_LOCK_DIR" 2>/dev/null || true
    CURRENT_LOCK_DIR=""
  fi
}

acquire_lock() {
  lock_dir="$1"
  retries=6
  while [ "$retries" -gt 0 ]; do
    if mkdir "$lock_dir" 2>/dev/null; then
      CURRENT_LOCK_DIR="$lock_dir"
      echo "$$" > "$lock_dir/pid" 2>/dev/null || true
      return 0
    fi
    existing_pid="$(cat "$lock_dir/pid" 2>/dev/null || true)"
    if [ -n "$existing_pid" ] && ! kill -0 "$existing_pid" 2>/dev/null; then
      rm -f "$lock_dir/pid" 2>/dev/null || true
      rmdir "$lock_dir" 2>/dev/null || true
      continue
    fi
    sleep 1
    retries=$((retries - 1))
  done
  return 1
}

# Probe a URL's response headers into "$2" and echo the HTTP status code of the
# final response (empty when nothing came back at all).
#
# HEAD is tried first. When the server will not answer it — 405/501 and similar
# gateway behavior, or no response — fall back to a 1-byte GET with
# `Range: bytes=0-0`. That still yields ETag/Last-Modified, so the download can
# proceed with resume support instead of being aborted just because HEAD failed.
# 404/410 are returned as-is: the caller treats them as a definitive "no such
# object" and does not bother with the range probe.
probe_metadata() {
  probe_url="$1"
  probe_out="$2"
  probe_code="$(curl -sS -I -L --connect-timeout 3 -m 4 "$probe_url" > "$probe_out" 2>/dev/null \
    && grep -i '^HTTP/' "$probe_out" | tail -n 1 | awk '{print $2}')"
  case "$probe_code" in
    404 | 410) ;;
    *)
      if [ -z "$probe_code" ] || [ "$probe_code" -ge 400 ] 2>/dev/null; then
        probe_code="$(curl -sS -L -r 0-0 --connect-timeout 3 -m 4 -o /dev/null -D "$probe_out" "$probe_url" 2>/dev/null \
          && grep -i '^HTTP/' "$probe_out" | tail -n 1 | awk '{print $2}')"
      fi
      ;;
  esac
  printf '%s' "$probe_code"
}

# 丢掉某个源的分片缓存（换源时调用）。分片/成品文件名里带源 URL 指纹与 validator
# 指纹，不同源本来就不会互相复用；这里再显式清一次，让「跨源拼接」在命名之外也
# 没有入口。已完成校验的成品（.tar.gz）不动：它自带 tar 校验，是有效的缓存。
discard_source_partials() {
  target_url="$1"
  target_name="$2"
  downloads_dir="$3"
  url_key="$(printf '%s' "$target_url" | cksum | awk '{print $1}')"
  file_stem="${target_name%.tar.gz}"
  rm -f "$downloads_dir/${file_stem}-${url_key}-"*.part 2>/dev/null || true
  rm -f "$downloads_dir/${file_stem}-${url_key}.part" 2>/dev/null || true
  return 0
}

download_tarball() {
  target_url="$1"
  target_name="$2"
  downloads_dir="$3"

  url_key="$(printf '%s' "$target_url" | cksum | awk '{print $1}')"
  file_stem="${target_name%.tar.gz}"
  lock_dir="$downloads_dir/.lock_${url_key}"
  acquire_lock "$lock_dir" || echo "Warning: could not acquire cache lock, continuing..." >&2

  case "$target_url" in
    file://*)
      final_file="$downloads_dir/${file_stem}-${url_key}.tar.gz"
      part_file="$downloads_dir/${file_stem}-${url_key}.part"
      src_path="${target_url#file://}"
      # file:// 没有 ETag/Last-Modified，用源文件字节数当内容指纹：固定名缓存
      # 与源文件大小不一致说明对象换了，必须重新取，不能因为「能解压」就复用。
      if [ -f "$final_file" ] && tar -tzf "$final_file" >/dev/null 2>&1 \
        && [ "$(wc -c < "$final_file" | tr -d ' ')" = "$(wc -c < "$src_path" 2>/dev/null | tr -d ' ')" ]; then
        DOWNLOADED_TARBALL="$final_file"
        release_lock
        return 0
      fi
      # file:// 是本地文件拷贝，不是网络下载：10 分钟上限只是极端兜底
      # （慢 NFS 挂载 / 超大包），不要当成与 HTTPS 路径同口径的超时预算。
      if ! curl -fL --progress-bar --connect-timeout 20 --max-time 600 --speed-limit 1 --speed-time 60 "$target_url" -o "$part_file"; then
        release_lock
        return 1
      fi
      if ! tar -tzf "$part_file" >/dev/null 2>&1; then
        echo "Error: downloaded archive verification failed" >&2
        release_lock
        return 1
      fi
      mv "$part_file" "$final_file"
      DOWNLOADED_TARBALL="$final_file"
      release_lock
      return 0
      ;;
  esac

  hdr_file="$(mktemp -t nolo-hdr-XXXXXX 2>/dev/null || mktemp /tmp/nolo-hdr-XXXXXX)"
  http_code="$(probe_metadata "$target_url" "$hdr_file")"

  # 只有 404/410（以及探测后仍然失败的响应）才判死；HEAD 被拒但 GET 可用的源
  # 已经由 probe_metadata 补探过一次，走到这里说明对象确实取不到。
  if [ -n "$http_code" ] && [ "$http_code" -ge 400 ] 2>/dev/null; then
    echo "Error: $target_url returned HTTP $http_code" >&2
    rm -f "$hdr_file" 2>/dev/null || true
    release_lock
    return 1
  fi
  if [ -z "$http_code" ]; then
    echo "Warning: could not probe download metadata; continuing without resume validator" >&2
  fi

  etag="$(grep -i '^etag:' "$hdr_file" | tail -n 1 | sed -e 's/^[eE][tT][aA][gG]:[[:space:]]*//' -e 's/[[:space:]\r]*$//')"
  last_mod="$(grep -i '^last-modified:' "$hdr_file" | tail -n 1 | sed -e 's/^[lL][aA][sS][tT]-[mM][oO][dD][iI][fF][iI][eE][dD]:[[:space:]]*//' -e 's/[[:space:]\r]*$//')"
  rm -f "$hdr_file" 2>/dev/null || true

  validator=""
  if [ -n "$etag" ]; then
    validator="$etag"
  elif [ -n "$last_mod" ]; then
    validator="$last_mod"
  fi

  val_key="noval"
  if [ -n "$validator" ]; then
    val_key="$(printf '%s' "$validator" | cksum | awk '{print $1}')"
  fi

  final_file="$downloads_dir/${file_stem}-${url_key}-${val_key}.tar.gz"
  part_file="$downloads_dir/${file_stem}-${url_key}-${val_key}.part"

  # 无 validator 就不存在「这份缓存是不是同一个对象」的判据：固定名 URL 内容
  # 变了以后旧缓存仍然能解压，复用就会装出旧包。这种缓存一律不复用，重新下载。
  if [ -n "$validator" ] && [ -f "$final_file" ] && tar -tzf "$final_file" >/dev/null 2>&1; then
    echo "Found verified cached download: $final_file"
    DOWNLOADED_TARBALL="$final_file"
    release_lock
    return 0
  fi

  attempt=0
  max_attempts=3
  while [ "$attempt" -lt "$max_attempts" ]; do
    attempt=$((attempt + 1))
    offset=0
    if [ -f "$part_file" ]; then
      offset="$(wc -c < "$part_file" | tr -d ' ')"
    fi

    if [ "$offset" -gt 0 ] && [ -n "$validator" ]; then
      echo "Resuming download from byte $offset..."
      if curl -fL --progress-bar --connect-timeout 10 --speed-limit 1024 --speed-time 30 -H "If-Range: $validator" -C - "$target_url" -o "$part_file"; then
        break
      else
        curl_rc=$?
        if [ "$curl_rc" -eq 33 ]; then
          echo "Server rejected Range request; restarting download from beginning..."
          : > "$part_file"
          if curl -fL --progress-bar --connect-timeout 10 --speed-limit 1024 --speed-time 30 "$target_url" -o "$part_file"; then
            break
          fi
        fi
      fi
    else
      if curl -fL --progress-bar --connect-timeout 10 --speed-limit 1024 --speed-time 30 "$target_url" -o "$part_file"; then
        break
      fi
    fi

    if [ "$attempt" -lt "$max_attempts" ]; then
      echo "Download interrupted, retrying ($attempt/$max_attempts)..."
      sleep 1
    fi
  done

  if [ ! -f "$part_file" ] || ! tar -tzf "$part_file" >/dev/null 2>&1; then
    echo "Error: download failed or archive verification failed for $target_url" >&2
    release_lock
    return 1
  fi

  mv "$part_file" "$final_file"
  DOWNLOADED_TARBALL="$final_file"
  release_lock
  return 0
}

main() {
  TARBALL_STEM=""
  EXTRACT_SUBDIR=""
  case "$(uname -sm)" in
    "Darwin arm64")
      TARBALL_STEM="nolo-darwin-arm64"
      EXTRACT_SUBDIR="nolo-darwin-arm64"
      ;;
    "Linux x86_64")
      TARBALL_STEM="nolo-linux-x64"
      EXTRACT_SUBDIR="nolo-linux-x64"
      ;;
    "Darwin x86_64")
      echo "macOS Intel is not yet supported by this installer. Use npm instead:"
      echo "  npm install -g nolo-cli"
      exit 1
      ;;
    *)
      echo "This installer supports macOS Apple Silicon and Linux x86_64. Use npm instead:"
      echo "  npm install -g nolo-cli"
      exit 1
      ;;
  esac

  # 渠道固定名互相独立：latest = nolo-<platform>.tar.gz，
  # alpha = nolo-<platform>-alpha.tar.gz。两者永不共用同一个对象名，所以主站
  # 失败退到镜像时（下面的 FALLBACK_URL 复用同一个 TARBALL_NAME）不会跨渠道，
  # 装了 alpha 的人也不会被一次失败的重试悄悄换回 stable。
  if [ "$NOLO_INSTALL_CHANNEL" = "alpha" ]; then
    TARBALL_NAME="${TARBALL_STEM}-alpha.tar.gz"
  else
    TARBALL_NAME="${TARBALL_STEM}.tar.gz"
  fi

  # 版本化对象：发布时除了固定名，还会上传 `nolo-<platform>-<version>.tar.gz`，
  # 历史版本对象不删除。所以「回滚」不需要重建旧包，只要指定版本装回去：
  #   NOLO_CLI_VERSION=0.150.0 curl -fsSL https://nolo.chat/install-nolo.sh | sh
  # 固定名继续指向最新版，默认安装行为不变。
  # 版本副本永远用发布时的原命名（alpha 版本号里已带 `-alpha.N`），因此这里从
  # TARBALL_STEM 起拼，不在渠道固定名上再叠一个渠道后缀。
  if [ -n "${NOLO_CLI_VERSION:-}" ]; then
    TARBALL_NAME="${TARBALL_STEM}-${NOLO_CLI_VERSION}.tar.gz"
    echo "Pinned nolo version: ${NOLO_CLI_VERSION}"
  fi

  TARBALL_URL="${NOLO_INSTALL_TARBALL_URL:-$REPO_BASE/public/downloads/$TARBALL_NAME}"
  # 默认源列表：主站 → CF 镜像，按此顺序逐个尝试。显式给出完整 URL 的调用方
  # （企业镜像、离线包、测试）只有一个源，绝不跨源回退——既尊重该地址，也避免
  # 离线环境意外打真实网络。
  SOURCE_URLS="$TARBALL_URL"
  if [ -z "${NOLO_INSTALL_TARBALL_URL:-}" ]; then
    if [ -n "${NOLO_INSTALL_MIRROR_REPO:-}" ]; then
      FALLBACK_URL="${NOLO_INSTALL_MIRROR_REPO%/}/public/downloads/$TARBALL_NAME"
    elif [ "$REPO_BASE" = "https://nolo.chat" ]; then
      FALLBACK_URL="https://us.nolo.chat/public/downloads/$TARBALL_NAME"
    else
      FALLBACK_URL="https://nolo.chat/public/downloads/$TARBALL_NAME"
    fi
    if [ "$TARBALL_URL" != "$FALLBACK_URL" ]; then
      SOURCE_URLS="$TARBALL_URL $FALLBACK_URL"
    fi
  fi
  BIN_DIR="$(install_dir)"
  if [ ! -w "$BIN_DIR" ]; then
    echo "Error: install dir $BIN_DIR is not writable." >&2
    echo "Re-run with NOLO_INSTALL_DIR=\"\$HOME/.nolo/bin\", or install via npm:" >&2
    echo "  npm install -g nolo-cli" >&2
    exit 1
  fi
  # A unique permanent directory, never a version-name-only destination.
  VERSIONS_DIR="$HOME/.nolo/$EXTRACT_SUBDIR.versions"
  mkdir -p "$VERSIONS_DIR"
  EXTRACT_DIR=$(mktemp -d "$VERSIONS_DIR/build.XXXXXXXX")
  DOWNLOADS_DIR="${NOLO_CACHE_DIR:-$HOME/.nolo/cache}/downloads"
  mkdir -p "$DOWNLOADS_DIR"
  trap 'release_lock' EXIT INT TERM HUP

  DOWNLOADED_TARBALL=""
  REMAINING_SOURCES="$(printf '%s\n' $SOURCE_URLS | wc -l | tr -d ' ')"
  for source_url in $SOURCE_URLS; do
    echo "Downloading nolo from $source_url..."
    if download_tarball "$source_url" "$TARBALL_NAME" "$DOWNLOADS_DIR"; then
      break
    fi
    REMAINING_SOURCES=$((REMAINING_SOURCES - 1))
    if [ "$REMAINING_SOURCES" -le 0 ]; then
      echo "Error: download failed from $source_url" >&2
      exit 1
    fi
    # 换源前丢弃这一源的分片：不同源的 ETag/Last-Modified 不可比，把 A 源的分片
    # 续到 B 源的对象上会得到一个字节级混合、却仍然解压得开的坏包。分片/成品名
    # 里已带「源 URL + validator」指纹（天然不会互相复用），这里再显式清一次。
    discard_source_partials "$source_url" "$TARBALL_NAME" "$DOWNLOADS_DIR"
    echo "Source unavailable, trying the next mirror..."
  done

  mkdir -p "$EXTRACT_DIR"
  tar -xzf "$DOWNLOADED_TARBALL" -C "$EXTRACT_DIR"
  chmod +x "$EXTRACT_DIR/nolo"

  # Validate before switching; preserve legacy directories and prior builds.
  VERSION_TEXT=$("$EXTRACT_DIR/nolo" -v)
  case "$VERSION_TEXT" in
    "nolo-cli "?*) VERSION=${VERSION_TEXT#nolo-cli } ;;
    "nolo-cli-"?*" "?*) VERSION=${VERSION_TEXT#* } ;;
    *) echo "Error: invalid staged CLI version" >&2; exit 1 ;;
  esac
  if ! printf '%s\n' "$VERSION" | grep -Eq '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'; then
    echo "Error: invalid staged CLI version" >&2
    exit 1
  fi
  LINK="$BIN_DIR/nolo.new.$$"
  if [ -d "$BIN_DIR/nolo" ] || { [ -e "$BIN_DIR/nolo" ] && [ ! -L "$BIN_DIR/nolo" ]; } || [ -e "$LINK" ] || [ -L "$LINK" ]; then
    echo "Error: unsafe install entrypoint" >&2
    exit 1
  fi
  ln -s "$EXTRACT_DIR/nolo" "$LINK"
  mv -f "$LINK" "$BIN_DIR/nolo"

  echo "nolo installed to $BIN_DIR/nolo"
  setup_path

  active_nolo="$(command -v nolo 2>/dev/null || true)"
  if [ -n "$active_nolo" ]; then
    case "$active_nolo" in
      "$BIN_DIR"/*) ;;
      *)
        echo ""
        echo "Note: this shell resolves 'nolo' to $active_nolo."
        echo "      The freshly installed binary is $BIN_DIR/nolo; it wins in new shells."
        ;;
    esac
  fi

  if [ -x "$EXTRACT_DIR/nolo" ]; then
    echo ""
    echo "Installed version:"
    # Call the extracted binary directly: an older `nolo` earlier on PATH must
    # not answer for the version we just installed.
    "$EXTRACT_DIR/nolo" doctor 2>/dev/null | head -n 3 || true
  fi
}

main
