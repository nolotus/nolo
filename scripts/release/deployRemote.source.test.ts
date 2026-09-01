import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { spawnCapturedSync } from "../test/spawnCapturedSync";
const source = readFileSync(join(import.meta.dir, "deployRemote.sh"), "utf-8");
const verifyRenderedWebAssetsSource = readFileSync(
  join(import.meta.dir, "..", "verify", "verifyRenderedWebAssets.sh"),
  "utf-8"
);

describe("deployRemote source contract", () => {
  it("keeps the deploy shell script in LF format for remote bash", () => {
    expect(source).not.toContain("\r");
  });

  it("ensures the shared internal token file before core/canary reference it (set -u regression: 2026-08-31 十连挂)", () => {
    // c080a29a4 在 start_nolo / start_nolo_canary 里引用 $CHAT_PROXY_INTERNAL_TOKEN_FILE，
    // 但该变量只在 ensure_chat_proxy_internal_token_file()（chat-proxy 段，core 之后）
    // 里赋值——set -u 下首次执行蓝绿 canary 启动就 unbound variable 崩溃，
    // 蓝绿切换从未发生（旧进程一直服务），ssr-selfcheck 探到旧实例 404。
    // 契约：两个 start 函数体内必须在**调用**（非注释）ensure 之后才引用变量。
    for (const fnName of ["start_nolo", "start_nolo_canary"]) {
      const fnBody = source.match(
        new RegExp(`${fnName}\\(\\) \\{[\\s\\S]*?\\n\\}`, "m"),
      )?.[0];
      expect(fnBody).toBeDefined();
      const ensureCallIdx = fnBody!.indexOf(
        "ensure_chat_proxy_internal_token_file || true",
      );
      // 注释里也含函数名，只认真实调用行
      const refIdx = fnBody!.indexOf('$CHAT_PROXY_INTERNAL_TOKEN_FILE"');
      expect(ensureCallIdx).toBeGreaterThanOrEqual(0);
      expect(refIdx).toBeGreaterThan(ensureCallIdx);
    }
  });

  it("ensures Playwright Chromium is available on the remote host", () => {
    expect(source).toContain("ensure_playwright_browser()");
    expect(source).toContain("playwright_chromium_cache_exists()");
    expect(source).toContain("Playwright Chromium cache already present");
    expect(source).toContain("playwright install --with-deps chromium");
    expect(source).toContain("Playwright Chromium install failed (OS may not be supported), clearing browser cache and retrying once");
    expect(source).toContain('mkdir -p "$DEPLOY_HOME/.cache/ms-playwright"');
    expect(source).toContain('rm -rf "$DEPLOY_HOME/.cache/ms-playwright"');
    expect(source.indexOf("playwright_chromium_cache_exists")).toBeLessThan(
      source.indexOf("playwright install --with-deps chromium")
    );
    expect(source).toContain("ensure_playwright_browser");
  });

  it("emits structured timings for remote deploy substeps", () => {
    expect(source).toContain("timed_deploy_step()");
    expect(source).toContain("[nolo-deploy-step]");
    expect(source).toContain("jobId=${DEPLOY_JOB_ID}");
    expect(source).toContain("releaseSha=${NOLO_RELEASE_SHA:-unknown}");
    expect(source).toContain("durationMs=");
    expect(source).toContain("emit_deploy_step()");
    expect(source).toContain('timed_deploy_step "install-dependencies" install_dependencies');
    expect(source).toContain('timed_deploy_step "ensure-playwright-browser" ensure_playwright_browser');
    expect(source).toContain(
      'timed_deploy_step "promote-staged-public-files" promote_staged_public_files "$artifact_stage_dir" "$public_metadata_stage_dir"'
    );
    expect(source).toContain('timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo');
    expect(source).toContain('timed_deploy_step "blue-green-start-canary" start_nolo_canary "$canary_name"');
    expect(source).toContain('timed_deploy_step "blue-green-stop-old-slot" graceful_stop_slot "$old_slot"');
    expect(source).toContain('emit_deploy_step "blue-green-pre-handoff-ready"');
    expect(source).toContain('timed_deploy_step "blue-green-canary-ready-gate" wait_for_slot_ready_sha "$canary_name"');
    expect(source).toContain('timed_deploy_step "pm2-stop-command-${slot_name}"');
    expect(source).toContain("write_shutdown_handoff_context()");
    expect(source).toContain('write_shutdown_handoff_context "$slot_name"');
    expect(source).toContain('write_shutdown_handoff_context "nolo"');
    expect(source).toContain('NOLO_SHUTDOWN_CONTEXT_DIR="$SHUTDOWN_CONTEXT_DIR"');
    expect(source).toContain("wait_status=124");
    expect(source).toContain('emit_deploy_step "pm2-stop-wait-${slot_name}" "$wait_status"');
    expect(source).toContain('timed_deploy_step "verify-rendered-assets" verify_rendered_assets');
  });

  it("strips the ssr selfcheck diag token from dump files after pm2 save (resurrect 不复活旧 token)", () => {
    // 机器重启 resurrect 会把 dump.pm2 里的 env 原样还给进程；NOLO_CI_DIAG_TOKEN
    // 一旦落盘，自检端点就带着旧 token 长期存活。save 后必须立即剥离。
    expect(source).toContain("sanitize_pm2_dump_diag_token()");
    expect(source).toContain('timed_deploy_step "pm2-save" run_maybe_sudo "$PM2_BIN" save');
    expect(source).toContain("sanitize_pm2_dump_diag_token || true");
    // 剥离必须发生在 pm2 save 之后（save 前剥离对已序列化的 dump 无效）。
    // 逐处校验每一次 pm2 save：T4 起 chat-proxy 首次入列也会 save（pm2-save-chat-proxy），
    // 比较「全局首次出现位置」会被函数定义段的先后顺序误伤。
    const saveSteps = [
      ...source.matchAll(
        /timed_deploy_step "(pm2-save[^"]*)" run_maybe_sudo "\$PM2_BIN" save[^\n]*\n/g
      ),
    ];
    expect(saveSteps.length).toBeGreaterThanOrEqual(1);
    for (const step of saveSteps) {
      const after = source.slice(step.index! + step[0].length);
      expect(
        after.slice(0, 400),
        `${step[1]} 之后必须紧跟 diag token 剥离`
      ).toContain("sanitize_pm2_dump_diag_token || true");
    }
    // 剥离逻辑收敛在独立脚本（fixture 行为测试见下），shell 侧只负责调用
    expect(source).toContain('sanitize_pm2_dump_diag_token.py" "$PM2_HOME"');
    expect(readFileSync(join(import.meta.dir, "sanitize_pm2_dump_diag_token.py"), "utf-8"))
      .toContain('"dump.pm2.bak"'); // .bak 一并剥离（pm2 save 会写 .bak）
  });

  it("sanitize script strips the diag token from real-shaped dump fixtures (pm2_env 顶层 + env 子对象 + .bak)", () => {
    const dir = mkdtempSync(join(tmpdir(), "pm2-dump-sanitize-"));
    const pm2Home = join(dir, ".pm2");
    try {
      mkdirSync(pm2Home, { recursive: true });
      // 真实 pm2 dump 结构：[{ name, pm2_env: { ..., env: {...} } }]
      const dump = JSON.stringify([
        {
          name: "nolo",
          pm_exec_path: "/root/bun-nolo/packages/server/entry.ts",
          pm2_env: {
            name: "nolo",
            env: {
              NOLO_CI_DIAG: "1",
              NOLO_CI_DIAG_TOKEN: "token-in-env-child",
              NOLO_RELEASE_SHA: "abc123",
              HOME: "/root",
            },
            NOLO_CI_DIAG_TOKEN: "token-at-pm2-env-top",
          },
        },
        { name: "other-app", pm2_env: { env: { FOO: "bar" } } },
      ]);
      writeFileSync(join(pm2Home, "dump.pm2"), dump, "utf-8");
      writeFileSync(join(pm2Home, "dump.pm2.bak"), dump, "utf-8");

      const run = spawnSync("python3", [join(import.meta.dir, "sanitize_pm2_dump_diag_token.py"), pm2Home], {
        encoding: "utf8",
      });
      expect(run.status).toBe(0);

      // 行为断言：剥离后两个 dump 文件中不再含该键（任何层级）
      const containsToken = (text: string) => text.includes("NOLO_CI_DIAG_TOKEN");
      expect(containsToken(readFileSync(join(pm2Home, "dump.pm2"), "utf-8"))).toBe(false);
      expect(containsToken(readFileSync(join(pm2Home, "dump.pm2.bak"), "utf-8"))).toBe(false);

      // 非 token env 原样保留（剥离不能误伤其它键 / 其它 app）
      const sanitized = JSON.parse(readFileSync(join(pm2Home, "dump.pm2"), "utf-8"));
      expect(sanitized[0].pm2_env.env.NOLO_CI_DIAG).toBe("1");
      expect(sanitized[0].pm2_env.env.NOLO_RELEASE_SHA).toBe("abc123");
      expect(sanitized[1].pm2_env.env.FOO).toBe("bar");

      // 幂等：再跑一遍应当 clean（无文件 mtime/内容抖动）
      const rerun = spawnSync("python3", [join(import.meta.dir, "sanitize_pm2_dump_diag_token.py"), pm2Home], {
        encoding: "utf8",
      });
      expect(rerun.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("sanitize script is a no-op when dump files are missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "pm2-dump-sanitize-empty-"));
    try {
      const run = spawnSync("python3", [join(import.meta.dir, "sanitize_pm2_dump_diag_token.py"), dir], {
        encoding: "utf8",
      });
      expect(run.status).toBe(0);
      expect(existsSync(join(dir, "dump.pm2"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not reference the removed standalone tool-worker runtime", () => {
    expect(source).not.toContain("nolo-tool-worker");
    expect(source).not.toContain("TOOL_WORKER_ENTRY");
    expect(source).not.toContain("TOOL_WORKER_KEY");
    expect(source).not.toContain("TOOL_WORKER_PORT");
    expect(source).not.toContain('TOOL_WORKER_ORIGIN="http://${TOOL_WORKER_HOST}:${TOOL_WORKER_PORT}"');
  });

  it("rebuilds nolo when old tool process env remains in PM2", () => {
    expect(source).toContain("nolo_has_legacy_tool_worker_env");
    expect(source).toContain("toolworker");
    expect(source).toContain("delete nolo");
  });

  it("loads REPO_DIR/.env into the shell before PM2 start (source of truth for OLLAMA_API_KEY)", () => {
    expect(source).toContain("export_repo_dotenv()");
    expect(source).toContain('local env_file="${REPO_DIR}/.env"');
    expect(source).toContain("export_repo_dotenv");
    const startFunctionStart = source.indexOf("start_nolo() {");
    const startFunctionEnd = source.indexOf("\n}", startFunctionStart);
    const startFunction = source.slice(startFunctionStart, startFunctionEnd);
    expect(startFunction).toContain("export_repo_dotenv");
    expect(source.indexOf("export_repo_dotenv()")).toBeLessThan(
      source.indexOf("start_nolo() {")
    );
    expect(source.indexOf("export_repo_dotenv()")).toBeLessThan(
      source.indexOf("verify_production_env() {")
    );
  });

  it("rebuilds nolo when PM2 contains duplicate app entries", () => {
    expect(source).toContain("nolo_app_count()");
    expect(source).toContain("wait_for_nolo_app_count()");
    expect(source).toContain("delete_nolo_and_wait()");
    expect(source).toContain('NOLO_APP_COUNT="$(nolo_app_count)"');
    expect(source).toContain('if [[ "$NOLO_APP_COUNT" != "1" ]]');
    expect(source).toContain("检测到 ${NOLO_APP_COUNT} 个 nolo PM2 进程");
    expect(source).toContain("delete_nolo_and_wait");
    expect(source).toContain('wait_for_nolo_app_count "0"');
    expect(source).toContain('wait_for_nolo_app_count "1"');
  });

  it("does not treat one online duplicate PM2 app as successful recovery", () => {
    const recoverFunctionStart = source.indexOf("recover_nolo_on_exit() {");
    const recoverFunctionEnd = source.indexOf("\n}", recoverFunctionStart);
    const recoverFunction = source.slice(recoverFunctionStart, recoverFunctionEnd);

    expect(recoverFunction).toContain('NOLO_APP_COUNT="$(nolo_app_count 2>/dev/null || echo 0)"');
    expect(recoverFunction).toContain('if [[ "$NOLO_APP_COUNT" == "1" ]]');
    expect(recoverFunction).toContain("nolo is already online; no recovery needed");
    expect(recoverFunction).toContain("recovering from ${NOLO_APP_COUNT} PM2 nolo process entries");
    expect(recoverFunction.indexOf('NOLO_APP_COUNT="$(nolo_app_count 2>/dev/null || echo 0)"')).toBeLessThan(
      recoverFunction.indexOf("nolo is already online; no recovery needed")
    );
    expect(recoverFunction.indexOf("nolo is already online; no recovery needed")).toBeLessThan(
      recoverFunction.indexOf("recovering from ${NOLO_APP_COUNT} PM2 nolo process entries")
    );
  });

  it("cleans root-owned core dumps with the configured sudo policy", () => {
    expect(source).toContain("cleanup_core_dumps()");
    expect(source).toContain("run_maybe_sudo file");
    expect(source).toContain("run_maybe_sudo rm -f");
  });

  it("disables apport-backed Bun core dumps before deploy work", () => {
    expect(source).toContain("disable_core_dumps()");
    expect(source).toContain("scripts/ops/disableCoreDumps.sh");
    expect(source).toContain('NOLO_PM2_BIN="$PM2_BIN"');
    expect(source.lastIndexOf("disable_core_dumps")).toBeLessThan(
      source.lastIndexOf("cleanup_core_dumps")
    );
  });

  it("repairs the host tmp directory before install and systemd-backed reloads", () => {
    expect(source).toContain("restore_tmp_runtime_state()");
    expect(source).toContain("run_maybe_sudo install -d -m 1777 /tmp");
    expect(source).toContain("run_maybe_sudo chmod 1777 /tmp");
    expect(source.indexOf("restore_tmp_runtime_state")).toBeLessThan(
      source.lastIndexOf("install_dependencies")
    );
  });

  it("checks artifact extraction disk space before stopping the service", () => {
    expect(source).toContain("ensure_artifact_extract_space");
    expect(source.indexOf("ensure_artifact_extract_space")).toBeLessThan(
      source.indexOf("$PM2_BIN\" stop nolo")
    );
    expect(source).toContain("NOLO_MIN_FREE_KB");
    expect(source).toContain("NOLO_EXTRACT_SPACE_MULTIPLIER");
  });

  it("stages artifact extraction and promotes build metadata without deleting live assets first", () => {
    expect(source).toContain("prepare_artifact_stage_dir()");
    expect(source).toContain("extract_artifact_to_stage()");
    expect(source).toContain("prepare_staged_public_metadata_promotion()");
    expect(source).toContain("promote_staged_public_files()");
    expect(source).toContain('run_maybe_sudo tar -xf "$artifact_path" -C "$artifact_stage_dir"');
    expect(source).not.toContain('tar -xzf "$artifact_path"');
    expect(source).not.toContain("run_maybe_sudo rm -rf \\\n    public/assets");
    expect(source.indexOf("extract_artifact_to_stage")).toBeLessThan(
      source.indexOf("promote_staged_public_files")
    );
    expect(source.indexOf('promote_staged_public_files "$artifact_stage_dir"')).toBeLessThan(
      source.indexOf('timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo')
    );
    expect(source).toContain(
      'public_metadata_stage_dir="$(prepare_staged_public_metadata_promotion "$artifact_stage_dir")"'
    );
    expect(source).toContain(
      'timed_deploy_step "promote-staged-public-files" promote_staged_public_files "$artifact_stage_dir" "$public_metadata_stage_dir"'
    );
    expect(source).toContain('local metadata_stage_dir="${2:-$artifact_stage_dir/public}"');
    expect(source).toContain('run_maybe_sudo mv -f "$meta_tmp_path" "$REPO_DIR/public/meta.json"');
    expect(source).toContain(
      'run_maybe_sudo mv -f "$latest_assets_tmp_path" "$REPO_DIR/public/latest-assets.json"'
    );
    expect(source.indexOf('run_maybe_sudo cp "$latest_assets_path" "$latest_assets_tmp_path"')).toBeLessThan(
      source.indexOf('run_maybe_sudo cp "$meta_path" "$meta_tmp_path"')
    );
  });

  it("restores the PM2 service when deploy exits after stopping it", () => {
    expect(source).toContain("recover_nolo_on_exit()");
    expect(source).toContain('trap \'cleanup_on_exit $?\' EXIT');
    expect(source).toContain("trap 'cleanup_on_exit 143' INT TERM");
    expect(source).toContain('service_may_need_recovery=1');
    expect(source).toContain('STOP_BEFORE_ARTIFACT_PROMOTE="${NOLO_STOP_BEFORE_ARTIFACT_PROMOTE:-0}"');
    expect(source).toContain('if [[ "$STOP_BEFORE_ARTIFACT_PROMOTE" == "1" ]]; then');
    expect(source).toContain('"$PM2_BIN" stop nolo || true');
    expect(source).toContain('run_maybe_sudo "$PM2_BIN" delete nolo || true');
    expect(source).not.toContain('"$PM2_BIN" restart nolo --update-env');
    expect(source).toContain('Deployment interrupted after service stop; attempting PM2 recovery');
  });

  it("keeps CI artifact deploys online by default and only stops PM2 behind an explicit escape hatch", () => {
    expect(source).toContain('STOP_BEFORE_ARTIFACT_PROMOTE="${NOLO_STOP_BEFORE_ARTIFACT_PROMOTE:-0}"');
    expect(source).toContain('if [[ "$STOP_BEFORE_ARTIFACT_PROMOTE" == "1" ]]; then');
    expect(source).toContain("低内存兼容模式：artifact promote 前先释放 PM2 进程占用");
  });

  it("skips the core reload only when the CI marks the deploy as frontend-only", () => {
    expect(source).toContain('SKIP_CORE_RELOAD="${NOLO_SKIP_CORE_RELOAD:-0}"');
    expect(source).toContain('if [[ "$SKIP_CORE_RELOAD" == "1" ]]; then');
    expect(source).toContain("纯前端 artifact 部署：保持 nolo 核心进程在线，跳过重载");
    expect(source).toContain("核心服务未通过健康检查，取消部署");
    expect(source).toContain("核心服务在线");
    expect(source).toContain('timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo');
  });

  it("prunes dev dependencies when deploying a CI-built artifact", () => {
    expect(source).toContain("NOLO_PRUNE_NODE_MODULES_FOR_ARTIFACT");
    expect(source).toContain("install_dependencies()");
    expect(source).toContain('if [[ -n "$ARTIFACT_PATH" && "$PRUNE_NODE_MODULES_FOR_ARTIFACT" == "1" ]]');
    expect(source).toContain("run_maybe_sudo rm -rf node_modules");
    expect(source).toContain("尝试复用现有生产依赖");
    expect(source).toContain('"$DEPLOY_HOME/.bun/install/cache"');
    expect(source).toContain("for attempt in 1 2 3; do");
    expect(source).toContain("cleanup_production_install_state()");
    expect(source).toContain("production install cleanup failed, retrying");
    expect(source).toContain("生产依赖安装失败，准备重试");
    expect(source).toContain('"$BUN_BIN" install --production');
    expect(source).toContain('production_install_log="$(mktemp)"');
    expect(source).toContain('production_install_status=${PIPESTATUS[0]}');
    expect(source).toContain('grep -Eq "PathAlreadyExists|Failed to install [0-9]+ packages" "$production_install_log"');

    const installFunctionStart = source.indexOf("install_dependencies() {");
    const installFunctionEnd = source.indexOf("\n}", installFunctionStart);
    const installFunction = source.slice(installFunctionStart, installFunctionEnd);
    expect(installFunction.indexOf("install --production")).toBeLessThan(
      installFunction.indexOf("install --frozen-lockfile")
    );
    expect(installFunction.indexOf("grep -Eq")).toBeGreaterThan(
      installFunction.indexOf("install --production")
    );
    expect(installFunction).toContain(`if [[ "$attempt" == "1" ]]; then
        echo "♻️ 尝试复用现有生产依赖..."
      else
        cleanup_production_install_state
      fi`);
  });

  it("allows trusted artifact deploy callers to skip dependency installation explicitly", () => {
    expect(source).toContain('SKIP_DEPLOY_INSTALL="${NOLO_SKIP_DEPLOY_INSTALL:-0}"');
    expect(source).toContain('if [[ "$SKIP_DEPLOY_INSTALL" == "1" ]]');
    expect(source).toContain("Skipping deploy dependency install because NOLO_SKIP_DEPLOY_INSTALL=1");
    expect(source.indexOf('if [[ "$SKIP_DEPLOY_INSTALL" == "1" ]]')).toBeLessThan(
      source.indexOf('timed_deploy_step "install-dependencies" install_dependencies')
    );
  });

  it("pins HOME and PM2_HOME so self-hosted runner cleanup cannot target a transient PM2 daemon", () => {
    expect(source).toContain("DEPLOY_HOME=");
    expect(source).toContain('PM2_HOME="${NOLO_PM2_HOME:-${DEPLOY_HOME}/.pm2}"');
    expect(source).toContain('export HOME="$DEPLOY_HOME"');
    expect(source).toContain("export PM2_HOME");
    expect(source).toContain('export RUNNER_TRACKING_ID=""');
    expect(source).toContain('RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID"');
    expect(source).toContain('sudo env HOME="$DEPLOY_HOME" PM2_HOME="$PM2_HOME" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID"');
    expect(source).toContain('env HOME="$DEPLOY_HOME" PM2_HOME="$PM2_HOME" RUNNER_TRACKING_ID="$RUNNER_TRACKING_ID"');
    expect(source).toContain('部署 HOME=${HOME} PM2_HOME=${PM2_HOME}');
  });

  it("can run Bun behind a Caddy origin proxy on a loopback port", () => {
    expect(source).toContain('PROXY_MODE="${NOLO_PROXY_MODE:-none}"');
    expect(source).toContain('if [[ "$PROXY_MODE" == "caddy" ]]');
    expect(source).toContain('APP_HTTP_HOST="${APP_HTTP_HOST:-127.0.0.1}"');
    expect(source).toContain('APP_HTTP_PORT="${APP_HTTP_PORT:-38123}"');
    expect(source).toContain('NOLO_DISABLE_HTTPS="$DISABLE_HTTPS"');
    expect(source).toContain('PLATFORM_SERVER_HOST="$APP_HTTP_HOST"');
    expect(source).toContain('HTTP_PORT="$APP_HTTP_PORT"');
    expect(source).toContain("configure_caddy_proxy");
    expect(source).toContain("configureCaddyProxy.sh");
  });

  it("passes hosted exec alpha env through PM2 when the caller opts in", () => {
    expect(source).toContain('NOLO_WEB_HOSTED_EXEC_RUNTIME="${NOLO_WEB_HOSTED_EXEC_RUNTIME:-}"');
    expect(source).toContain('NOLO_HOSTED_WORKSPACE_ROOT="${NOLO_HOSTED_WORKSPACE_ROOT:-}"');
    expect(source.indexOf('NOLO_WEB_HOSTED_EXEC_RUNTIME="${NOLO_WEB_HOSTED_EXEC_RUNTIME:-}"')).toBeLessThan(
      source.indexOf('"$PM2_BIN" "${args[@]}"')
    );
  });

  it("requires the PM2 entrypoint to belong to the selected repo dir", () => {
    expect(source).toContain('EXPECTED_ENTRY_PATH="$REPO_DIR/packages/server/entry.ts"');
    expect(source).toContain('local args=(start "$EXPECTED_ENTRY_PATH"');
    expect(source).toContain('elif [[ "$SCRIPT_PATH" == "$EXPECTED_ENTRY_PATH" && "$INTERPRETER_PATH" == "$BUN_BIN" ]]');
    expect(source).not.toContain('grep -q "packages/server/entry.ts"');
  });

  it("validates production-only required env before stopping the service", () => {
    expect(source).toContain("verify_production_env()");
    expect(source).toContain("SECRET_KEY is missing or not parseable");
    expect(source).toContain("取消部署且不停止当前服务");
    expect(source.indexOf("verify_production_env")).toBeLessThan(
      source.indexOf('$PM2_BIN" stop nolo')
    );
  });

  it("starts and rebuilds the deployed PM2 app in production mode", () => {
    const startFunctionStart = source.indexOf("start_nolo() {");
    const startFunctionEnd = source.indexOf("\n}", startFunctionStart);
    const startFunction = source.slice(startFunctionStart, startFunctionEnd);
    const rebuildFunctionStart = source.indexOf("rebuild_nolo() {");
    const rebuildFunctionEnd = source.indexOf("\n}", rebuildFunctionStart);
    const rebuildFunction = source.slice(rebuildFunctionStart, rebuildFunctionEnd);

    expect(rebuildFunction).toContain("delete_stale_nolo_instances");
    expect(rebuildFunction).toContain("graceful_stop_nolo");
    expect(rebuildFunction).toContain("start_nolo");
    expect(rebuildFunction).toContain('wait_for_nolo_app_count "1"');
    expect(source).not.toContain("$PM2_BIN\" reload nolo --update-env");

    for (const functionSource of [startFunction]) {
      expect(functionSource).toContain("NODE_ENV=production");
      expect(functionSource).toContain("NOLO_FORCE_PRODUCTION=1");
      expect(functionSource).toContain("NOLO_SERVER_RUNTIME_ROLE=core");
      expect(functionSource).toContain('NOLO_DISABLE_HTTPS="$DISABLE_HTTPS"');
      expect(functionSource).toContain('PLATFORM_SERVER_HOST="$APP_HTTP_HOST"');
      expect(functionSource).toContain('HTTP_PORT="$APP_HTTP_PORT"');
    }
  });

  it("cleans stale nolo instances in other PM2 daemons before rebuild to prevent LevelDB double-lock", () => {
    const staleStart = source.indexOf("delete_stale_nolo_instances() {");
    const staleEnd = source.indexOf("\n}", staleStart);
    const staleFunction = source.slice(staleStart, staleEnd);

    expect(source).toContain(
      'NOLO_PM2_CANDIDATE_HOMES="${NOLO_PM2_CANDIDATE_HOMES:-/root/.pm2 /home/nolotus/.pm2}"'
    );
    expect(staleFunction).toContain('[[ "$USE_SUDO" == "1" ]]');
    // 非 root SSH 用户下目录检查必须用 sudo test -d，否则 /root（700）被
    // [[ -d ]] 误判为不存在而跳过清理（F-01 HIGH）。
    expect(staleFunction).toContain('sudo test -d "$pm2_home"');
    expect(staleFunction).toContain("pm2_owner_home=\"\${pm2_home%/.pm2}\"");
    expect(staleFunction).toContain("PM2_HOME=\"$pm2_home\"");
    expect(staleFunction).toContain("delete nolo");
  });

  it("waits for the LevelDB lock release between PM2 delete and start during rebuilds", () => {
    const rebuildStart = source.indexOf("rebuild_nolo() {");
    const rebuildEnd = source.indexOf("\n}", rebuildStart);
    const rebuildFunction = source.slice(rebuildStart, rebuildEnd);

    expect(rebuildFunction).toContain("graceful_stop_nolo");
    expect(rebuildFunction).toContain("wait_for_leveldb_lock_release");
    expect(rebuildFunction.indexOf("graceful_stop_nolo")).toBeLessThan(
      rebuildFunction.indexOf("wait_for_leveldb_lock_release")
    );
    expect(rebuildFunction.indexOf("wait_for_leveldb_lock_release")).toBeLessThan(
      rebuildFunction.indexOf("start_nolo")
    );

    const lockWaitStart = source.indexOf("wait_for_leveldb_lock_release() {");
    const lockWaitEnd = source.indexOf("\n}", lockWaitStart);
    const lockWaitFunction = source.slice(lockWaitStart, lockWaitEnd);
    expect(lockWaitFunction).toContain("fuser");
    expect(lockWaitFunction).toContain("/LOCK");
    expect(lockWaitFunction).toContain("sleep 1");
    expect(lockWaitFunction).toContain("sleep 5");
    // 锁未释放时必须报出持有者：否则新进程只会在 boot 侧抢锁失败，
    // 表现为「部署脚本成功、跑的却还是旧代码」这种静默失败。
    expect(lockWaitFunction).toContain('"$fuser_bin" -v');
    expect(lockWaitFunction).toContain("当前持有者");
    // 不再宣称 boot 侧会长时间兜底 —— 那条 90s 静默重试已被改成快速失败。
    expect(lockWaitFunction).not.toContain("server boot 侧另有重试兜底");
    expect(lockWaitFunction).not.toContain("return 1");

    // 实测 PM2 5.4.2 会静默忽略 `pm2 start --min-uptime/--max-restarts`
    // （必崩进程的 pm2_env 里查不到这两个字段），加上去只会制造「已有保护」的错觉。
    // 锁定为不出现，避免有人凭直觉再加回来。
    const startNoloStart = source.indexOf("start_nolo() {");
    const startNoloEnd = source.indexOf("\n}", startNoloStart);
    const startNoloFunction = source.slice(startNoloStart, startNoloEnd);
    expect(startNoloFunction).not.toContain("args+=(--min-uptime");
    expect(startNoloFunction).not.toContain("args+=(--max-restarts");

    expect(source).toContain('DEPLOY_LOCK_WAIT_TIMEOUT="${NOLO_DEPLOY_LOCK_WAIT_TIMEOUT:-60}"');
    expect(source).toContain("resolve_leveldb_dir()");
    expect(source).toContain("NOLO_SERVER_DB_PATH");
    expect(source).toContain("${REPO_DIR}/data/leveldb");
  });

  it("gates the release on /ready reporting the target buildSha instead of a blind sleep", () => {
    const gateStart = source.indexOf("wait_for_nolo_ready_sha() {");
    const gateEnd = source.indexOf("\n}\n", gateStart);
    const gateFunction = source.slice(gateStart, gateEnd);

    expect(gateFunction).toContain("resolve_nolo_ready_url");
    expect(gateFunction).toContain("resolve_deploy_target_sha");
    expect(gateFunction).toContain("buildSha");
    expect(gateFunction).toContain('"${server_sha:0:12}" == "$target_prefix"');
    expect(gateFunction).toContain("sleep 2");
    expect(source).toContain('DEPLOY_READY_TIMEOUT="${NOLO_DEPLOY_READY_TIMEOUT:-180}"');
    expect(source).toContain('printf \'%s\\n\' "${scheme}://${host_port}/ready"');
    expect(source).toContain('NOLO_BUILD_SHA="${NOLO_BUILD_SHA:-$(resolve_deploy_target_sha)}"');

    const rebuildStart = source.indexOf("rebuild_nolo() {");
    const rebuildEnd = source.indexOf("\n}", rebuildStart);
    expect(source.slice(rebuildStart, rebuildEnd)).not.toContain("sleep 5");

    const reloadStart = source.indexOf("reload_or_start_nolo() {");
    const reloadEnd = source.indexOf("\n}\n", reloadStart);
    const reloadFunction = source.slice(reloadStart, reloadEnd);
    expect(reloadFunction).not.toContain("sleep 5");
    expect(reloadFunction).not.toMatch(/^\s*rebuild_nolo\s*$/m);
    expect(reloadFunction.match(/rebuild_nolo_with_sha_gate/g)).toHaveLength(4);
    expect(reloadFunction).toContain("wait_for_nolo_ready_sha_or_recover");

    const reloadStep = source.indexOf('timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo');
    expect(reloadStep).toBeGreaterThan(0);
    expect(reloadStep).toBeLessThan(
      source.indexOf('if ! run_maybe_sudo "$PM2_BIN" describe nolo | grep -q "status.*online"; then')
    );
    expect(reloadStep).toBeLessThan(source.indexOf('if ! retry_http_contains "nolo"'));
    expect(reloadStep).toBeLessThan(
      source.indexOf('if ! timed_deploy_step "verify-rendered-assets" verify_rendered_assets')
    );
  });

  it("records deploy-step timings in real milliseconds on hosts with non-GNU date", () => {
    expect(source).toContain("epoch_millis()");
    expect(source).not.toMatch(/\$\(\s*date \+%s%3N\s*\)/);
    expect(source).toContain('started_ms="$(epoch_millis)"');
    expect(source).toContain('finished_ms="$(epoch_millis)"');
  });

  it("keeps epoch millisecond samples monotonic and millisecond-sized", () => {
    const epochMillisFunction = source.match(/epoch_millis\(\) \{[\s\S]*?\n\}/)?.[0];
    expect(epochMillisFunction).toBeDefined();

    const sample = spawnCapturedSync([
      "bash",
      "-c",
      `${epochMillisFunction}\nfirst="$(epoch_millis)"\nsleep 0.02\nsecond="$(epoch_millis)"\nprintf '%s %s\\n' "$first" "$second"`,
    ]);
    expect(sample.exitCode).toBe(0);
    const [first, second] = sample.stdout.trim().split(" ").map(Number);
    expect(first).toBeGreaterThan(1_000_000_000_000);
    expect(second - first).toBeGreaterThanOrEqual(10);
    expect(second - first).toBeLessThan(1_000);
  });

  it("rebuilds once automatically before failing the release when the ready-sha gate times out", () => {
    const recoverStart = source.indexOf("wait_for_nolo_ready_sha_or_recover() {");
    const recoverEnd = source.indexOf("\n}\n", recoverStart);
    const recoverFunction = source.slice(recoverStart, recoverEnd);

    expect(recoverFunction.split("wait_for_nolo_ready_sha;").length - 1).toBe(2);
    expect(recoverFunction).toContain("pm2_logs");
    expect(recoverFunction).toContain("rebuild_nolo");
    expect(recoverFunction).toContain('print_manual_rollback_guidance "nolo-ready-sha"');
    expect(recoverFunction).toContain("return 1");
    expect(recoverFunction.indexOf("wait_for_nolo_ready_sha;")).toBeLessThan(
      recoverFunction.indexOf("rebuild_nolo")
    );
    expect(recoverFunction.indexOf("rebuild_nolo")).toBeLessThan(
      recoverFunction.lastIndexOf("wait_for_nolo_ready_sha;")
    );
    expect(recoverFunction.lastIndexOf("wait_for_nolo_ready_sha;")).toBeLessThan(
      recoverFunction.indexOf("print_manual_rollback_guidance")
    );
  });

  it("rebuilds PM2 when the existing app uses a different Bun interpreter", () => {
    expect(source).toContain("INTERPRETER_PATH=");
    expect(source).toContain('nolo_pm2_field "exec_interpreter"');
    expect(source).toContain('echo "当前 nolo Bun interpreter: ${INTERPRETER_PATH}"');
    expect(source).toContain('elif [[ "$SCRIPT_PATH" == "$EXPECTED_ENTRY_PATH" && "$INTERPRETER_PATH" == "$BUN_BIN" ]]');
    expect(source).toContain("检测到旧入口或旧 Bun interpreter");
    expect(source).not.toContain('elif [[ "$SCRIPT_PATH" == "$EXPECTED_ENTRY_PATH" ]]; then');
  });

  it("fails deploys when the rendered homepage points at missing frontend assets", () => {
    expect(source).toContain("verify_rendered_assets()");
    expect(source).toContain('NOLO_RENDER_HEALTH_URL:-http://127.0.0.1:${APP_HTTP_PORT}/');
    expect(source).toContain('NOLO_VERIFY_ASSET_ORIGINALS="${NOLO_VERIFY_ASSET_ORIGINALS:-1}"');
    expect(source).toContain('bash "$REPO_DIR/scripts/verify/verifyRenderedWebAssets.sh" "$render_url"');
    // 失败路径已演进为 auto_rollback（自动回滚优先；无可用上一稳定版本时，
    // auto_rollback 内部降级为 print_manual_rollback_guidance "$reason" 手动指引）。
    expect(source).toContain('auto_rollback "verify-rendered-assets"');
    expect(source).toContain('print_manual_rollback_guidance "$reason"');
    expect(source).not.toContain('python3 - "$render_url" "$html_file"');
    expect(source).not.toContain('curl -fsS -H "Accept-Encoding: br,gzip" "$asset_url" -o /dev/null');

    expect(source.indexOf('if ! retry_http_contains "nolo"')).toBeLessThan(
      source.indexOf('if ! timed_deploy_step "verify-rendered-assets" verify_rendered_assets')
    );
    expect(source.indexOf('if ! timed_deploy_step "verify-rendered-assets" verify_rendered_assets')).toBeLessThan(
      source.lastIndexOf("configure_caddy_proxy")
    );
  });

  it("keeps rendered web asset verification in the shared verifier script", () => {
    expect(verifyRenderedWebAssetsSource).toContain("verifyRenderedWebAssets.sh");
    expect(verifyRenderedWebAssetsSource).toContain("NOLO_VERIFY_ASSET_ORIGINALS");
    expect(verifyRenderedWebAssetsSource).toContain("NOLO_VERIFY_ASSET_ATTEMPTS");
    expect(verifyRenderedWebAssetsSource).toContain("NOLO_VERIFY_ASSET_RETRY_DELAY_SECONDS");
    expect(verifyRenderedWebAssetsSource).toContain("Accept-Encoding: br,gzip");
    expect(verifyRenderedWebAssetsSource).toContain("public/latest-assets.json");
    expect(verifyRenderedWebAssetsSource).toContain("/public/assets/");
    expect(verifyRenderedWebAssetsSource).toContain("asset_failures=1");
    expect(verifyRenderedWebAssetsSource).toContain("original missing");
    expect(verifyRenderedWebAssetsSource).toContain("rendered web asset verification attempt");
    expect(verifyRenderedWebAssetsSource).toContain("sleep \"$retry_delay_seconds\"");
  });

  it("prints manual rollback guidance instead of automatically rolling back", () => {
    expect(source).toContain("print_manual_rollback_guidance()");
    expect(source).toContain("NOLO_RELEASE_SHA");
    expect(source).toContain("NOLO_PREVIOUS_STABLE_SHA");
    expect(source).toContain("git revert");
    expect(source).toContain("git push origin");
    expect(source).not.toContain("git reset --hard \"$previous_stable_sha\"");
    expect(source).not.toContain("git push --force");
  });

  it("samples the deploy window without making the probe a release gate", () => {
    expect(source).toContain("start_deploy_window_probe()");
    expect(source).toContain("stop_deploy_window_probe()");
    expect(source).toContain("summarize_deploy_window_probe()");
    expect(source).toContain('DEPLOY_WINDOW_PROBE="${NOLO_DEPLOY_WINDOW_PROBE:-1}"');
    expect(source).toContain('DEPLOY_WINDOW_PROBE_INTERVAL_SECONDS="${NOLO_DEPLOY_WINDOW_PROBE_INTERVAL_SECONDS:-0.2}"');
    expect(source).toContain("[nolo-deploy-window-probe]");
    expect(source).toContain("summarize_deploy_window_probe || true");
    expect(source.indexOf("start_deploy_window_probe")).toBeLessThan(
      source.indexOf('timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo')
    );
    const verifierStart = source.indexOf('if ! timed_deploy_step "verify-rendered-assets" verify_rendered_assets');
    expect(verifierStart).toBeGreaterThan(0);
    expect(verifierStart).toBeLessThan(source.indexOf("\nstop_deploy_window_probe\n", verifierStart));
  });

  it("does not pay a fixed sleep before readiness checks after reload", () => {
    const reloadStart = source.indexOf('timed_deploy_step "reload-or-start-nolo" reload_or_start_nolo');
    const statusStart = source.indexOf('timed_deploy_step "pm2-status" run_maybe_sudo "$PM2_BIN" status nolo');
    const readinessBlock = source.slice(reloadStart, statusStart);

    expect(readinessBlock).not.toContain("sleep 3");
    expect(source.indexOf('timed_deploy_step "pm2-status"')).toBeLessThan(
      source.indexOf('if ! retry_http_contains "nolo"')
    );
  });

  it("keeps Caddy config owned by configureCaddyProxy instead of inline deploy edits", () => {
    const configureFunctionStart = source.indexOf("configure_caddy_proxy() {");
    const configureFunctionEnd = source.indexOf("\n}", configureFunctionStart);
    const configureFunction = source.slice(configureFunctionStart, configureFunctionEnd);

    expect(configureFunction).toContain('bash "$script_path"');
    expect(configureFunction).toContain('NOLO_CADDYFILE_PATH="${NOLO_CADDYFILE_PATH:-/etc/caddy/Caddyfile}"');
    expect(configureFunction).not.toContain("cat >");
    expect(configureFunction).not.toContain("tee /etc/caddy/Caddyfile");
  });

  it("samples the public Caddy URL during deploy windows when provided", () => {
    expect(source).toContain('DEPLOY_WINDOW_PUBLIC_PROBE_URL="${NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL:-}"');
    expect(source).toContain('if [[ -n "$DEPLOY_WINDOW_PUBLIC_PROBE_URL" ]]; then');
    expect(source).toContain('sample_deploy_window_probe_target "public" "$DEPLOY_WINDOW_PUBLIC_PROBE_URL"');
    expect(source).toContain("[nolo-deploy-window-probe-target-summary]");
  });

  it("reports deploy-window failures per target so origin restarts do not hide public impact", () => {
    expect(source).toContain("target_stats = {}");
    expect(source).toContain('target = target_match.group(1) if target_match else "unknown"');
    expect(source).toContain("stats = target_stats.setdefault(target, {\"samples\": 0, \"failures\": 0, \"durations\": []})");
    expect(source).toContain(
      'print(f"[nolo-deploy-window-probe-target-summary] target={target} samples={stats[\'samples\']} failures={stats[\'failures\']} maxDurationMs={target_max}")'
    );
  });

  it("implements blue-green reload with reusePort slot rotation as the default deploy mode", () => {
    // 蓝绿是唯一部署模式，不再有 NOLO_BLUE_GREEN 开关
    expect(source).not.toContain('NOLO_BLUE_GREEN="${NOLO_BLUE_GREEN:-');
    expect(source).toContain("blue_green_reload_nolo()");
    expect(source).toContain("start_nolo_canary()");
    expect(source).toContain("graceful_stop_slot()");
    expect(source).toContain("wait_for_slot_ready_sha()");

    // canary 用 reusePort + DB 锁超时 + slot 标识
    expect(source).toContain("NOLO_REUSE_PORT=1");
    expect(source).toContain("NOLO_SERVER_DB_OPEN_LOCK_TIMEOUT_MS");
    expect(source).toContain("NOLO_BLUE_GREEN_DB_LOCK_TIMEOUT_MS");
    expect(source).toContain("NOLO_SLOT");

    // slot 轮替：检测 nolo 或 nolo-next 作为旧进程
    expect(source).toContain("NOLO_BLUE_GREEN_CANARY_NAME");
    expect(source).toContain('old_slot="nolo"');
    expect(source).toContain('canary_name="nolo"');

    // BLOCK-1 防护：旧进程必须已启用 reusePort，否则 fallback
    expect(source).toContain("未启用 reusePort");
    expect(source).toContain("EADDRINUSE");

    // BLOCK-3：NOLO_BLUE_GREEN_ACTIVE 有默认值（set -u 安全）
    expect(source).toContain('NOLO_BLUE_GREEN_ACTIVE="${NOLO_BLUE_GREEN_ACTIVE:-0}"');
    expect(source).toContain('NOLO_BLUE_GREEN_CANARY_NAME="${NOLO_BLUE_GREEN_CANARY_NAME:-nolo-next}"');
    expect(source).toContain('NOLO_BLUE_GREEN_ACTIVE_SLOT="${NOLO_BLUE_GREEN_ACTIVE_SLOT:-}"');

    // BLOCK-1 鸡生蛋修复：start_nolo 无条件设 reusePort（蓝绿是默认）
    expect(source).not.toContain('if [[ "$NOLO_BLUE_GREEN" == "1" ]]; then');
    expect(source).toContain('nolo_reuse_port="1"');

    // BLOCK-2 canary 失败清理
    expect(source).toContain("清理失败的 canary");

    // BLOCK pm2 status 用 active slot
    expect(source).toContain('status_slot="nolo"');
    expect(source).toContain('status "$status_slot"');

    // minor：header 文件用 mktemp 目录（并发安全）+ 清理
    expect(source).toContain("mktemp -d");
    expect(source).toContain("rm -rf \"$NOLO_BLUE_GREEN_HEADER_TMP_DIR\"");

    // WARN-4：nolo_exists 精确匹配（不误匹配 nolo-next）
    const noloExistsStart = source.indexOf("nolo_exists() {");
    const noloExistsEnd = source.indexOf("\n}\n", noloExistsStart);
    const noloExistsFunction = source.slice(noloExistsStart, noloExistsEnd);
    expect(noloExistsFunction).not.toContain('grep -qw "nolo"');
    expect(noloExistsFunction).toContain("'nolo'");

    // 蓝绿在 reload_or_start_nolo 里优先执行，成功 return，失败 fallback
    const reloadStart = source.indexOf("reload_or_start_nolo() {");
    const reloadEnd = source.indexOf("\n}\n", reloadStart);
    const reloadFunction = source.slice(reloadStart, reloadEnd);
    expect(reloadFunction).toContain("blue_green_reload_nolo");
    // 蓝绿成功不减少 rebuild_nolo_with_sha_gate 调用次数（fallback 路径不变）
    expect(reloadFunction.match(/rebuild_nolo_with_sha_gate/g)).toHaveLength(4);

    // 蓝绿成功后跳过 nolo name 检查（服务跑在 canary slot）
    expect(source).toContain('NOLO_BLUE_GREEN_ACTIVE');
    expect(source).toContain("蓝绿部署：跳过 nolo name 检查");

    // 蓝绿前置清理其他 PM2 daemon 的残留实例（2026-09-01 main 实测：root daemon
    // 残留与 canary 互等 LevelDB 锁 → canary-ready-gate 180s 超时）。必须在
    // slot 检测之前——残留清完后「无活跃 slot」的判断才准确。
    const bgFnStart = source.indexOf("blue_green_reload_nolo() {");
    const bgFnEnd = source.indexOf("\n}\n", bgFnStart);
    const bgFunction = source.slice(bgFnStart, bgFnEnd);
    expect(bgFunction).toContain("delete_stale_nolo_instances");
    expect(bgFunction.indexOf("delete_stale_nolo_instances")).toBeLessThan(
      bgFunction.indexOf("检测当前活跃 slot")
    );
  });

  it("adds x-nolo-slot header to health and ready endpoints for blue-green slot identification", () => {
    // slotIdentity.ts 是 NOLO_SLOT 的单一真值来源：entry.ts / coreRoutes.ts /
    // coreReadiness.ts 都从这里 import noloSlot，而不是各自读 process.env。
    // 断言跟着那次重构走，否则这里会在实现完好时误报。
    const slotIdentitySource = readFileSync(
      join(import.meta.dir, "..", "..", "packages", "server", "slotIdentity.ts"),
      "utf-8"
    );
    expect(slotIdentitySource).toContain('process.env.NOLO_SLOT');

    const entrySource = readFileSync(
      join(import.meta.dir, "..", "..", "packages", "server", "entry.ts"),
      "utf-8"
    );
    expect(entrySource).toContain('reusePort');

    // coreRoutes /health 加 x-nolo-slot header
    const coreRoutesSource = readFileSync(
      join(import.meta.dir, "..", "..", "packages", "server", "coreRoutes.ts"),
      "utf-8"
    );
    expect(coreRoutesSource).toContain('x-nolo-slot');

    // coreReadiness /ready 加 x-nolo-slot header 和 slot 字段
    const coreReadinessSource = readFileSync(
      join(import.meta.dir, "..", "..", "packages", "server", "coreReadiness.ts"),
      "utf-8"
    );
    expect(coreReadinessSource).toContain('x-nolo-slot');
    expect(coreReadinessSource).toContain('noloSlot');

    // 部署脚本用 x-nolo-slot header 区分新旧进程
    expect(source).toContain('x-nolo-slot');
    expect(source).toContain('NOLO_BLUE_GREEN_HEADER_TMP_DIR');
    expect(source).toContain('health-headers');
    expect(source).toContain('ready-headers');
  });
});
