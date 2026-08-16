export type MachineConnectionStatus = "connected" | "disconnected";
export type MachineAvailabilityStatus = "online" | "offline";

export type MachineStatusSummary = {
  connectorStatus?: MachineConnectionStatus;
  status: MachineAvailabilityStatus;
  lastSeenAt: number;
};

export const MACHINE_OFFLINE_AFTER_MS = 90_000;

export function projectMachineSummary<T extends MachineStatusSummary>(
  machine: T,
  now = Date.now()
): T {
  if (!Number.isFinite(machine.lastSeenAt) || machine.lastSeenAt <= 0) return machine;
  if (now - machine.lastSeenAt <= MACHINE_OFFLINE_AFTER_MS) return machine;
  return {
    ...machine,
    status: "offline",
    connectorStatus: "disconnected",
  };
}
