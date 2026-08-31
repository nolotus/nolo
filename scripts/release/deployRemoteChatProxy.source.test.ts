import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { spawnCapturedSync } from "../test/spawnCapturedSync";

/**
 * T4：chat-proxy 的部署接线（独立 PM2 app + Caddy 分流）。
 *
 * 这个文件锁住的是**方案的自我否定条件**，不是锦上添花的覆盖率：
 *
 * 1. 新 app 名若被 core 的停机/清理匹配式命中，core 发布就会杀掉本方案要保护的
 *    进程 —— 收益归零且无人发现。所以既断言源码里的匹配式没漂移，也真的把
 *    deployRemote.sh 的函数 source 进来、配假 pm2 跑一遍，看它究竟对哪些 app
 *    名发了命令。
 * 2. chat-proxy 已在跑时，core 部署必须一条变更命令都不发（不停、不重启、不等）。
 * 3. 探活失败必须大声失败，但**不许**把 Caddy 指向没起来的端口、也不许连带
 *    回滚一次健康的 core 发布。
 * 4. 默认必须关闭：chat-proxy 角色下 chatHandler 仍直接 import serverDb，
 *    T2（call plan 内部端点）没上线前提前切流会让 /api/v1/chat 直接报错。
 *
 * ## 环境前提（必须满足，否则会误报失败）
 *
 * **不要用裸 `Bun.spawnSync` / `spawnSync` 读本文件下方行为测试的子进程输出。** `bun test`
 * 以仓库根为 cwd 做测试文件发现走查后，进程常驻上万 fd；一旦父进程持有的 fd 编号越过
 * 约 10240，裸 piped spawn 的子进程会「照样执行、但对 stdout/stderr 的每次写都失败」，
 * 于是 harness 里任何以写成败决定退出码的命令都变成无声 exit 1：stdout 空、stderr 空、
 * 连 `bash -x` 的 xtrace 也是零输出。它在瘦 worktree（如本分支）里天然是绿的，在完整
 * 主 checkout 里必挂 —— 与脚本逻辑无关，纯环境级故障，且症状会随 `ios/`、`node_modules/`
 * 体积漂移。所有读输出的 spawn 必须走 `../test/spawnCapturedSync`（见该模块头部说明）。
 * 只断言退出码的裸 spawn 是安全的（退出码不受影响）。
 *
 * 回归保护在 `scripts/test/spawnCapturedSync.source.test.ts`：它人为把 fd 压过阈值，
 * 因此即便在瘦 worktree 里也能复现并拦住这种退化。
 */

const releaseDir = import.meta.dir;
const fixturesDir = join(releaseDir, "__fixtures__");
const source = readFileSync(join(releaseDir, "deployRemote.sh"), "utf8");
const caddySource = readFileSync(join(releaseDir, "configureCaddyProxy.sh"), "utf8");

const CHAT_PROXY_APP_NAME = "nolo-chat-proxy";

function sliceFunction(text: string, name: string): string {
  const start = text.indexOf(`\n${name}() {`);
  expect(start, `函数 ${name} 未找到（重命名了？断言会变成空转）`).toBeGreaterThan(-1);
  const end = text.indexOf("\n}\n", start);
  expect(end, `函数 ${name} 缺少收尾 }`).toBeGreaterThan(start);
  return text.slice(start, end + 3);
}

// ---------------------------------------------------------------------------
// 1. 命名硬约束：新 app 名必须逃过 core 的每一条匹配式
// ---------------------------------------------------------------------------

