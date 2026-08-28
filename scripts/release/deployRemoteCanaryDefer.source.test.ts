import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "bun:test";

/**
 * canary「就绪后再进场」的部署侧契约。
 *
 * 背景：Linux 的 SO_REUSEPORT 是 hash-balance，canary 一 bind 就分到真实流量，
 * 而它此刻还在等旧进程释放 LevelDB 锁——这才是部署窗口里 401 的真正来源
 * （锁交接本身实测只要 ~150ms）。开关打开后 canary 拿到 DB 才 bind。
 *
 * 这条测试锁住三件容易写错、写错就出事的事：
 * 1. 默认必须关闭——它改的是部署关键路径，要先在一次可观察的部署里验证；
 * 2. 开启时脚本不能再探共享端口的 /health（canary 根本没 bind，必然超时）；
 * 3. 启动 canary 前必须清掉上次的 boot-ready 文件，否则会被当成「秒起」，
 *    脚本立刻停掉旧进程，而 canary 其实还没加载完。
 */

const source = readFileSync(
  join(import.meta.dir, "deployRemote.sh"),
  "utf8"
);

const ciSource = readFileSync(
  join(import.meta.dir, "../ci/runAlphaServerCi.sh"),
  "utf8"
);

/**
 * 取出每一处 `bash ./scripts/release/deployRemote.sh` 调用之前的 env 前缀块。
 *
 * 之所以遍历而不是写死两个 marker：runAlphaServerCi.sh 里有三处调用
 * （deploy_alpha_artifact / deploy_main_remote / alpha_maintenance），
 * 第一版护栏只覆盖了前两处，于是「alpha 已打开 defer」这句话对维护路径
 * 并不成立。遍历能保证以后新增调用点自动纳入检查。
 */
function collectDeployEnvBlocks() {
  const blocks: { hosts: string; text: string }[] = [];
  const lines = ciSource.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    // 必须匹配真正的调用行，不能只看是否含 "deployRemote.sh"——
    // 注释里提到脚本名会被误判成调用点（第一版就踩了）。
    if (!/^\s*bash\s+\.\/scripts\/release\/deployRemote\.sh\s*$/.test(lines[i])) {
      continue;
    }
    // 往回收集连续的续行 env 前缀，直到遇到不以 \\ 结尾的行
    let start = i - 1;
    while (start >= 0 && lines[start].trim().endsWith("\\")) start -= 1;
    const text = lines.slice(start + 1, i + 1).join("\n");
    const hosts = /NOLO_CADDY_HOSTS=("?)([^"\s\\]*)\1/.exec(text)?.[2] ?? "";
    blocks.push({ hosts, text });
  }
  return blocks;
}

describe("蓝绿 canary defer-listen 部署契约", () => {
  it("默认关闭", () => {
    expect(source).toContain('NOLO_BLUE_GREEN_DEFER_LISTEN="${NOLO_BLUE_GREEN_DEFER_LISTEN:-0}"');
  });

  it("canary 启动时把开关和 boot-ready 文件传给进程", () => {
    const canaryStart = source.slice(
      source.indexOf("start_nolo_canary() {"),
      source.indexOf("graceful_stop_slot() {")
    );
    expect(canaryStart).toContain('NOLO_DEFER_LISTEN_UNTIL_READY="$NOLO_BLUE_GREEN_DEFER_LISTEN"');
    expect(canaryStart).toContain('NOLO_BOOT_READY_FILE="$NOLO_BLUE_GREEN_BOOT_READY_FILE"');
  });

  it("启动 canary 前清掉残留的 boot-ready 文件", () => {
    const reload = source.slice(source.indexOf("blue_green_reload_nolo() {"));
    expect(
      reload.indexOf('rm -f "$NOLO_BLUE_GREEN_BOOT_READY_FILE"')
    ).toBeLessThan(reload.indexOf("start_nolo_canary"));
  });

  it("defer 开启时走 boot-ready 文件而不是共享端口 /health", () => {
    const reload = source.slice(source.indexOf("blue_green_reload_nolo() {"));
    expect(reload).toContain('if [[ "$NOLO_BLUE_GREEN_DEFER_LISTEN" == "1" ]]; then');
    const branchStart = reload.indexOf(
      'if [[ "$NOLO_BLUE_GREEN_DEFER_LISTEN" == "1" ]]; then'
    );
    const deferBranch = reload.slice(
      branchStart,
      reload.indexOf("\n  else", branchStart)
    );
    expect(deferBranch).toContain('-f "$NOLO_BLUE_GREEN_BOOT_READY_FILE"');
    expect(deferBranch).not.toContain("x-nolo-slot");
  });

  it("两条路径都在等到 canary 之后才停旧进程", () => {
    const reload = source.slice(source.indexOf("blue_green_reload_nolo() {"));
    expect(reload.indexOf("start_nolo_canary")).toBeLessThan(
      reload.indexOf('graceful_stop_slot "$old_slot"')
    );
  });
});

describe("alpha CI 的 defer 开关接线", () => {
  const blocks = collectDeployEnvBlocks();

  it("找齐了全部 deployRemote.sh 调用点", () => {
    // 少于 3 说明提取逻辑失效（比如 env 块被写成别的形状），
    // 此时下面几条断言会「全绿但什么都没检查」。
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  it("每一处部署都打开 defer（alpha 先行验证后已推广到 main）", () => {
    // 2026-08-22：alpha 连续多次部署实测无 DB 暴露窗口为 0、public 探针 0 失败后，
    // main 一并打开。断言「全部打开」而不是「只有 alpha 打开」——遗漏任何一处
    // 都会让那处的 canary 退回提前进场，且各路径行为不一致会让验证数据口径变杂。
    for (const { hosts, text } of blocks) {
      expect(
        text.includes("NOLO_BLUE_GREEN_DEFER_LISTEN=1"),
        `hosts=${hosts || "<none>"} 的部署块未打开 defer`
      ).toBe(true);
    }
  });

  it("env 续行块里不许出现注释行", () => {
    // 这条不是洁癖：`VAR=1 \` 之后紧跟 `# 注释` 会被续行拼成
    // `VAR=1 # 注释`，把整串 env 前缀拦腰截断——deployRemote.sh 会丢掉
    // REPO_DIR / PM2_BIN / ARTIFACT_PATH 等变量而照常启动。
    // `bash -n` 语法检查完全查不出来（语法合法，语义全错），已变异验证。
    for (const { hosts, text } of blocks) {
      const commentLines = text.split("\n").filter((line) => /^\s*#/.test(line));
      expect(commentLines, `hosts=${hosts || "<none>"} 的 env 块内出现注释行`).toEqual([]);
    }
  });
});
