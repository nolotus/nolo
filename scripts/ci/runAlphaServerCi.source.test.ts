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
    expect(source).toContain('classifyDeployChanges.sh "$prev_head" "$BUILD_SHA"');
    expect(source).toContain('timed_phase "skip-docs-only-deploy" true');
    expect(source).toContain('[nolo-ci-result] status=skipped reason=docs-only');
  });

  it("skips alpha build and deploy only for the strict docs classifier result", () => {
    const classification = source.indexOf('deploy_decision="$(bash ./scripts/ci/classifyDeployChanges.sh');
    const dependencyInstall = source.indexOf('timed_phase "install-dependencies" install_dependencies', classification);
    expect(classification).toBeGreaterThan(0);
    expect(classification).toBeLessThan(dependencyInstall);
    expect(source.slice(classification, dependencyInstall)).toContain('if [[ "$deploy_decision" == "skip" ]]');
    expect(source.slice(classification, dependencyInstall)).toContain("return 0");
    expect(source.slice(classification, dependencyInstall)).toContain("status=skipped");
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
    expect(source).toContain('timed_phase "build-web" build_web');
    expect(source).toContain('timed_phase "run-deploy-tests" run_deploy_tests');
    expect(source).toContain('timed_phase "deploy-main-remote" deploy_main_remote "$key_path"');
    expect(source).toContain('timed_phase "deploy-alpha-artifact" deploy_alpha_artifact');
    expect(source).toContain("print_phase_timing_summary");
    expect(source).toContain("epoch_millis()");
    expect(source).not.toMatch(/\$\(\s*date \+%s%3N\s*\)/);
  });

  it("pins the ready-sha gate to the job artifact instead of mutable repo HEAD", () => {
    const alphaDeployStart = source.indexOf("deploy_alpha_artifact() {");
    const alphaDeployEnd = source.indexOf("\n}\n", alphaDeployStart);
    const alphaDeploy = source.slice(alphaDeployStart, alphaDeployEnd);
    expect(alphaDeploy).toContain('NOLO_RELEASE_SHA="$BUILD_SHA"');

    const mainDeployStart = source.indexOf("deploy_main_remote() {");
    const mainDeployEnd = source.indexOf("\n}\n", mainDeployStart);
    const mainDeploy = source.slice(mainDeployStart, mainDeployEnd);
    expect(mainDeploy).toContain('NOLO_RELEASE_SHA="$BUILD_SHA"');

    const maintenanceStart = source.indexOf("alpha_maintenance() {");
    const maintenanceDeploy = source.slice(maintenanceStart);
    expect(maintenanceDeploy).toContain('NOLO_RELEASE_SHA="$BUILD_SHA"');
  });

  it("defers nolo-ci self-restart until the current deploy job is terminal", () => {
    const alphaDeployStart = source.indexOf("deploy_alpha_artifact() {");
    const alphaDeployEnd = source.indexOf("\n}\n", alphaDeployStart);
    const alphaDeploy = source.slice(alphaDeployStart, alphaDeployEnd);

    expect(alphaDeploy).toContain("schedule_nolo_ci_restart_after_job");
    expect(alphaDeploy).not.toContain("manageNoloCiPm2.sh restart");
    expect(source).toContain('NOLO_DEPLOY_JOB_ID="${NOLO_DEPLOY_JOB_ID:-}"');
    expect(source).toContain("restartNoloCiAfterJob.ts");
    expect(source).toContain("scripts/ops/restartNoloCiAfterJob\\.ts$");
    expect(source).toContain("setsid -f");
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

describe("main-web-release artifact promotion contract", () => {
  it("defines artifact promotion check and promotion runner functions", () => {
    expect(source).toContain("check_alpha_artifact_promotable()");
    expect(source).toContain("meta 缺失 = 无法证明完整 SHA = 必须全量重建");
    expect(source).toContain("promote_alpha_artifact()");
    expect(source).toContain("fail-closed");
    expect(source).toContain('log "promoting alpha artifact for ${lookup_sha} (skip build/test)"');
    expect(source).toContain('log "artifact not found; full rebuild"');
  });

  it("defines a single unified build_web function with precompression so alpha and main artifacts are equivalent", () => {
    expect(source).toContain("build_web() {");
    expect(source).not.toContain("build_alpha_web()");
    expect(source).not.toContain("build_release_web()");
    const buildWebFn = /build_web\(\) \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
    expect(buildWebFn).toContain("NODE_ENV=production");
    expect(buildWebFn).toContain("NOLO_WEB_PRECOMPRESS=1");
    expect(buildWebFn).toContain('NOLO_BUILD_SHA="$BUILD_SHA"');
    expect(buildWebFn).toContain('"$BUN_BIN" run build');

    // 晋升前提：脚本中只存在一个 bun run build 的构建函数定义，防止未来再拆出参数漂移的第二份
    const buildMatches = source.match(/run build\b/g) ?? [];
    expect(buildMatches).toHaveLength(1);
  });

  it("gates CF builder offload behind both env vars and keeps a host build fallback", () => {
    // 任务 1：offload 分支（env 门控）+ 回退分支都必须存在，且门控变量名正确。
    expect(source).toContain('NOLO_CF_BUILDER_URL="${NOLO_CF_BUILDER_URL:-}"');
    expect(source).toContain('NOLO_CF_BUILDER_TOKEN="${NOLO_CF_BUILDER_TOKEN:-}"');
    expect(source).toContain("cf_build_alpha_offload() {");
    expect(source).toContain('if [[ -z "$NOLO_CF_BUILDER_URL" || -z "$NOLO_CF_BUILDER_TOKEN" ]]');
    // CF 调用+轮询+下载+校验逻辑集中在独立客户端脚本 cf-build-client.sh
    expect(source).toContain('bash "$REPO_DIR/scripts/ci/cf-build-client.sh"');
    // HIGH：token 出 argv —— 由客户端脚本经 curl --config 文件承载，不裸露在进程 argv。
    expect(source).not.toContain('X-Builder-Token: $NOLO_CF_BUILDER_TOKEN');
    // BLOCK-1：成功登记产物交接点供 package_web_artifact 消费。
    expect(source).toContain('CF_OFFLOAD_ARTIFACT_TAR_GZ="$work_dir/web-build.tar.gz"');
    expect(source).toContain('CF_OFFLOAD_ARTIFACT_TAR_GZ="${CF_OFFLOAD_ARTIFACT_TAR_GZ:-}"');
    expect(source).toContain('if [[ -n "$CF_OFFLOAD_ARTIFACT_TAR_GZ" && -s "$CF_OFFLOAD_ARTIFACT_TAR_GZ" ]]');
    expect(source).toContain('nolo-web-build-${BUILD_SHA}.tar.gz');
    expect(source).toContain('gzip -dc "$CF_OFFLOAD_ARTIFACT_TAR_GZ" > "$ARTIFACT_DIR/nolo-web-build-${BUILD_SHA}.tar"');
    expect(source).toContain("CF build unavailable, falling back to host build");
    expect(source).toContain("CF build ok/free:");

    // offload 成功 → 跳过宿主 build_web；失败/未配置 → 回退 build_web（部署永远完成）。
    const alphaDeployFn = /alpha_deploy\(\) \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
    expect(alphaDeployFn).toContain("if timed_phase \"cf-build-alpha-offload\" cf_build_alpha_offload; then");
    expect(alphaDeployFn).toContain("timed_phase \"build-web\" build_web");
    expect(alphaDeployFn).toContain('timed_phase "install-dependencies" install_dependencies');
    // offload 与本地构建是互斥的两条分支，必须同处 alpha_deploy 的构建段
    const offloadIdx = alphaDeployFn.indexOf("cf_build_alpha_offload");
    const hostBuildIdx = alphaDeployFn.indexOf('"build-web" build_web');
    expect(offloadIdx).toBeGreaterThan(0);
    expect(hostBuildIdx).toBeGreaterThan(offloadIdx);
  });

  it("emits a warmup step after health verification in alpha deploy", () => {
    // 任务 2（C 项）：PM2 部署 + 健康检查通过后，追加 2 个最轻的 warmup 请求。
    expect(source).toContain("warmup_after_deploy() {");
    expect(source).toContain('curl -sf -o /dev/null -w \'%{http_code}\' --max-time 10 "$base/"');
    expect(source).toContain('curl -sf -o /dev/null -w \'%{http_code}\' --max-time 10 "$base/public/meta.json"');
    expect(source).toContain("failed (non-blocking)");
    expect(source).toContain("WARNING: warmup GET");
    const alphaDeployFn = /alpha_deploy\(\) \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
    expect(alphaDeployFn).toContain('timed_phase "warmup-after-deploy" warmup_after_deploy');
    const healthIdx = alphaDeployFn.indexOf('"verify-alpha-health" verify_alpha_health');
    const warmupIdx = alphaDeployFn.indexOf('"warmup-after-deploy" warmup_after_deploy');
    expect(healthIdx).toBeGreaterThan(0);
    expect(warmupIdx).toBeGreaterThan(healthIdx);
  });

  it("branches main_web_release to promote alpha artifact or fall back to full rebuild", () => {
    const mainFn = /main_web_release\(\) \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
    expect(mainFn).toContain('if check_alpha_artifact_promotable "$lookup_sha"; then');
    expect(mainFn).toContain('timed_phase "promote-alpha-artifact" promote_alpha_artifact');
    expect(mainFn).toContain('timed_phase "install-dependencies" install_dependencies');
    expect(mainFn).toContain('timed_phase "build-web" build_web');
    expect(mainFn).toContain('timed_phase "verify-server-imports" verify_server_imports');
    expect(mainFn).toContain('timed_phase "run-deploy-tests" run_deploy_tests');
    expect(mainFn).toContain('timed_phase "package-main-web-artifact" main_package_web_artifact');
  });

  it("resolves the alpha-side HEAD (merge second parent) as the artifact lookup key in main-web-release", () => {
    const mainFn = /main_web_release\(\) \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
    // main 是 alpha 的 merge，merge SHA ≠ alpha SHA；必须用 HEAD^2（alpha 侧 HEAD）找归档。
    expect(mainFn).toContain('git rev-parse HEAD^2');
    expect(mainFn).toContain('lookup_sha="$alpha_head"');
    // 解析失败（非 merge 或单父）时回退 BUILD_SHA 并打日志。
    expect(mainFn).toContain('falling back to BUILD_SHA');
    // lookup_sha 必须同时传给 check 与 promote，保证归档命名与 meta 校验一致。
    expect(mainFn).toContain('check_alpha_artifact_promotable "$lookup_sha"');
    expect(mainFn).toContain('promote_alpha_artifact "$lookup_sha"');
  });

  it("keeps alpha-deploy not passing a lookup_sha (functions default to BUILD_SHA)", () => {
    const alphaDeployFn = /alpha_deploy\(\) \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
    // alpha-deploy 不传 lookup_sha（保持现状用 BUILD_SHA）：它不引用 lookup_sha，
    // 也不以 "$lookup_sha" 形式调用 check/promote。
    expect(alphaDeployFn).not.toContain("lookup_sha");
    expect(alphaDeployFn).not.toContain('check_alpha_artifact_promotable "$lookup_sha"');
    expect(alphaDeployFn).not.toContain('promote_alpha_artifact "$lookup_sha"');
    // 函数签名默认参数必须存在，保证不传时回退 BUILD_SHA。
    expect(source).toContain('local lookup_sha="${1:-$BUILD_SHA}"');
  });
});

describe("main-web-release artifact promotion behavior", () => {
  const scriptPath = "scripts/ci/runAlphaServerCi.sh";

  async function runBash(env: Record<string, string>, scriptCmd: string) {
    const proc = Bun.spawn(["bash", "-c", `source ${scriptPath} "" >/dev/null && ${scriptCmd}`], {
      env: {
        ...process.env,
        ...env,
        NOLO_BUILD_SHA: env.BUILD_SHA ?? env.NOLO_BUILD_SHA ?? "",
        NOLO_ALPHA_WORK_DIR: env.WORK_DIR ?? env.NOLO_ALPHA_WORK_DIR ?? process.cwd(),
        NOLO_ALPHA_REPO_DIR: env.REPO_DIR ?? env.NOLO_ALPHA_REPO_DIR ?? process.cwd(),
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { stdout, stderr, exitCode };
  }

  it("promotes when alpha artifact exists, is non-empty, and meta sha matches", async () => {
    const { mkdtemp, rm, writeFile, mkdir } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const tmpWork = await mkdtemp(join(tmpdir(), "nolo-work-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";
    const shortsha = sha.slice(0, 12);

    try {
      const artPath = join(tmpArchive, `alpha-${shortsha}.tar.gz`);
      const metaPath = join(tmpArchive, `alpha-${shortsha}.meta.json`);
      await writeFile(artPath, "fake-tarball-content");
      await writeFile(metaPath, JSON.stringify({ sha, kind: "alpha", bytes: 20 }));

      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).toBe(0);

      const promoteRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha, WORK_DIR: tmpWork },
        "promote_alpha_artifact",
      );
      expect(promoteRes.exitCode).toBe(0);
      expect(promoteRes.stdout).toContain(`promoting alpha artifact for ${sha} (skip build/test)`);

      const targetTar = await Bun.file(join(tmpWork, "web-build.tar.gz")).text();
      expect(targetTar).toBe("fake-tarball-content");
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
      await rm(tmpWork, { recursive: true, force: true });
    }
  });

  it("falls back when alpha artifact is missing", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";

    try {
      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).not.toBe(0);
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });

  it("falls back when alpha artifact is empty (0 bytes)", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";
    const shortsha = sha.slice(0, 12);

    try {
      await writeFile(join(tmpArchive, `alpha-${shortsha}.tar.gz`), "");
      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).not.toBe(0);
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });

  it("falls back when meta.json sha mismatches BUILD_SHA", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";
    const shortsha = sha.slice(0, 12);

    try {
      await writeFile(join(tmpArchive, `alpha-${shortsha}.tar.gz`), "tar-bytes");
      await writeFile(
        join(tmpArchive, `alpha-${shortsha}.meta.json`),
        JSON.stringify({ sha: "different-sha-value", kind: "alpha" }),
      );
      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).not.toBe(0);
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });

  it("falls back when meta.json is missing even if artifact tar exists", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";
    const shortsha = sha.slice(0, 12);

    try {
      await writeFile(join(tmpArchive, `alpha-${shortsha}.tar.gz`), "tar-bytes");
      // meta.json 显式不创建，验证 meta 缺失时强制不可晋升（无法证明完整 40 位 SHA）
      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).not.toBe(0);
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });

  it("falls back when meta.json is malformed JSON", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";
    const shortsha = sha.slice(0, 12);

    try {
      await writeFile(join(tmpArchive, `alpha-${shortsha}.tar.gz`), "tar-bytes");
      await writeFile(join(tmpArchive, `alpha-${shortsha}.meta.json`), "{ malformed json: not valid");
      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).not.toBe(0);
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });

  it("falls back when python3 is not available in PATH", async () => {
    const { mkdtemp, rm, writeFile, symlink } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { existsSync } = await import("node:fs");

    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-archive-test-"));
    const tmpBin = await mkdtemp(join(tmpdir(), "nolo-bin-test-"));
    const sha = "a1b2c3d4e5f6789012345678901234567890abcd";
    const shortsha = sha.slice(0, 12);

    try {
      await writeFile(join(tmpArchive, `alpha-${shortsha}.tar.gz`), "tar-bytes");
      await writeFile(join(tmpArchive, `alpha-${shortsha}.meta.json`), JSON.stringify({ sha, kind: "alpha" }));

      for (const bin of ["bash", "mktemp", "rm", "cat"]) {
        const p = existsSync(`/bin/${bin}`) ? `/bin/${bin}` : `/usr/bin/${bin}`;
        await symlink(p, join(tmpBin, bin));
      }

      const checkRes = await runBash(
        { NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive, BUILD_SHA: sha, PATH: tmpBin },
        "check_alpha_artifact_promotable",
      );
      expect(checkRes.exitCode).not.toBe(0);
      expect(checkRes.stderr).toContain("python3 not available");
    } finally {
      await rm(tmpArchive, { recursive: true, force: true });
      await rm(tmpBin, { recursive: true, force: true });
    }
  });
});

