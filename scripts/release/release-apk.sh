#!/usr/bin/env bash
# 本地发布 APK：构建 release APK 并上传到服务器
# 用法：
#   ./scripts/release-apk.sh            # 自动检测当前分支
#   ./scripts/release-apk.sh main       # 发布到 nolo.chat
#   ./scripts/release-apk.sh alpha      # 发布到 us.nolo.chat
#
# 必须设置的环境变量（可放在 .env.apk 中）：
#   NOLO_RELEASE_KEY_ALIAS
#   NOLO_RELEASE_STORE_PASSWORD
#   NOLO_RELEASE_KEY_PASSWORD
#   可从 .env.apk.example 复制模板
#
# 可选：
#   NOLO_ANDROID_KEYSTORE_BASE64  若设置则从 base64 解码生成 keystore
#                                  否则使用 android/app/nolo-android-release-key.keystore

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

KEYSTORE_PATH="android/app/nolo-android-release-key.keystore"
APK_OUT="android/app/build/outputs/apk/release/app-universal-release.apk"

# ---------- 加载 .env.apk（如果存在）----------
if [[ -f ".env.apk" ]]; then
  # shellcheck disable=SC1091
  set -o allexport
  source .env.apk
  set +o allexport
fi

# ---------- 分支 ----------
BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

case "$BRANCH" in
  main)
    REMOTE_HOST="${REMOTE_HOST:-${MAIN_SSH_HOST:-}}"
    REMOTE_USER="nolotus"
    REMOTE_DIR="/home/nolotus/bun-nolo/public/downloads"
    PUBLIC_BASE="https://nolo.chat/public/downloads"
    ;;
  alpha)
    REMOTE_HOST="${REMOTE_HOST:-${ALPHA_SSH_HOST:-}}"
    REMOTE_USER="root"
    REMOTE_DIR="/root/bun-nolo/public/downloads"
    PUBLIC_BASE="https://us.nolo.chat/public/downloads"
    ;;
  *)
    echo "[release-apk] ❌ 不支持的分支: $BRANCH（仅支持 main / alpha）"
    exit 1
    ;;
esac

if [[ -z "$REMOTE_HOST" ]]; then
  echo "[release-apk] ❌ 缺少真实 SSH host。请设置 REMOTE_HOST，或 alpha 用 ALPHA_SSH_HOST、main 用 MAIN_SSH_HOST；不要用 Cloudflare 域名。" >&2
  exit 1
fi

APK_NAME="nolo-latest.apk"
PUBLIC_URL="$PUBLIC_BASE/$APK_NAME"

echo "[release-apk] 分支: $BRANCH → $REMOTE_HOST"

# ---------- 检查必要环境变量 ----------
missing_vars=()
for var_name in NOLO_RELEASE_KEY_ALIAS NOLO_RELEASE_STORE_PASSWORD NOLO_RELEASE_KEY_PASSWORD; do
  if [[ -z "${!var_name:-}" ]]; then
    missing_vars+=("$var_name")
  fi
done

if (( ${#missing_vars[@]} > 0 )); then
  echo "[release-apk] ❌ 缺少签名环境变量: ${missing_vars[*]}" >&2
  echo "[release-apk] 请在当前 shell 设置，或写入本地 .env.apk（已被 .gitignore 忽略）。" >&2
  exit 1
fi

# ---------- 准备 keystore ----------
if [[ -n "${NOLO_ANDROID_KEYSTORE_BASE64:-}" ]]; then
  echo "[release-apk] 从 NOLO_ANDROID_KEYSTORE_BASE64 解码 keystore..."
  printf '%s' "$NOLO_ANDROID_KEYSTORE_BASE64" | base64 --decode > "$KEYSTORE_PATH"
elif [[ ! -f "$KEYSTORE_PATH" ]]; then
  echo "[release-apk] ❌ keystore 不存在: $KEYSTORE_PATH"
  echo "       请放置 keystore 文件或设置 NOLO_ANDROID_KEYSTORE_BASE64"
  exit 1
fi

# gradle 通过 System.getenv() 读取签名配置
export NOLO_RELEASE_STORE_FILE="nolo-android-release-key.keystore"

# ---------- 写入 local.properties ----------
echo "sdk.dir=${ANDROID_HOME:-$HOME/Library/Android/sdk}" > android/local.properties

# ---------- 构建 release APK ----------
echo "[release-apk] 开始构建 release APK..."
cd android
./gradlew app:assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  --parallel \
  --build-cache \
  -x lint -x test
cd "$ROOT_DIR"

echo "[release-apk] ✅ 构建完成: $APK_OUT"

# ---------- 上传 ----------
echo "[release-apk] 上传到 $REMOTE_USER@$REMOTE_HOST..."
ssh "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"
scp "$APK_OUT" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/$APK_NAME"

echo "[release-apk] 验证..."
curl -sI "$PUBLIC_URL" | sed -n '1,8p'

echo ""
echo "[release-apk] ✅ 发布成功"
echo "[release-apk] 下载地址: $PUBLIC_URL"

# ---------- 清理 keystore（仅当从 base64 生成时）----------
if [[ -n "${NOLO_ANDROID_KEYSTORE_BASE64:-}" ]]; then
  rm -f "$KEYSTORE_PATH"
fi
