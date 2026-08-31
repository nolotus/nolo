/**
 * `spawnCapturedSync` 的回归保护。
 *
 * 这个文件的价值全在「人为制造 fd 压力」那一段：真实故障只在**大 checkout**里自然
 * 出现（`bun test` 在仓库根走查测试文件后常驻 ~14350 个 fd），瘦 worktree 里天然
 * 只有 ~145 个 fd，所以裸 spawn 的退化在 worktree 里根本复现不出来 —— 曾经就是这样
 * 让一批测试「worktree 全绿、主 checkout 17 挂」。这里主动把 fd 编号顶到阈值
 * (~10240) 之上，让退化在任何 checkout 下都能被拦住。
 */
import { describe, expect, it } from "bun:test";
import { closeSync, openSync } from "node:fs";
import { spawnCapturedSync } from "./spawnCapturedSync";

/** 观测到的阈值：父进程新 fd 编号越过约 10240 后，piped spawn 的子进程 stdio 全废。 */
const FD_CEILING = 10_240;
const FD_PRESSURE_TARGET = 12_000;

/** 撑起 fd 压力跑 fn；返回过程中见到的最高 fd 编号，便于判断压力是否真的到位。 */
function withFdPressure<T>(fn: () => T): { highestFd: number; value: T } {
  const held: number[] = [];
  try {
    while (held.length < FD_PRESSURE_TARGET) {
      try {
        held.push(openSync("/dev/null", "r"));
      } catch {
        break; // RLIMIT_NOFILE 太低（例如 CI 上 ulimit -n 256），到此为止。
      }
    }
    const highestFd = held.length ? held[held.length - 1] : 0;
    return { highestFd, value: fn() };
  } finally {
    for (const fd of held) {
      try {
        closeSync(fd);
      } catch {
        // 关不掉也不该让测试挂。
      }
    }
  }
}

describe("spawnCapturedSync", () => {
  it("正常情况下拿回退出码、stdout、stderr", () => {
    const run = spawnCapturedSync([
      "bash",
      "-c",
      "printf 'out-line\\n'; printf 'err-line\\n' >&2; exit 3",
    ]);
    expect(run.exitCode).toBe(3);
    expect(run.stdout).toBe("out-line\n");
    expect(run.stderr).toBe("err-line\n");
  });

  it("父进程持有上万 fd 时依然拿回完整输出（真实故障场景）", () => {
    const { highestFd, value: run } = withFdPressure(() =>
      spawnCapturedSync([
        "bash",
        "-c",
        "printf 'under-pressure\\n'; printf 'pressure-err\\n' >&2; exit 5",
      ]),
    );

    expect(run.exitCode).toBe(5);
    expect(run.stdout).toBe("under-pressure\n");
    expect(run.stderr).toBe("pressure-err\n");

    if (highestFd <= FD_CEILING) {
      // 压力没顶到阈值之上（fd 上限太低），上面的断言只覆盖了常态路径。
      console.warn(
        `spawnCapturedSync: fd pressure only reached fd ${highestFd} (<= ${FD_CEILING}); ` +
          "the regression scenario was not actually exercised on this machine.",
      );
    }
  });

  it("子进程被信号终止时如实返回 signalCode，exitCode 映射为 -1", () => {
    // 真实信号场景：子进程向自己发 SIGTERM，于是整个被 spawn 的进程以 SIGTERM 终止。
    // Bun.spawnSync 会把它报告为 exitCode=null / signalCode="SIGTERM"，
    // helper 应如实透传 signalCode，并把 exitCode 按约定映射为 -1。
    const run = spawnCapturedSync(["bash", "-c", "kill -TERM $$"]);
    expect(run.signalCode).toBe("SIGTERM");
    expect(run.exitCode).toBe(-1);
    expect(run.stdout).toBe("");
    expect(run.stderr).toBe("");
  });

  it("正常退出时信号字段为空，退出码为真实值", () => {
    const run = spawnCapturedSync(["bash", "-c", "exit 3"]);
    expect(run.signalCode).toBeUndefined();
    expect(run.exitCode).toBe(3);
  });

  it("传 env 时完整替换子进程环境", () => {
    const run = spawnCapturedSync(["bash", "-c", 'printf "%s\\n" "${MARKER:-unset}"'], {
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", MARKER: "from-env" },
    });
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toBe("from-env\n");
  });

  it("传 cwd 时子进程在该目录下运行", () => {
    const run = spawnCapturedSync(["bash", "-c", "pwd -P"], { cwd: "/tmp" });
    expect(run.exitCode).toBe(0);
    expect(run.stdout.trim()).toBe(require("node:fs").realpathSync("/tmp"));
  });
});
