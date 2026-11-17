/** Transport/lifetime only. No decision, ticket, tool or permission semantics. */
export type InheritedApprovalChannel = {
  connected?: boolean;
  send?: (...args: any[]) => unknown;
  on(event: string, listener: (...args: any[]) => void): unknown;
  removeListener(event: string, listener: (...args: any[]) => void): unknown;
};
export function sendInheritedApproval(channel: InheritedApprovalChannel, kind: string, message: object, failed: () => void) {
  if (channel.connected === false || !channel.send) { failed(); return; }
  try { channel.send({ kind, ...message }, (error: Error | null) => { if (error) failed(); }); } catch { failed(); }
}
export function bindInheritedApprovalLifetime(channel: InheritedApprovalChannel, close: () => void, signal?: AbortSignal) {
  for (const event of ["disconnect", "exit", "error"]) channel.on(event, close);
  signal?.addEventListener("abort", close, { once: true });
  return () => {
    for (const event of ["disconnect", "exit", "error"]) channel.removeListener(event, close);
    signal?.removeEventListener("abort", close);
  };
}
