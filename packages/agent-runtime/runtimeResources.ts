// Shared pure runtime resource calculations safe for client imports.
import {
  computeQuotaMetric,
  transformCloudflareContainersQuota,
  CLOUDFLARE_WORKERS_PAID_INCLUDED_CPU_SECONDS,
  CLOUDFLARE_WORKERS_PAID_INCLUDED_MEMORY_BYTE_SECONDS,
  CLOUDFLARE_WORKERS_PAID_INCLUDED_DISK_BYTE_SECONDS,
  CLOUDFLARE_WORKERS_PAID_PLAN_ID,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  BYTES_PER_GIB,
  BYTES_PER_GB,
  type CloudflareContainersQuotaSnapshot,
} from "./cloudflareContainersQuota";

export interface QuotaMetric {
  name: string;
  unit: string;
  included: number;
  used: number;
  remaining: number;
  overage: number;
  percentageRemaining: number;
  formattedLimit: string;
}

export interface CloudflareResourceQuota {
  kind: "cloudflare";
  status: "estimated" | "configured" | "unconfigured";
  isEstimated: boolean;
  authoritative: boolean;
  planId: string;
  source: string;
  metrics: {
    cpu: QuotaMetric;
    memory: QuotaMetric;
    disk: QuotaMetric;
  };
}

export type RuntimeResourcePayload =
  | CloudflareResourceQuota
  | { kind: "unconfigured"; status: "unconfigured"; message: string };

export function buildDefaultCloudflareSnapshot(
  now?: string | number | Date,
): CloudflareContainersQuotaSnapshot {
  return transformCloudflareContainersQuota({
    accountTag: "default",
    subscription: {
      result: [
        {
          rate_plan: { id: CLOUDFLARE_WORKERS_PAID_PLAN_ID },
          current_period_start: "2026-10-01T00:00:00Z",
          current_period_end: "2026-11-01T00:00:00Z",
        },
      ],
    },
    graphqlResponse: {
      data: {
        viewer: {
          accounts: [
            {
              containersUsageAdaptiveGroups: [],
            },
          ],
        },
      },
    },
    now: now ?? "2026-10-16T12:00:00Z",
  });
}

