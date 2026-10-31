import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { resolveMacSigningPlan } from "./macSigningPlan";

export type CodesignCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/**
 * codesign 调用抽象：默认走真实 codesign，测试注入假实现。
 * 抽出它是因为 ad-hoc 签名发生在 macOS runner 上，Linux 上无法实跑 codesign，
 * 判定与「签名后必须自证」这两段逻辑只能靠可注入的 runner 做单测。
 */
export type CodesignCommandRunner = (
  command: string[]
) => Promise<CodesignCommandResult>;

const runCodesignCommand: CodesignCommandRunner = async (command) => {
  // stdout/stderr 都收进管道而不是 inherit：codesign 的诊断信息主要走 stderr，
  // 我们要在失败时把原始输出完整嵌进错误信息，日志里也要留一份。
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
};

const formatRawOutput = (result: CodesignCommandResult) => {
  const merged = [result.stdout, result.stderr]
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .join("\n");
  return merged || "(codesign produced no output)";
};

const logCodesignOutput = (
  label: string,
  command: string[],
  result: CodesignCommandResult
) => {
  console.log(
    `[desktop] codesign ${label}: ${command.join(" ")} (exit ${result.exitCode})`
  );
  const raw = formatRawOutput(result);
  if (raw !== "(codesign produced no output)") {
    console.log(`[desktop] codesign ${label} output:\n${raw}`);
  }
};

const isSet = (value: string | undefined) =>
  typeof value === "string" && value.trim().length > 0;

/**
 * 是否需要在打包链里自己做 ad-hoc 签名。
 *
 * 判定与 electrobun 配置共用同一份计划（macSigningPlan），避免两处判定漂移。
 * ELECTROBUN_OS 只在明确指向别的目标系统时才排除——它在部分构建流程里并不会
 * 传给 postWrap 子进程，若把它当硬前提，ad-hoc 签名会被静默跳过，产出未签名
 * 产物（Apple Silicon 上直接被 Gatekeeper 判为「已损坏」）。
 */
export const shouldAdhocCodesign = (input?: {
  platform?: string;
  env?: Record<string, string | undefined>;
}): boolean => {
  const platform = input?.platform ?? process.platform;
  const env = input?.env ?? process.env;
  if (platform !== "darwin") return false;
  const targetOs = env.ELECTROBUN_OS;
  // ELECTROBUN_OS 缺失时按 macOS 处理——它在部分构建流程里不会传给 postWrap
  // 子进程，把它当硬前提会让 ad-hoc 签名被静默跳过，产出未签名产物
  // （Apple Silicon 上直接被 Gatekeeper 判为「已损坏」）。只在它明确指向
  // 别的目标系统时才排除。
  if (isSet(targetOs) && targetOs !== "macos" && targetOs !== "darwin") return false;
  if (env.ELECTROBUN_BUILD_ENV === "dev") return false;
  return resolveMacSigningPlan(env).mode === "ad-hoc";
};

/** 本次构建实际会走的 macOS 签名模式（与「配置层面的模式」区分开）。 */
export type EffectiveMacSigningMode = "developer-id" | "ad-hoc" | "none";

export const resolveEffectiveMacSigningMode = (input?: {
  platform?: string;
  env?: Record<string, string | undefined>;
}): EffectiveMacSigningMode => {
  const platform = input?.platform ?? process.platform;
  const env = input?.env ?? process.env;
  const plan = resolveMacSigningPlan(env);
  if (plan.mode === "developer-id") return "developer-id";
  if (shouldAdhocCodesign({ platform, env })) return "ad-hoc";
  return "none";
};

/**
 * 模式横幅：构建日志里必须一眼看出本次走的是哪条签名路径。
 * CI 失败时 owner 靠这一行区分「脚本坏了」与「凭据缺失」。
 */
export const describeEffectiveMacSigningMode = (
  mode: EffectiveMacSigningMode
): string => {
  if (mode === "developer-id") {
    return "developer-id 正式签名（electrobun 的 Developer ID 签名 + 公证；不启用 ad-hoc 回退）";
  }
  if (mode === "ad-hoc") {
    return "ad-hoc 回退（无 Apple Developer ID：codesign --force --deep --sign -；产物不带公证，macOS 用户首次需右键「打开」放行；过渡分发路径）";
  }
  return "none（本次构建不做 macOS 签名：dev 构建或非 macOS 目标）";
};

/** 保持既有导出名不变：post-wrap.ts 依赖它。 */
export const shouldRunLocalAdhocCodesign = shouldAdhocCodesign();

/**
 * postWrap 在「wrapper 的 Contents/Resources 目录不存在」时该如何处置。
 *
 * 抽成纯函数是为了可测：该分支在真实 macOS 上才会走 ad-hoc 路径，而 CI 之外
 * 没人能在非 macOS 上复现「ad-hoc + Resources 缺失」这个组合——不抽出来就只能
 * 靠源码字符串断言（改回错误实现也测不出来）。
 *
 * - ad-hoc 模式：必须抛错。静默 exit(0) 会跳过全部签名，产出一个装不上的
 *   .app 却报「构建成功」。
 * - 非 ad-hoc 模式：保持既有行为（正常退出）。
 */
export const resolveMissingResourcesAction = (
  adhocMode: boolean
): "fail" | "exit" => (adhocMode ? "fail" : "exit");

export const findAppBundleInDir = (dir: string) => {
  const appBundles = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    .map((entry) => join(dir, entry.name));

  if (appBundles.length !== 1) {
    throw new Error(
      `Expected exactly one .app bundle in ${dir}, found ${appBundles.length}`
    );
  }

  return appBundles[0];
};

