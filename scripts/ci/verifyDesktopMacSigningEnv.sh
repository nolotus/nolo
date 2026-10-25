#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-strict}"

HAS_DEVELOPER_ID=0
HAS_API_KEY_NOTARY=0
HAS_APPLE_ID_NOTARY=0
# 「出现过任意一项签名凭据」——包括只配了一半的半配置。ad-hoc 模式必须据此
# fail closed：半配置被静默降级成 ad-hoc 发布，等于把 owner 配错的证书悄悄
# 变成一个装得上但不受信任的产物，比直接失败更难排查。
HAS_ANY_SIGNING_CREDENTIAL=0

# API Key 的**内容**（.p8）不是签名凭据变量本身：它要落盘成文件才会被
# ELECTROBUN_APPLEAPIKEYPATH 消费。但「只配了 key 内容、漏了 key ID」是一个
# 必须被看见的半配置——若不把 key 的存在性告诉本脚本，这个状态对闸门完全
# 不可见，会被误判成「一条凭据都没有」而静默降级成 ad-hoc。故 workflow 用
# ELECTROBUN_APPLEAPIKEY_P8_PRESENT 传递**存在性**（不是内容）。
#
# 注意 GitHub Actions 的表达式求值：secret 未配置时，`${{ secrets.X != '' }}`
# 求值为布尔 false，插值进 env 后是**字符串 "false"** 而不是空串。若直接用
# `-n` 判空，"false" 会被当成「已配置」，于是「完全没配」反而被 fail-closed
# 拦下（2026-10-19 e4fff8bde 踩过同类的 GHA 布尔字符串坑）。故显式排除。
if [[ -n "${ELECTROBUN_APPLEAPIKEY_P8_PRESENT:-}" && "${ELECTROBUN_APPLEAPIKEY_P8_PRESENT}" != "false" ]]; then
  HAS_ANY_SIGNING_CREDENTIAL=1
fi

if [[ -n "${ELECTROBUN_DEVELOPER_ID:-}" ]]; then
  HAS_DEVELOPER_ID=1
  HAS_ANY_SIGNING_CREDENTIAL=1
fi

if [[ -n "${ELECTROBUN_APPLEAPIISSUER:-}" && -n "${ELECTROBUN_APPLEAPIKEY:-}" && -n "${ELECTROBUN_APPLEAPIKEYPATH:-}" && -f "${ELECTROBUN_APPLEAPIKEYPATH:-}" ]]; then
  HAS_API_KEY_NOTARY=1
  HAS_ANY_SIGNING_CREDENTIAL=1
fi

if [[ -n "${ELECTROBUN_APPLEID:-}" && -n "${ELECTROBUN_APPLEIDPASS:-}" && -n "${ELECTROBUN_TEAMID:-}" ]]; then
  HAS_APPLE_ID_NOTARY=1
  HAS_ANY_SIGNING_CREDENTIAL=1
fi

# 半配置也要计入：例如只给了 APPLE_API_ISSUER 而没给 KEY，完整三元组判定为假，
# 但这仍然是「owner 正在配签名凭据」的信号，不能当作「完全没有凭据」。
for VAR_NAME in ELECTROBUN_DEVELOPER_ID ELECTROBUN_APPLEAPIISSUER ELECTROBUN_APPLEAPIKEY ELECTROBUN_APPLEAPIKEYPATH ELECTROBUN_APPLEID ELECTROBUN_APPLEIDPASS ELECTROBUN_TEAMID; do
  if [[ -n "${!VAR_NAME:-}" ]]; then
    HAS_ANY_SIGNING_CREDENTIAL=1
  fi
done

HAS_NOTARY=0
if [[ "$HAS_API_KEY_NOTARY" -eq 1 || "$HAS_APPLE_ID_NOTARY" -eq 1 ]]; then
  HAS_NOTARY=1
fi

echo "[verify-mac-signing-env] developer-id=$HAS_DEVELOPER_ID api-key-notary=$HAS_API_KEY_NOTARY apple-id-notary=$HAS_APPLE_ID_NOTARY any-credential=$HAS_ANY_SIGNING_CREDENTIAL mode=$MODE"

if [[ "$MODE" = "optional" ]]; then
  echo "[verify-mac-signing-env] ok"
  exit 0
fi

# ad-hoc 模式：仅当「确实一个签名凭据都没有」时放行。
# 有凭据（有或没有配全）都必须继续 fail closed——这时应当走正式签名 + 公证，
# 或者由 owner 补齐配置，而不是把问题静默降级成 ad-hoc。
if [[ "$MODE" = "adhoc" ]]; then
  if [[ "$HAS_ANY_SIGNING_CREDENTIAL" -ne 0 ]]; then
    echo "[verify-mac-signing-env] signing credentials are present; refusing to fall back to ad-hoc signing"
    echo "[verify-mac-signing-env] fix the Apple signing/notarization credentials, or remove them entirely to build an ad-hoc artifact"
    exit 1
  fi
  echo "[verify-mac-signing-env] ok (ad-hoc: no Apple signing credentials configured)"
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
