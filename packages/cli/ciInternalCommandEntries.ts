import type { CommandEntry } from "./cliCommandTypes";
import { fetchCiStatus, type CiJob } from "./tui/ciStatus";

function formatDuration(job: CiJob): string {
  if (typeof job.durationMs !== "number") return "-";
  const seconds = Math.round(job.durationMs / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m${seconds % 60}s` : `${seconds}s`;
}

function formatJob(job: CiJob): string {
  const sha = (job.shortSha || "???????").slice(0, 7).padEnd(7);
  const kind = job.kind.padEnd(16);
  const status = job.status.padEnd(9);
  const duration = formatDuration(job).padStart(6);
  const failure = job.failedPhase ? `  ✗ ${job.failedPhase}` : "";
  return `  ${sha}  ${kind}  ${status}  ${duration}${failure}`;
}

function parseLimit(args: string[]): number {
  const idx = args.indexOf("--limit");
  if (idx === -1) return 5;
  const parsed = Number.parseInt(args[idx + 1] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, 20);
}

/**
 * `nolo ci status` —— 部署状态唯一的命令行出口。
 *
 * 为什么需要它：nolo-ci 的状态只存在 alpha 的 127.0.0.1:3900，本机没有通道；
 * TUI 的 deployWake 只在实时 SSE 到达时响一次铃，事后查不到。「推了代码但看不到
 * 部署」的准确原因就是这个。
 *
 * 退出码：0 = 查到了（哪怕最近一次是 failed，那也是「查到了失败」）；
 * 1 = 取不到数据（没有 ssh 通道 / 超时 / 响应不可解析）。
 */
export function getCiInternalCommandEntries(): CommandEntry[] {
  return [
    {
      path: ["ci", "status"],
      description: "Show recent nolo-ci deploy jobs (alpha / main)",
      kind: "internal",
      handler: async (args) => {
        const jobs = await fetchCiStatus(parseLimit(args));
        if (!jobs) {
          console.log(
            "无法获取部署状态：本机到 alpha 的 ssh 通道不可用（需要 ~/.ssh/config 里有 alpha-raw，或设置 NOLO_ALPHA_SSH_CONFIG_HOST）。"
          );
          return 1;
        }
        if (jobs.length === 0) {
          console.log("nolo-ci 暂无任务记录。");
          return 0;
        }
        console.log("最近部署任务（新 → 旧）：");
        for (const job of jobs) console.log(formatJob(job));
        return 0;
      },
    },
  ];
}
