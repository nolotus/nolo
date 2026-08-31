/**
 * fd 压力下仍然可靠的同步子进程 runner（测试专用）。
 *
 * ## 为什么需要它：一个真实咬过人的环境级故障
 *
 * `Bun.spawnSync` / `node:child_process.spawnSync` 在把子进程 stdout/stderr 接成
 * pipe（或接成父进程打开的文件 fd）时，**要求父进程分到的那个 fd 编号低于约
 * 10240**。父进程持有的 fd 一旦多到让新 fd 编号越过这条线，spawn 出来的子进程
 * 会变成下面这副样子：
 *
 *   - 子进程**照样执行**（`exit 3` 依然如实返回 3，`/usr/bin/false` 依然返回 1）
 *   - 但它对 stdout/stderr 的**每一次写都失败**
 *   - 于是 `echo`/`printf` 之类以写成败决定退出码的命令变成 **exit 1**
 *   - 父进程侧看到的是 `stdout=""`、`stderr=""`、`error=null`、`signalCode=undefined`
 *   - 连 `bash -x` 的 xtrace 都是空的（xtrace 也写 stderr）
 *
 * 也就是「**bash 无声 exit 1**」：没有任何错误信息，看起来像脚本自己挂了，实际上
 * 脚本一行都没出错，只是它的嘴被堵住了。这个故障 100% 取决于 fd 编号，与脚本
 * 逻辑、env 内容、cwd、HOME、PATH、bash 版本全都无关。
 *
 * ## 测试进程为什么会持有上万个 fd
 *
 * `bun test` 以 cwd 为根做测试文件发现走查，走查过的目录/文件 fd 不会释放。实测
 * （bun 1.3.14 / macOS）：
 *
 *   - 在仓库根跑 `bun test`：进程常驻 **~14350 个 fd**（`ios/` 的 CocoaPods 产物
 *     8898 个、`node_modules/` 3207 个、`electrochem-courseware/` 914 个……）
 *     → 新 fd 编号 >10240 → 所有 piped spawn 的子进程都变成无声 exit 1
 *   - 在 `scripts/release/` 里跑同一个文件：**~10 个 fd** → 一切正常
 *   - 在只 checkout 了一部分内容的 worktree 里跑：**~145 个 fd** → 一切正常
 *
 * 所以同一个 commit、同一个测试文件，在「完整主 checkout」里挂、在「瘦 worktree」
 * 里全绿，而且症状还会随 `ios/`、`node_modules/` 的体积漂移。这是**环境级故障，
 * 不是被测脚本的 bug**，而且它谁都躲不过：任何在测试里 spawn 子进程并读取其输出
 * 的用例，在足够大的 checkout 里都会中招。
 *
 * ## 这个 helper 怎么绕开
 *
 * 不让父进程给子进程接 stdio，而是让**子进程自己打开输出文件**（`exec >file 2>file`
 * 由子进程内部执行，用的是子进程自己的低位 fd），父进程 spawn 时 stdio 全部
 * `"ignore"`，事后把文件读回来。子进程侧的 fd 表是干净的，因此不管父进程持有多少
 * fd 都稳。
 *
 * ## 对测试的环境前提要求
 *
 * 用了这个 helper 之后：**没有前提**。这正是它存在的意义 —— 测试在任何 checkout、
 * 任何 cwd、任何 fd 压力下行为一致。反过来说，**这些测试里不要再直接用
 * `Bun.spawnSync` / `spawnSync` 去读子进程输出**，那样会把上面的环境依赖重新引进来。
 * 只断言退出码时用裸 spawnSync 是安全的（退出码不受影响）。
 *
 * 回归保护见 `scripts/test/spawnCapturedSync.source.test.ts`：它人为把 fd 压到
 * 阈值之上，因此在瘦 worktree 里也能复现并拦住这类退化。
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type SpawnCapturedResult = {
  /**
   * 子进程退出码。拿不到时为 -1（对应 Bun.spawnSync 的 `exitCode: null`）。
   *
   * 约定：当 `signalCode` 非空（即子进程被信号终止，而非正常 exit）时，
   * 这里必然是 -1 —— 因为被信号终止的子进程不会返回退出码。正常退出时
   * 才是真实退出码（0~255）。若想区分「正常退出 / 被信号终止 / spawn 本身
   * 失败」，请结合 `signalCode` 判断，不要只看 `exitCode`。
   */
  exitCode: number;
  /**
   * 子进程被信号终止时的信号名（如 "SIGTERM"）；正常退出或 spawn 本身失败时为
   * undefined。与 Bun.spawnSync 的 `signalCode` 一致。
   */
  signalCode?: string;
  stdout: string;
  stderr: string;
};

export type SpawnCapturedOptions = {
  /** 传了就是完整替换子进程 env（与 Bun.spawnSync 语义一致）；不传则继承。 */
  env?: Record<string, string | undefined>;
  cwd?: string;
};

/**
 * 包装用的 bash 走绝对路径解析：调用方传进来的 env 可能有自己的 PATH，
 * 包装层不该依赖它（被包装的命令仍按调用方 env 的 PATH 解析）。
 */
const WRAPPER_BASH = Bun.which("bash") ?? "/bin/bash";

function shQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * 跑一个命令，可靠地拿回 { exitCode, signalCode, stdout, stderr }。
 *
 * 语义与 `Bun.spawnSync({ cmd, env, cwd, stdout: "pipe", stderr: "pipe" })` 对齐，
 * 包括被信号终止时 `exitCode` 为 null（此处映射为 -1）、`signalCode` 为信号名
 * （如 "SIGTERM"），区别只在于输出是经由临时文件回收的，因此不受父进程 fd 压力影响。
 */
export function spawnCapturedSync(
  cmd: string[],
  options: SpawnCapturedOptions = {},
): SpawnCapturedResult {
  if (cmd.length === 0) throw new Error("spawnCapturedSync: cmd is empty");

  const captureDir = mkdtempSync(join(tmpdir(), "nolo-spawn-capture-"));
  const outPath = join(captureDir, "stdout");
  const errPath = join(captureDir, "stderr");
  try {
    // 子进程自己开输出文件（低位 fd），然后 exec 掉自己 —— 退出码即真实命令的退出码。
    const wrapper = `exec >${shQuote(outPath)} 2>${shQuote(errPath)}\nexec "$@"`;
    const result = Bun.spawnSync({
      cmd: [WRAPPER_BASH, "-c", wrapper, "nolo-spawn-captured", ...cmd],
      ...(options.env ? { env: options.env } : {}),
      ...(options.cwd ? { cwd: options.cwd } : {}),
      // 关键：父进程一律不接 stdio，避免高位 fd 参与 spawn。
      stdout: "ignore",
      stderr: "ignore",
    });
    const read = (path: string): string => {
      try {
        return readFileSync(path, "utf8");
      } catch {
        return "";
      }
    };
    return {
      exitCode: result.exitCode ?? -1,
      signalCode: result.signalCode ?? undefined,
      stdout: read(outPath),
      stderr: read(errPath),
    };
  } finally {
    rmSync(captureDir, { recursive: true, force: true });
  }
}