export function resolveRuntimeResources(
  kind?: string,
  snapshotInput?:
    | CloudflareContainersQuotaSnapshot
    | { quotaSnapshot?: CloudflareContainersQuotaSnapshot | null }
    | null,
): RuntimeResourcePayload {
  if (kind !== "cloudflare") {
    return {
      kind: "unconfigured",
      status: "unconfigured",
      message: "Runtime resource kind not configured",
    };
  }

  const snapshot: CloudflareContainersQuotaSnapshot =
    (snapshotInput && "quotaSnapshot" in snapshotInput
      ? snapshotInput.quotaSnapshot
      : (snapshotInput as CloudflareContainersQuotaSnapshot | null)) ??
    buildDefaultCloudflareSnapshot();

  if (!snapshot || snapshot.status !== "estimated" || !snapshot.metrics) {
    return {
      kind: "unconfigured",
      status: "unconfigured",
      message:
        (snapshot && "detail" in snapshot && snapshot.detail) ||
        (snapshot && "reason" in snapshot && snapshot.reason) ||
        "Cloudflare containers quota snapshot is unavailable or unconfigured",
    };
  }

  // Pure calculation using computeQuotaMetric from cloudflareContainersQuota
  const cpuMetric = computeQuotaMetric({
    metric: "cpu",
    unit: "vcpu-seconds",
    included: snapshot.metrics.cpu.included,
    used: snapshot.metrics.cpu.used,
  });

  const memMetric = computeQuotaMetric({
    metric: "memory",
    unit: "byte-seconds",
    included: snapshot.metrics.memory.included,
    used: snapshot.metrics.memory.used,
  });

  const diskMetric = computeQuotaMetric({
    metric: "disk",
    unit: "byte-seconds",
    included: snapshot.metrics.disk.included,
    used: snapshot.metrics.disk.used,
  });

  // Safe conversions to display units (vCPU-min, GiB-hr, GB-hr)
  // Ensure no division by zero and no NaN.
  const cpuIncludedMin = cpuMetric.included / SECONDS_PER_MINUTE;
  const cpuUsedMin = cpuMetric.used / SECONDS_PER_MINUTE;
  const cpuRemainingMin = cpuMetric.remaining / SECONDS_PER_MINUTE;
  const cpuOverageMin = cpuMetric.overage / SECONDS_PER_MINUTE;
  const cpuPctRemaining =
    cpuIncludedMin > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((cpuRemainingMin / cpuIncludedMin) * 100)),
        )
      : 0;

  const memUnitDivisor = SECONDS_PER_HOUR * BYTES_PER_GIB;
  const memIncludedGiBHr = memMetric.included / memUnitDivisor;
  const memUsedGiBHr = memMetric.used / memUnitDivisor;
  const memRemainingGiBHr = memMetric.remaining / memUnitDivisor;
  const memOverageGiBHr = memMetric.overage / memUnitDivisor;
  const memPctRemaining =
    memIncludedGiBHr > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((memRemainingGiBHr / memIncludedGiBHr) * 100)),
        )
      : 0;

  const diskUnitDivisor = SECONDS_PER_HOUR * BYTES_PER_GB;
  const diskIncludedGBHr = diskMetric.included / diskUnitDivisor;
  const diskUsedGBHr = diskMetric.used / diskUnitDivisor;
  const diskRemainingGBHr = diskMetric.remaining / diskUnitDivisor;
  const diskOverageGBHr = diskMetric.overage / diskUnitDivisor;
  const diskPctRemaining =
    diskIncludedGBHr > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((diskRemainingGBHr / diskIncludedGBHr) * 100),
          ),
        )
      : 0;

  return {
    kind: "cloudflare",
    status: "estimated",
    isEstimated: true,
    authoritative: false,
    planId: snapshot.planId ?? CLOUDFLARE_WORKERS_PAID_PLAN_ID,
    source: "cloudflare-containers-graphql-estimated",
    metrics: {
      cpu: {
        name: "vCPU",
        unit: "vCPU-min",
        included: Number.isFinite(cpuIncludedMin) ? cpuIncludedMin : 0,
        used: Number.isFinite(cpuUsedMin) ? cpuUsedMin : 0,
        remaining: Number.isFinite(cpuRemainingMin) ? cpuRemainingMin : 0,
        overage: Number.isFinite(cpuOverageMin) ? cpuOverageMin : 0,
        percentageRemaining: Number.isFinite(cpuPctRemaining)
          ? cpuPctRemaining
          : 0,
        formattedLimit: `${cpuIncludedMin} vCPU-min`,
      },
      memory: {
        name: "内存",
        unit: "GiB-hr",
        included: Number.isFinite(memIncludedGiBHr) ? memIncludedGiBHr : 0,
        used: Number.isFinite(memUsedGiBHr) ? memUsedGiBHr : 0,
        remaining: Number.isFinite(memRemainingGiBHr) ? memRemainingGiBHr : 0,
        overage: Number.isFinite(memOverageGiBHr) ? memOverageGiBHr : 0,
        percentageRemaining: Number.isFinite(memPctRemaining)
          ? memPctRemaining
          : 0,
        formattedLimit: `${memIncludedGiBHr} GiB-hr`,
      },
      disk: {
        name: "磁盘",
        unit: "GB-hr",
        included: Number.isFinite(diskIncludedGBHr) ? diskIncludedGBHr : 0,
        used: Number.isFinite(diskUsedGBHr) ? diskUsedGBHr : 0,
        remaining: Number.isFinite(diskRemainingGBHr) ? diskRemainingGBHr : 0,
        overage: Number.isFinite(diskOverageGBHr) ? diskOverageGBHr : 0,
        percentageRemaining: Number.isFinite(diskPctRemaining)
          ? diskPctRemaining
          : 0,
        formattedLimit: `${diskIncludedGBHr} GB-hr`,
      },
    },
  };
}