describe("chat-proxy app 名与 core 停机匹配式的隔离", () => {
  it("core 的三条匹配式仍是精确名 nolo（漂移了这份论证就失效）", () => {
    // (1) nolo_exists / nolo_app_count / wait_for_nolo_app_count / nolo_pm2_field
    expect(sliceFunction(source, "nolo_exists")).toContain(
      "any(a.get('name') == 'nolo' for a in apps)"
    );
    expect(sliceFunction(source, "nolo_app_count")).toContain(
      'sum(1 for item in apps if item.get("name") == "nolo")'
    );
    expect(sliceFunction(source, "wait_for_nolo_app_count")).toContain(
      'current_count="$(nolo_app_count 2>/dev/null || echo unknown)"'
    );
    // (2) pm2 CLI 字面名参数
    expect(sliceFunction(source, "delete_nolo_and_wait")).toContain(
      'run_maybe_sudo "$PM2_BIN" delete nolo'
    );
    expect(sliceFunction(source, "delete_stale_nolo_instances")).toContain(
      '"$PM2_BIN" delete nolo'
    );
    // (3) jlist 子串匹配
    expect(sliceFunction(source, "graceful_stop_nolo")).toContain(
      `grep -q '"name":"nolo"'`
    );
    expect(sliceFunction(source, "blue_green_reload_nolo")).toContain(
      `grep -q '"name":"nolo"'`
    );
  });

  it("nolo-chat-proxy 逃过 jlist 子串匹配式（把匹配式在 JS 里原样重放）", () => {
    // graceful_stop_nolo / blue_green_reload_nolo 的匹配式带闭合双引号，
    // 所以 "nolo-chat-proxy" 的 jlist 片段不含 '"name":"nolo"'。
    const fragment = `{"name":"${CHAT_PROXY_APP_NAME}","pm2_env":{"status":"online"}}`;
    expect(fragment.includes('"name":"nolo"')).toBe(false);
    expect(fragment.includes('"name":"nolo-next"')).toBe(false);
    // 反面对照：真叫 nolo 就会被命中（证明上面那条不是空转）。
    expect(`{"name":"nolo","pm2_env":{}}`.includes('"name":"nolo"')).toBe(true);
  });

  it("nolo-chat-proxy 逃过精确名匹配与 canary slot 名", () => {
    expect(CHAT_PROXY_APP_NAME).not.toBe("nolo");
    expect(CHAT_PROXY_APP_NAME).not.toBe("nolo-next");
    expect(source).toContain(
      'CHAT_PROXY_APP_NAME="${NOLO_CHAT_PROXY_APP_NAME:-nolo-chat-proxy}"'
    );
    expect(source).toContain(
      'NOLO_BLUE_GREEN_CANARY_NAME="${NOLO_BLUE_GREEN_CANARY_NAME:-nolo-next}"'
    );
  });

  it("core 的停机/清理/蓝绿函数体里一个 chat-proxy 标识符都没有", () => {
    // 增量新增而非修改既有函数：这些函数不该因为本次改动多出任何分支。
    for (const fn of [
      "start_nolo",
      "rebuild_nolo",
      "graceful_stop_nolo",
      "delete_nolo_and_wait",
      "delete_stale_nolo_instances",
      "wait_for_nolo_app_count",
      "nolo_app_count",
      "nolo_exists",
      "start_nolo_canary",
      "graceful_stop_slot",
      "blue_green_reload_nolo",
      "reload_or_start_nolo",
      "recover_nolo_on_exit",
    ]) {
      const body = sliceFunction(source, fn);
      expect(body.toLowerCase(), `${fn} 不该提到 chat proxy`).not.toContain("chat_proxy");
      expect(body.toLowerCase(), `${fn} 不该提到 chat proxy`).not.toContain("chat-proxy");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. 默认关闭 + 接线位置
// ---------------------------------------------------------------------------

describe("chat-proxy 接线的默认值与位置", () => {
  it("默认关闭，且端口/探活默认值明确", () => {
    expect(source).toContain('CHAT_PROXY_ENABLED="${NOLO_CHAT_PROXY_ENABLED:-0}"');
    expect(source).toContain('CHAT_PROXY_RESTART="${NOLO_CHAT_PROXY_RESTART:-0}"');
    expect(source).toContain('CHAT_PROXY_HTTP_PORT="${NOLO_CHAT_PROXY_HTTP_PORT:-38124}"');
    expect(source).toContain('CHAT_PROXY_ROUTE_PATHS="${NOLO_CHAT_PROXY_ROUTE_PATHS:-/api/v1/chat}"');
  });

  it("探活走 /health 而不是 /ready（chat-proxy 不跑 core runtime，没有 buildSha 门）", () => {
    expect(source).toContain(
      'CHAT_PROXY_HEALTH_URL="${NOLO_CHAT_PROXY_HEALTH_URL:-http://127.0.0.1:${CHAT_PROXY_HTTP_PORT}/health}"'
    );
    const verify = sliceFunction(source, "verify_chat_proxy_health");
    expect(verify).toContain('"$CHAT_PROXY_HEALTH_URL"');
    expect(verify).not.toContain("/ready");
    expect(verify).not.toContain("resolve_nolo_ready_url");
  });

  it("接线排在 core 全部验证通过之后、configure-caddy-proxy 之前", () => {
    const coreHealthGate = source.indexOf('if ! retry_http_contains "nolo" "$SERVICE_HEALTH_URL" "ok"');
    const wire = source.indexOf('timed_deploy_step "wire-chat-proxy" wire_chat_proxy');
    const caddy = source.indexOf('timed_deploy_step "configure-caddy-proxy" configure_caddy_proxy');
    expect(coreHealthGate).toBeGreaterThan(-1);
    expect(wire).toBeGreaterThan(coreHealthGate);
    expect(caddy).toBeGreaterThan(wire);
  });

  it("chat-proxy 失败不触发 auto_rollback，只以非 0 退出", () => {
    const wireFn = sliceFunction(source, "wire_chat_proxy");
    expect(wireFn).not.toContain("auto_rollback");
    expect(wireFn).toContain("chat_proxy_failed=1");
    const tail = source.slice(source.indexOf('echo "🚀 热重载部署成功！'));
    expect(tail).toContain('if [[ "$chat_proxy_failed" == "1" ]]; then');
    expect(tail).toContain("exit 1");
    expect(tail).not.toContain("auto_rollback");
  });

  it("启动 chat-proxy 时注入 role/端口，且不开 reusePort", () => {
    const start = sliceFunction(source, "start_chat_proxy");
    expect(start).toContain("NOLO_SERVER_RUNTIME_ROLE=chat-proxy");
    expect(start).toContain('HTTP_PORT="$CHAT_PROXY_HTTP_PORT"');
    expect(start).toContain('--name "$CHAT_PROXY_APP_NAME"');
    expect(start).toContain("NOLO_REUSE_PORT=0");
  });
});

// ---------------------------------------------------------------------------
// 3. Caddy 分流
// ---------------------------------------------------------------------------

describe("Caddy chat 分流", () => {
  it("端口为空时不渲染 @chat（默认路径与拆分前一致）", () => {
    expect(caddySource).toContain(
      'CHAT_PROXY_UPSTREAM_PORT="${NOLO_CADDY_CHAT_PROXY_UPSTREAM_PORT:-}"'
    );
    const render = sliceFunction(caddySource, "render_chat_proxy_route_block");
    expect(render).toContain('if [[ -z "$CHAT_PROXY_UPSTREAM_PORT" ]]; then');
    expect(render).toContain("return 0");
  });

  it("@chat 必须排在 @stream 与 catch-all reverse_proxy 之前", () => {
    // Caddy 同类指令按书写顺序匹配，而 @stream 本身也包含 /api/v1/chat：
    // 顺序写反 = 分流静默失效且 caddy validate 照样通过。
    const chatPlaceholder = caddySource.indexOf("${chat_proxy_block}\t@stream path");
    const streamProxy = caddySource.indexOf("reverse_proxy @stream {args.0}:{args.1}");
    const catchAll = caddySource.indexOf("\n\treverse_proxy {args.0}:{args.1} {");
    expect(chatPlaceholder).toBeGreaterThan(-1);
    expect(chatPlaceholder).toBeLessThan(streamProxy);
    expect(streamProxy).toBeLessThan(catchAll);
  });

  it("chat 分流块保留 SSE 必需的 flush_interval -1 与真实客户端 IP 头", () => {
    const render = sliceFunction(caddySource, "render_chat_proxy_route_block");
    expect(render).toContain("@chat path ${CHAT_PROXY_PATHS}");
    expect(render).toContain(
      "reverse_proxy @chat ${CHAT_PROXY_UPSTREAM_HOST}:${CHAT_PROXY_UPSTREAM_PORT}"
    );
    expect(render).toContain("flush_interval -1");
    expect(render).toContain("header_up X-Nolo-Client-IP {remote_host}");
  });

  it("拒绝把 chat 指到 core 自己的 upstream（那样分流是空操作）", () => {
    const render = sliceFunction(caddySource, "render_chat_proxy_route_block");
    expect(render).toContain('"$CHAT_PROXY_UPSTREAM_PORT" == "$UPSTREAM_PORT"');
  });

  it("deployRemote 只在探活通过后才下发 chat upstream", () => {
    const fn = sliceFunction(source, "configure_caddy_proxy");
    expect(fn).toContain('if [[ "$chat_proxy_upstream_ready" == "1" ]]; then');
    expect(fn).toContain('NOLO_CADDY_CHAT_PROXY_UPSTREAM_PORT="$chat_proxy_upstream_port"');
  });
});

// ---------------------------------------------------------------------------
// 4. 行为测试：把 deployRemote.sh 的函数 source 进来，配假 pm2 跑真流程
// ---------------------------------------------------------------------------

const workRoot = mkdtempSync(join(tmpdir(), "t4-chat-proxy-"));
const repoDir = join(workRoot, "repo");
const pm2Log = join(workRoot, "pm2.log");
const caddyEnvLog = join(workRoot, "caddy-env.log");
mkdirSync(join(repoDir, "scripts", "release"), { recursive: true });
mkdirSync(join(repoDir, "packages", "server", ".render-dist"), { recursive: true });
writeFileSync(join(repoDir, "packages", "server", "entry.ts"), "");
writeFileSync(join(repoDir, "packages", "server", ".render-dist", "render.mjs"), "");

// 假 configureCaddyProxy.sh：只把收到的 chat upstream env 落盘，供断言。
const fakeCaddyScript = join(repoDir, "scripts", "release", "configureCaddyProxy.sh");
writeFileSync(
  fakeCaddyScript,
  [
    "#!/usr/bin/env bash",
    "set -Eeuo pipefail",
    `printf 'CHAT_UPSTREAM_PORT=[%s] CHAT_UPSTREAM_HOST=[%s] CHAT_PATHS=[%s] CORE_PORT=[%s]\\n' \\`,
    '  "${NOLO_CADDY_CHAT_PROXY_UPSTREAM_PORT:-}" "${NOLO_CADDY_CHAT_PROXY_UPSTREAM_HOST:-}" \\',
    `  "\${NOLO_CADDY_CHAT_PROXY_PATHS:-}" "\${NOLO_CADDY_UPSTREAM_PORT:-}" >>"${caddyEnvLog}"`,
    "",
  ].join("\n")
);
chmodSync(fakeCaddyScript, 0o755);

function writeJlist(name: string, apps: string[]): string {
  const path = join(workRoot, `${name}.json`);
  writeFileSync(path, `[${apps.map((n) => `{"name":"${n}","pm2_env":{"status":"online"}}`).join(",")}]`);
  return path;
}

const jlistEmpty = writeJlist("empty", []);
const jlistProxyOnly = writeJlist("proxy-only", [CHAT_PROXY_APP_NAME]);
const jlistBoth = writeJlist("both", ["nolo", CHAT_PROXY_APP_NAME]);

/** 每个场景一个干净的 pm2 调用日志。 */
function runScenario(
  scenario: string,
  env: Record<string, string> = {}
): { code: number; stdout: string; stderr: string; pm2Calls: string[]; pm2Log: string } {
  writeFileSync(pm2Log, "");
  // 用 spawnCapturedSync 而不是裸 Bun.spawnSync：主 checkout 里 `bun test` 常驻
  // ~14000 个 fd，会把 piped spawn 的子进程 stdio 顶到高位而变成「bash 无声 exit 1」
  // （详见 scripts/test/spawnCapturedSync.ts 的说明）。这里只拿退出码 + 输出做断言。
  const result = spawnCapturedSync(["bash", join(fixturesDir, "deployRemoteChatProxyHarness.sh")], {
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: workRoot,
      SCRIPT: join(releaseDir, "deployRemote.sh"),
      SCENARIO_FILE: join(fixturesDir, "deployRemoteChatProxyScenarios.sh"),
      SCENARIO: scenario,
      NOLO_BRANCH: "main",
      NOLO_REPO_DIR: repoDir,
      NOLO_BUN_BIN: "/usr/bin/true",
      NOLO_PM2_BIN: join(fixturesDir, "fakePm2.sh"),
      NOLO_PROXY_MODE: "caddy",
      NOLO_CADDY_HOSTS: "nolo.chat",
      NOLO_PM2_APP_COUNT_WAIT_TIMEOUT: "3",
      NOLO_CHAT_PROXY_HEALTH_ATTEMPTS: "2",
      NOLO_CHAT_PROXY_HEALTH_DELAY_SECONDS: "0",
      FAKE_PM2_LOG: pm2Log,
      FAKE_PM2_JLIST: jlistEmpty,
      ...env,
    },
  });
  const log = readFileSync(pm2Log, "utf8");
  return {
    code: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    pm2Log: log,
    pm2Calls: log
      .split("\n")
      .filter((line) => line.startsWith("CALL:"))
      .map((line) => line.replace(/^CALL:\s*/, "")),
  };
}

const healthServerLessBinDir = join(workRoot, "bin");
mkdirSync(healthServerLessBinDir, { recursive: true });
const fakeCurlLog = join(workRoot, "curl.log");
// 假 curl：记录参数并回 "ok"。
// 为什么不起真 HTTP server：这些场景用 Bun.spawnSync 跑 bash，同步 spawn 会把
// 测试进程的事件循环堵住，Bun.serve 起的服务器在此期间根本无法应答（实测超时）。
// 换成假 curl 后既零 flake，又能顺手断言真实的 curl 调用形状。
writeFileSync(
  join(healthServerLessBinDir, "curl"),
  ["#!/usr/bin/env bash", `printf 'CURL %s\\n' "$*" >>"${fakeCurlLog}"`, "printf 'ok'", ""].join("\n")
);
chmodSync(join(healthServerLessBinDir, "curl"), 0o755);

describe("行为：命名隔离硬门真的会拦人", () => {
  it("默认名通过", () => {
    const run = runScenario("scenario_isolation_accepts_default_name");
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain("chat-proxy 隔离断言通过");
  });

  it.each([
    ["scenario_isolation_rejects_nolo", "不能是"],
    ["scenario_isolation_rejects_canary_slot", "canary slot"],
    ["scenario_isolation_rejects_empty_name", "不能为空"],
    ["scenario_isolation_rejects_core_port_clash", "冲突"],
  ])("%s 必须拒绝并非 0 退出", (scenario, marker) => {
    const run = runScenario(scenario as string);
    expect(run.code, `${scenario} 应该失败：${run.stdout}`).not.toBe(0);
    expect(run.stdout).toContain(marker as string);
  });
});

describe("行为：core 停机路径看不见 chat-proxy", () => {
  it("只有 chat-proxy 在跑时，graceful_stop_nolo 只对字面名 nolo 发命令", () => {
    const run = runScenario("scenario_graceful_stop_nolo_ignores_chat_proxy", {
      FAKE_PM2_JLIST: jlistProxyOnly,
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.pm2Calls).toEqual(["jlist", "delete nolo", "jlist"]);
    expect(run.pm2Log).not.toContain(CHAT_PROXY_APP_NAME);
  });

  it("nolo 与 chat-proxy 并存时，core 的实例计数门不误判", () => {
    const run = runScenario("scenario_core_counts_ignore_chat_proxy", {
      FAKE_PM2_JLIST: jlistBoth,
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain("RESULT count=1 exists=yes wait_status=0");
  });

  it("跨 PM2_HOME 的残留清理只 delete 字面名 nolo", () => {
    const staleHome = join(workRoot, "stale", ".pm2");
    mkdirSync(staleHome, { recursive: true });
    const run = runScenario("scenario_delete_stale_uses_literal_nolo", {
      FAKE_PM2_JLIST: jlistBoth,
      NOLO_PM2_CANDIDATE_HOMES: staleHome,
      NOLO_USE_SUDO: "0",
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.pm2Calls).toEqual(["delete nolo"]);
    expect(run.pm2Log).not.toContain(CHAT_PROXY_APP_NAME);
  });
});

describe("行为：chat-proxy 自己的生命周期", () => {
  it("未启用时完全不动 PM2", () => {
    const run = runScenario("scenario_wire_disabled_is_noop");
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.pm2Calls).toEqual([]);
    expect(run.stdout).toContain("RESULT ready=0 failed=0 started=0");
  });

  it("app 不存在时启动一份，env 带 role=chat-proxy 与独立端口", () => {
    const run = runScenario("scenario_ensure_starts_when_absent", {
      NOLO_CHAT_PROXY_ENABLED: "1",
      // 场景直接调 ensure_chat_proxy_app（真实接线链 wire_chat_proxy 里
      // ensure_chat_proxy_internal_token_file 先行设置它）；start_chat_proxy 在
      // set -u 下会读该变量，不提供会 unbound variable。路径指向测试 workdir，
      // 不触碰真机 token 文件。
      NOLO_INTERNAL_TOKEN_FILE: join(workRoot, "chat-proxy-internal-token"),
      FAKE_PM2_JLIST: writeJlist("core-only", ["nolo"]),
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    const startCall = run.pm2Calls.find((call) => call.startsWith("start "));
    expect(startCall, run.pm2Log).toContain(`--name ${CHAT_PROXY_APP_NAME}`);
    expect(run.pm2Log).toContain("role=chat-proxy port=38124 reuse=0 slot=nolo-chat-proxy");
    expect(run.stdout).toContain("RESULT ready=0 failed=0 started=1");
  });

  it("app 已在跑时一条变更命令都不发（core 部署不停、不重启、不等它）", () => {
    const run = runScenario("scenario_ensure_never_restarts_running_app", {
      NOLO_CHAT_PROXY_ENABLED: "1",
      FAKE_PM2_JLIST: jlistBoth,
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    // 完整读序列：jlist（查存在）→ pid（宿主的 chat_proxy_env_matches 用 pid 读
    // /proc/$pid/environ 比对 NOLO_CORE_INTERNAL_URL/NOLO_INTERNAL_TOKEN_FILE；
    // mac 无 /proc 视为匹配）→ jlist（「不存在才启动」分支的二次确认）。
    // 全是读操作，一条变更命令都没有 —— pid 调用出现在日志里反而锁住了
    // env-drift 检查确实发生这一新行为。
    expect(run.pm2Calls).toEqual(["jlist", "pid nolo-chat-proxy", "jlist"]);
    for (const verb of ["start", "stop", "restart", "reload", "delete"]) {
      expect(run.pm2Calls.some((call) => call.startsWith(`${verb} `)), `不该出现 pm2 ${verb}`).toBe(false);
    }
    expect(run.stdout).toContain("RESULT ready=0 failed=0 started=0");
  });

  it("只有显式 NOLO_CHAT_PROXY_RESTART=1 才重启", () => {
    const run = runScenario("scenario_ensure_restarts_only_when_opted_in", {
      NOLO_CHAT_PROXY_ENABLED: "1",
      FAKE_PM2_JLIST: jlistBoth,
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.pm2Calls.some((call) => call.startsWith(`restart ${CHAT_PROXY_APP_NAME}`))).toBe(true);
  });
});

describe("行为：探活与 Caddy 切流的联动", () => {
  it("/health 返回 ok → ready=1 且保存 PM2 列表", () => {
    writeFileSync(fakeCurlLog, "");
    const run = runScenario("scenario_wire_success", {
      NOLO_CHAT_PROXY_ENABLED: "1",
      NOLO_CHAT_PROXY_HEALTH_URL: "http://127.0.0.1:38124/health",
      FAKE_PM2_JLIST: writeJlist("core-only-2", ["nolo"]),
      FAKE_CURL_LOG: fakeCurlLog,
      PATH: `${healthServerLessBinDir}:${process.env.PATH ?? "/usr/bin:/bin"}`,
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain("RESULT ready=1 failed=0 started=1");
    // 探的是 /health，且带上了超时上限。
    const curlArgs = readFileSync(fakeCurlLog, "utf8");
    expect(curlArgs).toContain("http://127.0.0.1:38124/health");
    expect(curlArgs).toContain("--max-time 5");
    expect(curlArgs).not.toContain("/ready");
    // 新 app 必须进 pm2 dump，否则机器重启 resurrect 带不上它。
    expect(run.pm2Calls).toContain("save");
  });

  it("探活失败 → failed=1、ready=0，不静默跳过", () => {
    const run = runScenario("scenario_wire_health_failure", {
      NOLO_CHAT_PROXY_ENABLED: "1",
      // 1 端口必然 connection refused
      NOLO_CHAT_PROXY_HEALTH_URL: "http://127.0.0.1:1/health",
      FAKE_PM2_JLIST: jlistBoth,
    });
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain("RESULT ready=0 failed=1 started=0");
    expect(run.stdout).toContain("Caddy 的 chat 路由保持指向 core");
  });

  it("ready=0 时给 Caddy 传空 chat upstream（绝不指向没起来的端口）", () => {
    writeFileSync(caddyEnvLog, "");
    const run = runScenario("scenario_caddy_env_when_not_ready");
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(readFileSync(caddyEnvLog, "utf8").trim()).toBe(
      "CHAT_UPSTREAM_PORT=[] CHAT_UPSTREAM_HOST=[127.0.0.1] CHAT_PATHS=[/api/v1/chat] CORE_PORT=[38123]"
    );
  });

  it("ready=1 时才把 chat upstream 端口传给 Caddy", () => {
    writeFileSync(caddyEnvLog, "");
    const run = runScenario("scenario_caddy_env_when_ready");
    expect(run.code, run.stdout + run.stderr).toBe(0);
    expect(readFileSync(caddyEnvLog, "utf8").trim()).toBe(
      "CHAT_UPSTREAM_PORT=[38124] CHAT_UPSTREAM_HOST=[127.0.0.1] CHAT_PATHS=[/api/v1/chat] CORE_PORT=[38123]"
    );
  });
});
