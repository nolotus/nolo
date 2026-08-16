import { describe, expect, it } from "bun:test";

const source = await Bun.file("scripts/ci/runAlphaServerCi.sh").text();
const mainWorkflow = await Bun.file(".github/workflows/main.yml").text();
const maintenanceWorkflow = await Bun.file(".github/workflows/maintenance.yml").text();

describe("runAlphaServerCi source contract", () => {
  it("keeps alpha server CI as the authoritative build/test/deploy entrypoint", () => {
    expect(source).toContain("alpha-deploy");
    expect(source).toContain("alpha-maintenance");
    expect(source).toContain("alpha-billing-audit");
    expect(source).toContain("alpha-token-probe");
    expect(source).toContain("alpha-agent-smoke");
    expect(source).toContain("main-web-release");
    expect(source).toContain('REPO_DIR="${NOLO_ALPHA_REPO_DIR:-/root/bun-nolo}"');
    expect(source).toContain('WORK_DIR="${NOLO_ALPHA_WORK_DIR:-$REPO_DIR}"');
    expect(source).toContain('cd "$WORK_DIR"');
    expect(source).toContain('SKIP_WORK_SYNC="${NOLO_ALPHA_SKIP_WORK_SYNC:-0}"');
    expect(source).toContain('if [[ "$SKIP_WORK_SYNC" == "1" && -n "$BUILD_SHA" ]]');
    expect(source).toContain('current_head="$(git rev-parse HEAD)"');
    expect(source).toContain('fail "NOLO_ALPHA_SKIP_WORK_SYNC=1 but WORK_DIR is at ${current_head}, expected ${BUILD_SHA}"');
    expect(source).toContain('"$WORK_DIR/node_modules" "$HOME/.bun/install/cache"');
    expect(source).toContain("sync_alpha_runtime_checkout()");
    expect(source).toContain('cd "$REPO_DIR"');
    expect(source).toContain("git reset --hard");
    expect(source).toContain("NOLO_BUILD_SHA=\"$BUILD_SHA\" \"$BUN_BIN\" run build");
    expect(source).toContain("scripts/release/deployRemote.source.test.ts");
    expect(source).toContain("scripts/ci/workflowCostPolicy.test.ts");
    expect(source).toContain('NOLO_CADDY_HOSTS="us.nolo.chat,crm.nolo.chat,date.nolo.chat"');
    expect(source).toContain("bash ./scripts/release/deployRemote.sh");
    expect(source).toContain("bash ./scripts/ops/restartAlphaConnector.sh");
    expect(source).toContain('NOLO_REPO_DIR="$REPO_DIR"');
    expect(source).toContain("cleanup_alpha_runner_work");
    expect(source).toContain("cleanupAlphaRunnerWorkCore.sh");
  });

  it("routes every runner _temp deletion through the active-worker guarded helper", () => {
    // Deploy/maintenance must never raw-delete shared runner temp while Runner.Worker
    // owns a job. cleanup_alpha_runner_work → cleanupAlphaRunnerWorkCore.sh is the only path.
    expect(source).not.toContain('rm -rf "${ALPHA_RUNNER_WORK}/_temp"/*');
    expect(source).not.toContain("rm -rf ${ALPHA_RUNNER_WORK}/_temp/*");
    expect(source).toContain("cleanup_alpha_runner_work");
    expect(source).toContain("cleanupAlphaRunnerWorkCore.sh");

    const rebuildableStart = source.indexOf("cleanup_rebuildable_state()");
    const rebuildableBody = source.slice(
      rebuildableStart,
      source.indexOf("\n}", rebuildableStart) + 2
    );
    expect(rebuildableBody).toContain("cleanup_alpha_runner_work");
    expect(rebuildableBody).not.toContain("rm -rf");

    // alpha-maintenance cleans runner disk twice (before + after service work).
    const maintenanceStart = source.indexOf("alpha_maintenance()");
    const maintenanceBody = source.slice(maintenanceStart);
    const cleanupCalls = maintenanceBody.match(/cleanup_alpha_runner_work/g) ?? [];
    expect(cleanupCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("does not let maintenance inherit a workflow_dispatch main GITHUB_SHA as the alpha target", () => {
    expect(source).toContain('elif [[ "$COMMAND" == "alpha-deploy" || "$COMMAND" == "main-web-release" ]]');
    expect(source).toContain('BUILD_SHA="${GITHUB_SHA:-}"');
    expect(source).toContain('BUILD_SHA=""');
    expect(source).toContain("Defaults to GITHUB_SHA only for deploy/release commands.");
  });

  it("keeps GitHub Actions as manual probe-only because nolo-ci owns web deploys", () => {
    expect(mainWorkflow).not.toContain("main-web-release:");
    expect(mainWorkflow).not.toContain("push:");
    expect(mainWorkflow).toContain("alpha-token-probe:");
    expect(mainWorkflow).toContain("workflow_dispatch");
    expect(mainWorkflow).toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-token-probe");
    expect(mainWorkflow).toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-billing-audit");
    expect(mainWorkflow).not.toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-deploy");
    expect(mainWorkflow).not.toContain("bash ./scripts/ci/runAlphaServerCi.sh main-web-release");
  });

  it("keeps maintenance workflow as a thin alpha-server command wrapper", () => {
    expect(maintenanceWorkflow).toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-maintenance");
    expect(maintenanceWorkflow).toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-agent-smoke");
    expect(source).toContain('bash ./scripts/ops/manageNoloCiPm2.sh restart');
    expect(source).toContain("cleanup_alpha_tmp_rebuildable_state()");
    expect(source).toContain("-name 'systemd-private-*' -prune");
    expect(source).toContain("-name 'nolo-app-*-leveldb'");
    expect(source).toContain("-name 'nolo-alpha-app-audit-*'");
    expect(source).toContain("-name 'playwright-download-*'");
    expect(source).toContain("-name '.*.react-native-skia'");
    expect(source).toContain("-name '.*.react-icons'");
    expect(source).toContain("-name '.*.mermaid'");
    expect(source).toContain('ws_root="${NOLO_CI_WORKSPACE_ROOT:-/var/tmp/nolo-ci-workspaces}"');
    expect(source).not.toContain("find /tmp -mindepth 1 -maxdepth 1 -exec rm -rf {} +");
    expect(maintenanceWorkflow).not.toContain("uses: actions/checkout");
    expect(maintenanceWorkflow).not.toContain("uses: oven-sh/setup-bun");
    expect(maintenanceWorkflow).not.toContain("docker system prune");
    expect(maintenanceWorkflow).not.toContain("systemctl restart caddy");
  });

  it("keeps main web release in a dedicated checkout instead of the alpha service checkout", () => {
    expect(source).toContain('MAIN_RELEASE_DIR="${NOLO_MAIN_RELEASE_DIR:-/root/bun-nolo-release/main}"');
    expect(source).toContain('git clone "$REPO_DIR" "$MAIN_RELEASE_DIR"');
    expect(source).toContain('git fetch origin main');
    expect(source).toContain('NOLO_BUILD_SHA="$BUILD_SHA" "$BUN_BIN" run build');
    expect(source).toContain("main_remote_artifact_path()");
    expect(source).toContain("printf '/tmp/nolo-main-web-build-%s-%s/web-build.tar.gz\\n' \"$RUN_ID\" \"$BUILD_SHA\"");
    expect(source).toContain('NOLO_ARTIFACT_PATH="$REMOTE_ARTIFACT"');
    expect(source).not.toContain('NOLO_ARTIFACT_PATH="/tmp/nolo-main-web-build-${BUILD_SHA}.tar.gz"');
    expect(source).not.toContain("rm -f /tmp/nolo-main-web-build-*.tar.gz");
    expect(source).toContain("--cluster main");
  });

  it("pins production PM2 to a stable Bun binary outside the mutable installer path", () => {
    expect(source).toContain('STABLE_BUN_BIN="${BUN_INSTALL}/bin/bun-nolo-${BUN_VERSION}"');
    expect(source).toContain('install -m 755 "$(command -v bun)" "$STABLE_BUN_BIN"');
    expect(source).toContain('BUN_BIN="$STABLE_BUN_BIN"');
    expect(source).toContain('NOLO_BUN_BIN="$BUN_BIN"');
    expect(source).not.toContain('BUN_BIN="$(command -v bun)"\n\nNOLO_BRANCH=main');
  });

  it("emits structured phase timings around release-critical CI steps", () => {
    expect(source).toContain("timed_phase()");
    expect(source).toContain("PHASE_TIMING_LINES=()");
    expect(source).toContain("print_phase_timing_summary()");
    expect(source).toContain("Nolo CI phase timing summary");
    expect(source).toContain("[nolo-ci-phase]");
    expect(source).toContain("durationMs=");
    expect(source).toContain('PHASE_TIMING_LINES+=("$timing_line")');
    expect(source).toContain('timed_phase "install-dependencies" install_dependencies');
    expect(source).toContain('timed_phase "build-web" build_alpha_web');
    expect(source).toContain('timed_phase "build-web" build_release_web');
    expect(source).toContain('timed_phase "run-deploy-tests" run_deploy_tests');
    expect(source).toContain('timed_phase "deploy-main-remote" deploy_main_remote "$key_path"');
    expect(source).toContain('timed_phase "deploy-alpha-artifact" deploy_alpha_artifact');
    expect(source).toContain("print_phase_timing_summary");
  });

  it("preflights disk space and reports usage before alpha and main releases", () => {
    expect(source).toContain('timed_phase "preflight-disk-check" preflight_disk_check')
    expect(source).toContain("preflight_disk_check()")
    expect(source).toContain("report_disk_usage()")
    expect(source).toContain("cleanup_var_lib_rebuildable()")
    expect(source).toContain('DISK_WARN_KB="${NOLO_ALPHA_DISK_WARN_KB:-1048576}"')
    expect(source).toContain('DISK_MIN_KB="${NOLO_ALPHA_DISK_MIN_KB:-524288}"')
  });

  it("passes public deploy-window probe URLs for alpha and main releases", () => {
    expect(source).toContain('NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL="$ALPHA_PUBLIC_BASE/health"');
    expect(source).toContain("NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL=https://nolo.chat/health");
    expect(source.indexOf('NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL="$ALPHA_PUBLIC_BASE/health"')).toBeLessThan(
      source.indexOf('bash ./scripts/release/deployRemote.sh')
    );
    expect(source.indexOf("NOLO_DEPLOY_WINDOW_PUBLIC_PROBE_URL=https://nolo.chat/health")).toBeLessThan(
      source.indexOf("curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors https://nolo.chat/ready")
    );
  });

  it("waits for core readiness rather than process liveness after deploy", () => {
    expect(source).toContain('NOLO_SERVICE_HEALTH_URL="$ALPHA_LOCAL_BASE/ready"');
    expect(source).toContain("NOLO_SERVICE_HEALTH_URL=http://127.0.0.1:38123/ready");
    expect(source).toContain("https://nolo.chat/ready");
  });

  it("gives PM2 enough time to finish the bounded server drain", () => {
    expect(source.match(/NOLO_PM2_KILL_TIMEOUT=40000/g)?.length).toBe(3);
  });
});

describe("alpha frontend-only deploy classification", () => {
  it("skips the core restart only for browser artifact changes", () => {
    expect(source).toContain("alpha_core_restart_required()");
    expect(source).toContain(
      "packages/web/*|packages/app/*|packages/chat/*|packages/auth/*|packages/database/*|packages/share/*|public/*)"
    );
    expect(source).toContain(
      "packages/server/*|packages/nolo-ci/*|packages/ai/server/*|packages/auth/server/*|packages/database/server/*|packages/share/server/*"
    );
    expect(source).toContain("NOLO_SKIP_CORE_RELOAD=\"$skip_core_reload\"");
    expect(source).toContain("仅浏览器 artifact 变更；跳过 nolo 核心重启");
    expect(source).toContain("非纯前端变更；执行 nolo 核心重启");
  });
});

/**
 * 健康验证必须紧跟部署、排在数据卫生审计之前。
 *
 * main_web_release 曾经把 audit-main-remote 排在 verify-main-public-health
 * 之前；set -e 下审计一失败，健康检查就永远不执行。2026-07-27 实测：一条已删
 * demo 账号的账本残留让审计恒返回非零，每次 main 部署都是红的，团队学会了忽略，
 * 而真正部署炸掉时红得一模一样、健康检查同样不跑。alpha_deploy 一直是对的
 * （deploy → verify → audit），main 是唯一的例外。
 */
describe("deploy phase ordering", () => {
  const phaseOrder = (fn: string) => {
    const body = new RegExp(`${fn}\\(\\) \\{([\\s\\S]*?)\\n\\}`).exec(source)?.[1] ?? "";
    return [...body.matchAll(/timed_phase "([^"]+)"/g)].map((m) => m[1]);
  };

  it("verifies main health before the billing audit, matching alpha", () => {
    const order = phaseOrder("main_web_release");
    const deploy = order.indexOf("deploy-main-remote");
    const verify = order.indexOf("verify-main-public-health");
    const audit = order.indexOf("audit-main-remote");
    expect(deploy).toBeGreaterThanOrEqual(0);
    expect(verify).toBeGreaterThan(deploy);
    expect(audit).toBeGreaterThan(verify);
  });

  it("keeps the same deploy → verify → audit order on alpha", () => {
    const order = phaseOrder("alpha_deploy");
    expect(order.indexOf("verify-alpha-health")).toBeGreaterThan(
      order.indexOf("deploy-alpha-artifact"),
    );
    expect(order.indexOf("audit-alpha-app-lifecycle")).toBeGreaterThan(
      order.indexOf("verify-alpha-health"),
    );
  });
});

/**
 * 失败相位必须留下 [nolo-ci-phase] 标记。
 *
 * timed_phase 原本直接写 `"$@"`，脚本又跑在 set -Eeuo pipefail 下，于是命令一
 * 失败就立刻终止，来不及打印标记。后果是 phaseTimings 里只剩成功的相位，
 * 「哪一步挂了」不可知，nolo-ci 只能回退去扫日志猜——2026-07-27 实测它把一句
 * 来自**通过测试**的 `error: "chat upstream deadline exceeded"` 报成了根因，
 * 而那个 job 的 run-deploy-tests 明明 105 pass / 0 fail。
 */
describe("timed_phase failure visibility", () => {
  it("captures a failing phase's status instead of letting set -e abort first", () => {
    // 实测（bash 直跑，裸调用 timed_phase）：
    //   `"$@"` + `status=$?`      → 无任何 [nolo-ci-phase] 行，脚本静默中止
    //   `status=0` + `"$@" || …`  → phase=bad status=3，再原样传播失败
    expect(source).toContain('  "$@" || status=$?');
    expect(source).not.toMatch(/\n  "\$@"\n  status=\$\?/);
  });

  it("still propagates the failure so the job is not silently green", () => {
    expect(source).toMatch(/timed_phase\(\) \{[\s\S]*?return "\$status"/);
  });
});

/**
 * 部署门槛的测试清单是手维护的，会静默腐烂。
 *
 * 实测（2026-07-27）：清单里的 packages/database/server/dbPath.test.ts 在
 * e93081722 拆 database-engine 时就搬走了。裸 `bun test` 对**匹配不到的路径
 * 静默忽略**，于是这个文件此后一直没被跑过，而门槛始终报绿——沉默被当成了成功。
 *
 * 两道防线：清单里的路径必须真实存在；执行必须走 runTestsIsolated
 * （它会把不存在的文件算作失败，并把含 mock.module 的文件单独起进程——
 * 清单里 chatHandler / databaseRoutes / chatUpstreamRetry 三个都用了 mock.module，
 * 同进程跑会互相污染，而这道门槛决定代码能否上生产）。
 */
describe("deploy test gate", () => {
  const gateBody =
    /run_deploy_tests\(\) \{[\s\S]*?\n\}/.exec(source)?.[0] ?? "";
  const listedTestFiles = [...gateBody.matchAll(/^\s+(\S+\.test\.ts)/gm)].map(
    (match) => match[1],
  );

  it("lists at least the known deploy-critical test files", () => {
    expect(listedTestFiles.length).toBeGreaterThanOrEqual(10);
  });

  it("only lists test files that actually exist", async () => {
    const missing: string[] = [];
    for (const file of listedTestFiles) {
      if (!(await Bun.file(file).exists())) missing.push(file);
    }
    expect(missing).toEqual([]);
  });

  it("runs the gate through the isolated runner, not bare `bun test`", () => {
    expect(gateBody).toContain("scripts/runTestsIsolated.ts");
    // 裸 `bun test <files>` 会静默跳过不存在的路径，且不隔离 mock.module。
    expect(gateBody).not.toMatch(/"\$BUN_BIN" test\b/);
  });
});
