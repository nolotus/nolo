/**
 * 云沙盒（`sbx --cloud`）计费规格 / 镜像 / create argv 的**单一真值**。
 *
 * 为什么单独成模块：`scripts/ci/dockerVerification.ts`（验证链）与
 * `packages/server/handlers/agentRun/docker/runViaDockerSandbox.ts`（执行器）必须共用同一份
 * shape / 镜像 / argv 拼装逻辑；而执行器被分层测试禁止反向引用 `scripts/ci`
 * （见 runViaDockerSandbox.test.ts 的 layering guard），所以真值落在双方都能依赖的叶子模块。
 * 本文件不 import 任何仓库内模块，也不做 I/O，可在任何层安全引用。
 */

export interface SandboxShapeSpec {
  readonly id: string;
  readonly cpus: number;
  readonly memory: string;
}

/** Cloud sandboxes are billed by shape; only these sizes may ever be requested. */
export const SANDBOX_BILLABLE_SHAPES: readonly SandboxShapeSpec[] = [
  { id: "micro1/2G", cpus: 1, memory: "2g" },
  { id: "small2/4G", cpus: 2, memory: "4g" },
  { id: "medium4/8G", cpus: 4, memory: "8g" },
  { id: "large8/16G", cpus: 8, memory: "16g" },
  { id: "xl16/32G", cpus: 16, memory: "32g" },
];

export const SANDBOX_DEFAULT_SHAPE = "medium4/8G";

export function billableSandboxShape(id: string): SandboxShapeSpec {
  const found = SANDBOX_BILLABLE_SHAPES.find((x) => x.id === id);
  if (!found) throw Error(`Non-billable sandbox shape: ${id}`);
  return found;
}

/** Pinned Bun image ref — `latest` is never used. */
export function pinnedBunSandboxImage(pinnedBun: string): string {
  return `docker.io/oven/bun:${pinnedBun}`;
}

export const SANDBOX_DEFAULT_PLATFORM = "linux/amd64";

export interface SbxCloudCreateSpec {
  name: string;
  shapeId?: string;
  ttlMinutes: number;
  onTimeout?: "stop";
  /** 显式镜像引用；缺省取 pinned Bun 镜像（同源 helper，不另抄一份字符串）。 */
  image?: string;
  /** 云模板：自带 shape 与镜像，不与 --image-ref/--cpus/--memory 同时发送。 */
  template?: string;
}

/**
 * `sbx --cloud create` 的 argv 真值（数组传参，永不拼 shell 字符串）。
 *
 * 顺序与 `scripts/ci/dockerVerification.ts` 真机核实过的那条完全一致：
 * `--cloud create --name N [--image-ref I --cpus C --memory M | --template T]
 *  --platform linux/amd64 --ttl <n>m --on-timeout stop`
 *
 * **没有 `--shape`**：计费规格只能通过 cpus/memory（或 template）表达，
 * 传入 `--shape` 会被 sbx 视为未知参数。
 */
export function buildSbxCloudCreateArgv(spec: SbxCloudCreateSpec): string[] {
  const shape = billableSandboxShape(spec.shapeId ?? SANDBOX_DEFAULT_SHAPE);
  const args = ["--cloud", "create", "--name", spec.name];
  if (spec.template !== undefined) {
    args.push("--template", spec.template);
  } else {
    args.push(
      "--image-ref",
      spec.image ?? pinnedBunSandboxImage(Bun.version),
      "--cpus",
      String(shape.cpus),
      "--memory",
      shape.memory,
    );
  }
  args.push(
    "--platform",
    SANDBOX_DEFAULT_PLATFORM,
    "--ttl",
    `${spec.ttlMinutes}m`,
    "--on-timeout",
    spec.onTimeout ?? "stop",
  );
  return args;
}