describe("CF offload artifact junction (BLOCK-1): package_web_artifact consumes CF download", () => {
  const scriptPath = "scripts/ci/runAlphaServerCi.sh";

  async function runBash(env: Record<string, string>, scriptCmd: string) {
    const proc = Bun.spawn(["bash", "-c", `source ${scriptPath} "" >/dev/null && ${scriptCmd}`], {
      env: {
        ...process.env,
        ...env,
        NOLO_BUILD_SHA: env.BUILD_SHA ?? env.NOLO_BUILD_SHA ?? "",
        NOLO_ALPHA_WORK_DIR: env.WORK_DIR ?? env.NOLO_ALPHA_WORK_DIR ?? process.cwd(),
        NOLO_ALPHA_REPO_DIR: env.REPO_DIR ?? env.NOLO_ALPHA_REPO_DIR ?? process.cwd(),
        NOLO_ALPHA_ARTIFACT_DIR: env.ARTIFACT_DIR ?? env.NOLO_ALPHA_ARTIFACT_DIR ?? "",
        NOLO_ARTIFACT_ARCHIVE_DIR: env.NOLO_ARTIFACT_ARCHIVE_DIR ?? "",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { stdout, stderr, exitCode };
  }

  it("consumes the CF tar.gz junction and produces the deployable .tar at the exact handoff path", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { execFileSync } = await import("node:child_process");

    const tmpWork = await mkdtemp(join(tmpdir(), "nolo-cf-junction-"));
    const tmpArtifact = await mkdtemp(join(tmpdir(), "nolo-cf-artifact-"));
    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-cf-archive-"));
    const sha = "0123456789abcdef0123456789abcdef01234567";
    const cfTgz = join(tmpWork, "web-build.tar.gz");
    // CF 交付的是真实 gzip：解压出的 tar 内容即「CF 产物字节」。
    const cfRaw = new TextEncoder().encode("CF-BUILT-ARTIFACT-CONTENT");
    const rawTar = join(tmpWork, "raw.tar");
    await writeFile(rawTar, cfRaw);
    const gzBuf = execFileSync("gzip", ["-c", rawTar]);

    try {
      await writeFile(cfTgz, gzBuf);
      const res = await runBash(
        {
          BUILD_SHA: sha,
          WORK_DIR: tmpWork,
          ARTIFACT_DIR: tmpArtifact,
          NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive,
          CF_OFFLOAD_ARTIFACT_TAR_GZ: cfTgz,
        },
        "package_web_artifact",
      );
      expect(res.exitCode).toBe(0);
      // 交接点产物：deployRemote.sh 消费 nolo-web-build-<sha>.tar（tar -xf）。
      const deployedTar = join(tmpArtifact, `nolo-web-build-${sha}.tar`);
      const deployedGz = join(tmpArtifact, `nolo-web-build-${sha}.tar.gz`);
      expect(res.stdout).toContain("CF offload artifact consumed");
      // .tar 解出的内容必须与 CF 交付字节一致 → 证明部署的就是 CF 产物。
      const tarBytes = await Bun.file(deployedTar).arrayBuffer();
      expect(new Uint8Array(tarBytes)).toEqual(cfRaw);
      // gzip 归档源即 CF 下载文件（字节级一致）。
      const gzBytes = await Bun.file(deployedGz).arrayBuffer();
      expect(new Uint8Array(gzBytes)).toEqual(new Uint8Array(gzBuf));
      // 双端 sha/字节数打印在日志里。
      expect(res.stdout).toContain("tar.gz sha=");
      expect(res.stdout).toContain("tar    sha=");
    } finally {
      await rm(tmpWork, { recursive: true, force: true });
      await rm(tmpArtifact, { recursive: true, force: true });
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });

  it("without the CF junction falls back to repacking from public/ (existing behavior)", async () => {
    const { mkdtemp, rm, mkdir, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const tmpWork = await mkdtemp(join(tmpdir(), "nolo-cf-nonjunction-"));
    const tmpArtifact = await mkdtemp(join(tmpdir(), "nolo-cf-artifact-"));
    const tmpArchive = await mkdtemp(join(tmpdir(), "nolo-cf-archive-"));
    const sha = "0123456789abcdef0123456789abcdef01234567";

    try {
      // 模拟宿主构建产物（public/ 下清单文件，basePath 与生产一致为 /public/assets/）。
      const assetDir = "public/assets";
      await mkdir(join(tmpWork, assetDir), { recursive: true });
      await mkdir(join(tmpWork, "public", "locales"), { recursive: true });
      await mkdir(join(tmpWork, "public", "route-styles"), { recursive: true });
      await writeFile(join(tmpWork, "public", "latest-assets.json"), JSON.stringify({ basePath: `/${assetDir}/` }));
      await writeFile(join(tmpWork, "public", "meta.json"), "{}");
      await writeFile(join(tmpWork, assetDir, "app.js"), "//host-built");

      const res = await runBash(
        {
          BUILD_SHA: sha,
          WORK_DIR: tmpWork,
          ARTIFACT_DIR: tmpArtifact,
          NOLO_ARTIFACT_ARCHIVE_DIR: tmpArchive,
          CF_OFFLOAD_ARTIFACT_TAR_GZ: "", // 未配置 CF 交接点
        },
        "package_web_artifact",
      );
      expect(res.exitCode).toBe(0);
      expect(res.stdout).not.toContain("CF offload artifact consumed");
      // 走本地打包路径，产物同样出现在 deploy 消费路径。
      const deployedTar = join(tmpArtifact, `nolo-web-build-${sha}.tar`);
      expect(await Bun.file(deployedTar).exists()).toBe(true);
    } finally {
      await rm(tmpWork, { recursive: true, force: true });
      await rm(tmpArtifact, { recursive: true, force: true });
      await rm(tmpArchive, { recursive: true, force: true });
    }
  });
});
