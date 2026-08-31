#!/usr/bin/env bash
#
# T4 行为测试用的 deployRemote.sh 加载器。
#
# 为什么需要它：本次要证明的核心命题是「core 部署路径一行没变、chat-proxy 不被
# core 的停机/清理函数碰到」。纯字符串断言（source contract）只能证明代码长什么样，
# 证明不了**运行时到底对 PM2 发了哪些命令**。所以这里把 deployRemote.sh 的
# 「定义段」原样 source 进来（顶层执行段从 `cd "$REPO_DIR"` 开始，整段裁掉），
# 再配一个假 pm2 记录全部调用，由测试对调用序列做断言。
#
# 用法：SCRIPT=<deployRemote.sh> SCENARIO_FILE=<场景库> SCENARIO=<函数名> bash 本文件
set -Eeuo pipefail

: "${SCRIPT:?SCRIPT is required}"
: "${SCENARIO_FILE:?SCENARIO_FILE is required}"
: "${SCENARIO:?SCENARIO is required}"

defs="$(mktemp)"
# 顶层执行从 `cd "$REPO_DIR"` 起，裁掉它到文件尾，只留变量与函数定义。
sed '/^cd "\$REPO_DIR"$/,$d' "$SCRIPT" >"$defs"
if grep -q '^cd "\$REPO_DIR"$' "$defs"; then
  echo "harness error: failed to strip the top-level execution section" >&2
  exit 2
fi
# shellcheck disable=SC1090
source "$defs"
rm -f "$defs"
# deployRemote.sh 在定义段里装了 EXIT/INT/TERM trap（cleanup_on_exit），
# 测试进程不需要它，摘掉以免干扰退出码。
trap - EXIT INT TERM

# shellcheck disable=SC1090
source "$SCENARIO_FILE"

"$SCENARIO"
