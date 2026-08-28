#!/usr/bin/env bash
# cf-build-client.sh — 独立可执行的 CF builder 客户端。
#
# 职责：POST /build → 轮询 /status → 校验 head 身份 → 下载 /artifact。
# 集中了「CF 调用 + 轮询 + 下载 + 校验」全部逻辑，供 runAlphaServerCi.sh 的
# cf_build_alpha_offload 调用，也可被 bun test 用 mock CF builder 直接做行为测试。
#
# 用法：
#   cf-build-client.sh <BASE_URL> <WORK_DIR> [EXPECT_SHA] [POLL_INTERVAL_S] [TIMEOUT_S]
# 退出码：0=成功（产物已写入 <WORK_DIR>/web-build.tar.gz 且身份校验通过）；
#          非 0=任一环节失败（调用方回退宿主本地构建，部署永远完成）。
#
# 安全：token 永不进进程 argv——由调用方经环境变量 NOLO_CF_BUILDER_TOKEN 传入
#       （非 argv），本脚本统一经 curl --config 文件承载（mktemp 生成、chmod 600、
#       trap 清理），避免 secret 出现在 ps/proc cmdline。缺失即退出非零。

set -Eeuo pipefail

if [[ $# -lt 2 ]]; then
  echo "cf-build-client: usage: $0 <BASE_URL> <WORK_DIR> [EXPECT_SHA] [POLL_INTERVAL_S] [TIMEOUT_S]" >&2
  exit 2
fi

# HIGH：token 只经环境变量传入，绝不占 argv。
TOKEN="${NOLO_CF_BUILDER_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "cf-build-client: NOLO_CF_BUILDER_TOKEN is empty (token must be passed via env, not argv)" >&2
  exit 1
fi

BASE_URL="${1%/}"
WORK_DIR="$2"
EXPECT_SHA="${3:-}"
POLL_INTERVAL_S="${4:-15}"
TIMEOUT_S="${5:-900}"

# MEDIUM-1：interval/timeout 必须是非负有限数字，非法即回退。
re='^[0-9]+([.][0-9]+)?$'
if [[ ! "$POLL_INTERVAL_S" =~ $re || ! "$TIMEOUT_S" =~ $re ]]; then
  echo "cf-build-client: invalid poll interval/timeout (interval=${POLL_INTERVAL_S} timeout=${TIMEOUT_S})" >&2
  exit 1
fi

mkdir -p "$WORK_DIR"

# HIGH：token 出 argv —— 用 --config 文件承载 header，权限 600，trap 清理。
CURL_CFG="$(mktemp)"
chmod 600 "$CURL_CFG"
printf 'header = "X-Builder-Token: %s"\n' "$TOKEN" > "$CURL_CFG"
cleanup() { rm -f "$CURL_CFG"; }
trap cleanup EXIT
CURL_ARGS=(-sS -f -K "$CURL_CFG")

# 轮询超时边界（MEDIUM-1）：以单调 deadline 判定，绝不因 sleep 跨上限。
start_sec="$(date +%s)"
deadline_sec="$(awk -v s="$start_sec" -v t="$TIMEOUT_S" 'BEGIN { printf "%.6f", s + t }')"

now_sec() { date +%s.%N; }
le() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a <= b) }'; }
gt() { awk -v a="$1" -v b="$2" 'BEGIN { exit !(a > b) }'; }

echo "cf-build-client: POST ${BASE_URL}/build branch=alpha"
build_resp="$(curl "${CURL_ARGS[@]}" -X POST "$BASE_URL/build" \
  -H "Content-Type: application/json" \
  -d '{"branch":"alpha"}')" || {
  echo "cf-build-client: POST /build failed" >&2
  exit 1
}
# /build 成功响应必须带 "ok":true，否则视为失败回退。
if [[ "$build_resp" != *'"ok":true'* ]]; then
  echo "cf-build-client: POST /build did not report ok:true" >&2
  exit 1
fi

st=""
head=""
while :; do
  now="$(now_sec)"
  if gt "$now" "$deadline_sec"; then
    echo "cf-build-client: timeout after ${TIMEOUT_S}s" >&2
    exit 1
  fi
  # 不跨上限地 sleep：取 min(interval, deadline-now)；<=0 则直接判超时。
  remaining="$(awk -v d="$deadline_sec" -v n="$now" 'BEGIN { printf "%.6f", d - n }')"
  if le "$remaining" 0; then
    echo "cf-build-client: timeout after ${TIMEOUT_S}s" >&2
    exit 1
  fi
  sleep_sec="$(awk -v a="$POLL_INTERVAL_S" -v b="$remaining" 'BEGIN { if (a < b) print a; else print b }')"
  sleep "$sleep_sec"

  st="$(curl "${CURL_ARGS[@]}" "$BASE_URL/status" 2>/dev/null)" || {
    echo "cf-build-client: GET /status failed" >&2
    exit 1
  }
  # 显式失败（status 含 error/failed/ok:false 字面）直接回退，不等满超时。
  if [[ "$st" == *'"error"'* || "$st" == *'failed'* || "$st" == *'"ok":false'* ]]; then
    echo "cf-build-client: build reported failure" >&2
    exit 1
  fi
  # 成功判定：非空 head 且 artifactsReady=true。
  if [[ "$st" == *'"head":"'* ]] && [[ "$st" == *'"artifactsReady":true'* ]]; then
    head="$(printf '%s' "$st" | sed -n 's/.*"head":"\([0-9a-f]\{40\}\)".*/\1/p')"
    break
  fi
done

# BLOCK-2：构建身份校验——head 必须全 40 位且与期望 sha 一致；不匹配视为 CF 失败。
if [[ -z "$head" ]]; then
  echo "cf-build-client: /status head is not a valid 40-hex sha" >&2
  exit 1
fi
if [[ -n "$EXPECT_SHA" && "$head" != "$EXPECT_SHA" ]]; then
  echo "cf-build-client: head mismatch (got=${head} expected=${EXPECT_SHA})" >&2
  exit 1
fi

echo "cf-build-client: downloading ${BASE_URL}/artifact → ${WORK_DIR}/web-build.tar.gz"
if ! curl "${CURL_ARGS[@]}" -o "$WORK_DIR/web-build.tar.gz" "$BASE_URL/artifact"; then
  echo "cf-build-client: GET /artifact download failed" >&2
  exit 1
fi
if [[ ! -s "$WORK_DIR/web-build.tar.gz" ]]; then
  echo "cf-build-client: artifact empty" >&2
  exit 1
fi

# 打印下载产物 sha/字节数，证明后续部署的就是 CF 产物。
local_bytes="$(wc -c < "$WORK_DIR/web-build.tar.gz" | tr -d '[:space:]')"
echo "cf-build-client: artifact ready ($(shasum -a 256 "$WORK_DIR/web-build.tar.gz" | awk '{print $1}') bytes=$local_bytes) head=${head}"
exit 0