/**
 * ad-hoc 签名 + 强制自证。
 *
 * 为什么签名后必须以 `--verify` 为准：`codesign --deep` 在某些情况下会静默跳过
 * 失败的嵌套代码，签名命令本身仍然返回 0。也就是说「codesign 退出码为 0」并不
 * 等于「bundle 里的可执行文件都带上了有效签名」。而 Apple Silicon 上没有有效
 * 签名的可执行文件会被 Gatekeeper 判为「已损坏、移入废纸篓」且不可绕过——
 * 也就是说一个「看起来构建成功」的未签名产物，用户根本装不上。
 *
 * 因此这里的规则是：verify 失败 → 直接抛错让构建失败，绝不降级成「不签名继续」。
 */
export const adhocCodesignAppBundle = async (
  appBundlePath: string,
  options?: { runner?: CodesignCommandRunner }
) => {
  const runner = options?.runner ?? runCodesignCommand;

  console.log(`[desktop] ad-hoc codesigning ${basename(appBundlePath)}`);

  const signCommand = [
    "codesign",
    "--force",
    "--deep",
    "--sign",
    "-",
    appBundlePath,
  ];
  const signResult = await runner(signCommand);
  logCodesignOutput("sign", signCommand, signResult);
  if (signResult.exitCode !== 0) {
    throw new Error(
      `ad-hoc 签名失败（codesign --force --deep --sign - ${appBundlePath}，退出码 ${signResult.exitCode}）：${formatRawOutput(signResult)}\n` +
        `macOS 用户将无法安装此产物：Apple Silicon 上未签名的可执行文件会被 Gatekeeper 判为「已损坏」且不可绕过。` +
        `构建中止，不发布未签名产物。`
    );
  }

  // 自证环节：以 --verify 的结果为准，不信任上面那条命令的退出码。
  // --deep 与仓库既有的 verifyMacAppBundle.sh 保持一致（都要递归校验嵌套代码），
  // 因为「外层签名有效但内嵌可执行文件没签名」正是 --deep 静默跳过时的产物形态。
  const verifyCommand = [
    "codesign",
    "--verify",
    "--strict",
    "--verbose=2",
    "--deep",
    appBundlePath,
  ];
  const verifyResult = await runner(verifyCommand);
  logCodesignOutput("verify", verifyCommand, verifyResult);
  if (verifyResult.exitCode !== 0) {
    throw new Error(
      `ad-hoc 签名校验失败（codesign --verify --strict --verbose=2 --deep ${appBundlePath}，退出码 ${verifyResult.exitCode}）：${formatRawOutput(verifyResult)}\n` +
        `签名未生效，macOS 用户将无法安装此产物。--deep 可能静默跳过了 bundle 内失败的嵌套代码，` +
        `需要人工核查 app 内每个可执行文件是否带签名。构建中止，不发布未签名产物。`
    );
  }

  // 事后核对：把签名信息（format / flags / identifier）打进日志，便于确认产物
  // 确实是 ad-hoc 签名，而不是残留的旧 Developer ID 签名。
  // 用 Apple 文档里的 display 形式（codesign -d --verbose=4），不与 -v 叠加，
  // 避免同一选项重复出现导致的参数歧义——这套命令第一次真跑就是在 CI 上。
  const detailCommand = ["codesign", "-d", "--verbose=4", appBundlePath];
  const detailResult = await runner(detailCommand);
  logCodesignOutput("detail", detailCommand, detailResult);
  const detailOutput = formatRawOutput(detailResult);
  if (detailResult.exitCode !== 0) {
    // 「事后身份自证」本身就是自证环节的一环：连签名详情都读不出来，说明这次
    // 核对没有真正完成，不能当成「已核对通过」放行。
    throw new Error(
      `ad-hoc 签名详情读取失败（codesign -d --verbose=4 ${appBundlePath}，退出码 ${detailResult.exitCode}）：${detailOutput}\n` +
        `无法确认产物的签名身份，构建中止，不发布签名身份不可控的产物。`
    );
  }
  if (detailOutput.includes("Authority=")) {
    throw new Error(
      `期望 ad-hoc 签名，但 codesign 报告该 bundle 带有第三方证书签名（Authority=...）：${detailOutput}\n` +
        `签名身份与预期不符，构建中止，不发布签名模式不可控的产物。`
    );
  }
  if (!detailOutput.toLowerCase().includes("adhoc")) {
    // 不直接失败：codesign 的输出文案随版本变化，标记缺失只说明「无法自动确认」，
    // 上面的原始输出已完整进日志，供人工核对。
    console.warn(
      `[desktop] codesign -dv 输出里没有识别到 ad-hoc 标记，请人工核对上面的签名信息：${detailOutput}`
    );
  }
};

export const rewriteTarballFromDir = async (
  tarballPath: string,
  cwdDir: string,
  entryName: string
) => {
  // --format=ustar：与上游 electrobun 2.0.4 的发布归档格式保持一致。GNU tar 默认格式
  // 对 >100 字符的路径写 longname 'L'/'K' 记录，自解压器不支持，会以
  // TarUnsupportedFileType 中止解包；USTAR 把长路径拆成 prefix+name，正是解包器
  // fullFileName() 会读的组合（最长 255 字符）。
  const repackProc = Bun.spawn(
    ["tar", "--zstd", "--format=ustar", "-cf", tarballPath, "-C", cwdDir, entryName],
    {
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        // Keep macOS AppleDouble (._*) files out of published archives.
        COPYFILE_DISABLE: "1",
      },
    }
  );

  const repackExitCode = await repackProc.exited;
  if (repackExitCode !== 0) {
    throw new Error(`failed to repack ${tarballPath} with exit code ${repackExitCode}`);
  }
};

export const withTempDir = async <T>(prefix: string, fn: (dir: string) => Promise<T>) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
