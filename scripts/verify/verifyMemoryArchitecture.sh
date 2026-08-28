#!/bin/bash
# verifyMemoryArchitecture.sh — 记忆架构端到端验证
#
# 对照 docs/记忆架构-进化思考.md 的框架，用 nolo memory CLI 验证：
#   1. 写入 → 读取链路
#   2. scope 分层（user vs space）
#   3. 置信度是否区分来源（当前 bug：不区分）
#   4. 删除链路
#   5. patternKey 标记
#
# 用法：bash scripts/verify/verifyMemoryArchitecture.sh
# 依赖：nolo CLI 已登录

set -euo pipefail

PASS=0
FAIL=0
SKIP=0
CLEANUP_IDS=()

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓ PASS${NC}: $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; FAIL=$((FAIL+1)); }
skip() { echo -e "${YELLOW}⊘ SKIP${NC}: $1"; SKIP=$((SKIP+1)); }

cleanup() {
  if [ ${#CLEANUP_IDS[@]} -gt 0 ]; then
    echo "--- cleanup: deleting ${#CLEANUP_IDS[@]} test memories ---"
    for id in "${CLEANUP_IDS[@]}"; do
      nolo memory delete --id "$id" --yes --json >/dev/null 2>&1 || true
    done
  fi
}
trap cleanup EXIT

echo "============================================"
echo "记忆架构端到端验证"
echo "对照 docs/记忆架构-进化思考.md"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# Test 1: 写入 → 读取链路（episodic, scope=auto）
# ---------------------------------------------------------------------------
echo "--- Test 1: 写入 → 读取链路 ---"
RESULT=$(nolo memory remember \
  --content "verify-test: 用户偏好先看结论" \
  --kind episodic \
  --scope auto \
  --json 2>/dev/null)

MEM_ID=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['id'])" 2>/dev/null || echo "")
if [ -n "$MEM_ID" ]; then
  CLEANUP_IDS+=("$MEM_ID")
  # 读取验证
  LISTED=$(nolo memory list --kind episodic --limit 50 --json 2>/dev/null | \
    python3 -c "import json,sys; d=json.load(sys.stdin); items=[i for i in d.get('items',[]) if i['id']=='$MEM_ID']; print(len(items))" 2>/dev/null || echo "0")
  if [ "$LISTED" = "1" ]; then
    ok "episodic 写入后可读取 (id=$MEM_ID)"
  else
    fail "episodic 写入后 list 未找到 (id=$MEM_ID, listed=$LISTED)"
  fi
else
  fail "episodic 写入失败：无 id 返回"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 2: scope=auto 默认写入 user
# ---------------------------------------------------------------------------
echo "--- Test 2: scope=auto 默认 owner=user ---"
if [ -n "$MEM_ID" ]; then
  OWNER_TYPE=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['resolvedScopes'][0]['ownerType'])" 2>/dev/null || echo "")
  if [ "$OWNER_TYPE" = "user" ]; then
    ok "scope=auto → ownerType=user (符合 §2 决策表：用户个人偏好走 user)"
  else
    fail "scope=auto → ownerType=$OWNER_TYPE (期望 user)"
  fi
else
  skip "scope=auto 验证（Test 1 失败）"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 3: 置信度是否区分来源（当前 bug 验证）
# 期望：用户明确说的 confidence 应 > agent 推测的
# 现状：remember CLI 不接受 source 参数，所有 confidence 固定 0.72
# ---------------------------------------------------------------------------
echo "--- Test 3: 置信度是否区分来源（§3.2 判别标准）---"
CONF=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['confidence'])" 2>/dev/null || echo "")
if [ -n "$CONF" ]; then
  # CLI 没有传 source 的参数，confidence 应该是固定值
  if [ "$CONF" = "0.72" ]; then
    # 线上未部署时 confidence 固定 0.72；部署后应为 0.5（agent-inferred 默认）
    echo "  ⚠ 线上 confidence=0.72（固定值）— 代码已修为按 source 区分，待部署"
    fail "confidence=$CONF 是固定值，不区分来源（§3.2 要求：用户说的 0.9 vs 推测的 0.3）— 代码已修，待部署"
  elif [ "$CONF" = "0.5" ]; then
    ok "confidence=$CONF (已按 source 区分，agent-inferred 默认 0.5)"
  else
    ok "confidence=$CONF (非固定值，可能已区分来源)"
  fi
else
  skip "置信度验证（Test 1 失败）"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 4: patternKey 标记
# ---------------------------------------------------------------------------
echo "--- Test 4: patternKey 标记 ---"
PK=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0].get('patternKey',''))" 2>/dev/null || echo "")
if [ "$PK" = "agent-remember" ]; then
  ok "patternKey=agent-remember (有来源标记)"
