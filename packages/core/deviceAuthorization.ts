import { parseUserToken } from './accountSession/accountSessionCore';

export type DeviceAuthorizationFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type DeviceAuthorizationStart = Readonly<{
  deviceCode: string; userCode: string; verificationUri: string;
  verificationUriComplete: string; interval: number; expiresIn: number;
}>;
export type DeviceAuthorizationPoll =
  | { status: 'pending' }
  | { status: 'approved'; token: string; serverUrl: string; userId: string };
const fail = (code: string): never => { throw new Error(code); };

/** Only the configured origin is trusted. Desktop supplies its fixed public origin;
 * CLI may explicitly select a custom HTTP(S) server, including SSH/localhost use. */
export function deviceAuthorizationOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { return fail('invalid_origin'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) return fail('invalid_origin');
  return url.origin;
}

export function parseDeviceAuthorizationStart(data: Record<string, unknown>, origin: string): DeviceAuthorizationStart {
  if (typeof data.deviceCode !== 'string' || !data.deviceCode || data.deviceCode.length > 512 ||
      typeof data.userCode !== 'string' || !/^[A-Z0-9]{8}$/.test(data.userCode) ||
      data.verificationUri !== `${origin}/cli/authorize` ||
      data.verificationUriComplete !== `${origin}/cli/authorize?code=${data.userCode}` ||
      typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0 ||
      typeof data.interval !== 'number' || !Number.isFinite(data.interval) || data.interval <= 0) return fail('invalid_response');
  return data as DeviceAuthorizationStart;
}

export function parseDeviceAuthorizationPoll(status: number, data: Record<string, unknown>, origin: string): DeviceAuthorizationPoll {
  if (status === 202 && data.status === 'pending' && data.error === 'authorization_pending') return { status: 'pending' };
  if (status < 200 || status >= 300) return fail(data.error === 'expired_token' ? 'expired' : 'authorization_failed');
  if (status === 202 || data.status !== 'approved' || data.serverUrl !== origin ||
      typeof data.token !== 'string' || typeof data.userId !== 'string' || !data.userId ||
      parseUserToken(data.token)?.userId !== data.userId) return fail('invalid_response');
  return { status: 'approved', token: data.token, serverUrl: origin, userId: data.userId };
}

/** No browser, persistence or session ownership. Every async operation is raced
 * against both cancellation and a deadline, including non-cooperative readers. */
export function createDeviceAuthorizationProtocol(options: {
  origin: string; fetch?: DeviceAuthorizationFetch; signal?: AbortSignal;
  now?: () => number; sleep?: (ms: number) => Promise<void>; requestTimeoutMs?: number;
}) {
  const origin = deviceAuthorizationOrigin(options.origin);
  const now = options.now ?? Date.now;
  let deadline = now() + 600_000;
  const check = () => {
    if (options.signal?.aborted) fail('cancelled');
    if (now() >= deadline) fail('expired');
  };
  const bounded = async <T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> => {
    check();
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onAbort!: () => void;
    const interruption = new Promise<never>((_, reject) => {
      onAbort = () => { abort.abort(); reject(new Error('cancelled')); };
      options.signal?.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => { abort.abort(); reject(new Error(now() >= deadline ? 'expired' : 'request_timeout')); }, Math.max(1, Math.min(timeoutMs, deadline - now())));
    });
    try {
      const result = await Promise.race([interruption, work(abort.signal)]);
      check();
      return result;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onAbort);
    }
  };
  const post = (endpoint: 'start' | 'poll', body: object) => bounded(async signal => {
    const response = await (options.fetch ?? globalThis.fetch)(`${origin}/api/v1/users/cli-login/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
    });
    if (endpoint === 'start' && !response.ok) return fail('start_failed');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('invalid_response');
    return { response, data: data as Record<string, unknown> };
  }, options.requestTimeoutMs && Number.isFinite(options.requestTimeoutMs) && options.requestTimeoutMs > 0 ? Math.min(options.requestTimeoutMs, 15000) : 15000);
  return {
    check,
    get deadline() { return deadline; },
    async start(clientName: string): Promise<DeviceAuthorizationStart> {
      const { response, data } = await post('start', { clientName });
      if (!response.ok) return fail('start_failed');
      const start = parseDeviceAuthorizationStart(data, origin);
      deadline = Math.min(deadline, now() + Math.min(start.expiresIn, 600) * 1000);
      return start;
    },
    async poll(deviceCode: string): Promise<DeviceAuthorizationPoll> {
      const { response, data } = await post('poll', { deviceCode });
      return parseDeviceAuthorizationPoll(response.status, data, origin);
    },
    async wait(intervalSeconds: number): Promise<void> {
      const delay = Math.min(Math.max(1000, intervalSeconds * 1000), 30000, deadline - now());
      await bounded(signal => options.sleep ? options.sleep(delay) : new Promise<void>(resolve => {
        const onAbort = () => clearTimeout(timer);
        const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, delay);
        signal.addEventListener('abort', onAbort, { once: true });
      }), delay + 50);
    },
    run: bounded,
  };
}