else
  fail "patternKey=$PK (期望 agent-remember)"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 5: kind=procedural 的 importance 应高于 episodic
# ---------------------------------------------------------------------------
echo "--- Test 5: procedural importance > episodic importance ---"
PROC_RESULT=$(nolo memory remember \
  --content "verify-test: 排障时先看 selectedItems 再看 message 组装" \
  --kind procedural \
  --scope auto \
  --json 2>/dev/null)
PROC_ID=$(echo "$PROC_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['id'])" 2>/dev/null || echo "")
if [ -n "$PROC_ID" ]; then
  CLEANUP_IDS+=("$PROC_ID")
  PROC_IMP=$(echo "$PROC_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['importance'])" 2>/dev/null || echo "0")
  EPI_IMP=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['importance'])" 2>/dev/null || echo "0")
  # procedural 应 0.88, episodic 应 0.82
  if python3 -c "exit(0 if float('$PROC_IMP') > float('$EPI_IMP') else 1)" 2>/dev/null; then
    ok "procedural importance=$PROC_IMP > episodic importance=$EPI_IMP"
  else
    fail "procedural importance=$PROC_IMP ≤ episodic importance=$EPI_IMP"
  fi
else
  fail "procedural 写入失败"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 6: 删除链路
# ---------------------------------------------------------------------------
echo "--- Test 6: 删除链路 ---"
if [ -n "$PROC_ID" ]; then
  DEL_RESULT=$(nolo memory delete --id "$PROC_ID" --yes --json 2>/dev/null)
  DEL_COUNT=$(echo "$DEL_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('deletedCount',0))" 2>/dev/null || echo "0")
  if [ "$DEL_COUNT" = "1" ]; then
    ok "删除成功 (id=$PROC_ID)"
    # 从 cleanup 列表移除已删的
    CLEANUP_IDS=("${CLEANUP_IDS[@]/$PROC_ID}")
  else
    fail "删除失败 (id=$PROC_ID, deletedCount=$DEL_COUNT)"
  fi
else
  skip "删除验证（procedural 写入失败）"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 7: subjectType — 验证 Story B 缺口
# CLI memory remember 不接受 agentKey 参数，subjectType 应为 user
# ---------------------------------------------------------------------------
echo "--- Test 7: subjectType 验证（Story B 缺口）---"
SUBJECT_TYPE=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['subjectType'])" 2>/dev/null || echo "")
if [ "$SUBJECT_TYPE" = "user" ]; then
  ok "CLI remember → subjectType=user (CLI 不支持 agentKey，Story B 需 agent runtime 注入)"
else
  fail "subjectType=$SUBJECT_TYPE (期望 user)"
fi
echo ""

# ---------------------------------------------------------------------------
# Test 8: 同一 content 重复写入（去重/更新行为）
# ---------------------------------------------------------------------------
echo "--- Test 8: 重复写入行为 ---"
DUP1=$(nolo memory remember --content "verify-test-dup: 测试重复写入" --kind episodic --scope auto --json 2>/dev/null)
DUP1_ID=$(echo "$DUP1" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['id'])" 2>/dev/null || echo "")
DUP2=$(nolo memory remember --content "verify-test-dup: 测试重复写入" --kind episodic --scope auto --json 2>/dev/null)
DUP2_ID=$(echo "$DUP2" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['savedItems'][0]['id'])" 2>/dev/null || echo "")
if [ -n "$DUP1_ID" ] && [ -n "$DUP2_ID" ]; then
  CLEANUP_IDS+=("$DUP1_ID")
  CLEANUP_IDS+=("$DUP2_ID")
  if [ "$DUP1_ID" = "$DUP2_ID" ]; then
    ok "重复写入 → 同一 id（幂等去重）"
  else
    # 线上未部署时不去重；部署后应为同一 id
    echo "  ⚠ 线上重复写入产生不同 id — 代码已修为去重，待部署"
    fail "重复写入 → 不同 id ($DUP1_ID vs $DUP2_ID)，产生重复记忆（§3.2：应去重或合并）— 代码已修，待部署"
  fi
else
  fail "重复写入失败"
fi
echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "============================================"
echo "验证结果"
echo "============================================"
echo -e "PASS: ${GREEN}$PASS${NC}"
echo -e "FAIL: ${RED}$FAIL${NC}"
echo -e "SKIP: ${YELLOW}$SKIP${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "FAIL 的项对应 docs/记忆架构-进化思考.md §6 的代码差距："
  echo "  Test 3 fail → P0: 置信度不区分来源"
  echo "  Test 8 fail → P1: 缺去重/合并机制"
  exit 1
fi
exit 0