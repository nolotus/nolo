import { createDeviceAuthorizationProtocol } from 'core/deviceAuthorization';
import type { SessionAuthenticator, SessionSignInInput, SessionAuthResult } from 'core/accountSession/accountSessionService';
import { isDesktopAuthorizationUrl } from './accountUrlPolicy';
import { openDesktopAuthorizationPage } from './accountExternalActions';

const ORIGIN = 'https://nolo.chat';
export type DesktopBrowserAuthorizationState = Readonly<{
  status: 'idle' | 'starting' | 'pending' | 'committing' | 'succeeded' | 'cancelled' | 'expired' | 'failed';
  authorizationUrl?: string;
  expiresAt?: number;
  error?: string;
}>;
export interface DesktopBrowserAuthorizationOptions {
  signIn: (input: SessionSignInInput) => Promise<SessionAuthResult>;
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  open?: (url: string) => boolean;
  requestTimeoutMs?: number;
}

/** One controller per session runtime. Credentials never enter state or logs.
 * Cancellation is effective until the normal service's irreversible commit
 * begins; committing cannot be cancelled or superseded by another attempt.
 */
export function createDesktopBrowserAuthorization(options: DesktopBrowserAuthorizationOptions) {
  let state: DesktopBrowserAuthorizationState = Object.freeze({ status: 'idle' });
  const listeners = new Set<() => void>();
  let disposed = false;
  let attempt: { abort: AbortController; deadline: number; permit: SessionSignInInput } | undefined;
  let running: Promise<void> | undefined;
  const publish = (next: DesktopBrowserAuthorizationState) => {
    state = Object.freeze(next);
    if (!disposed) for (const listener of listeners) {
      try { listener(); } catch { /* UI subscribers cannot break authentication. */ }
    }
  };
  const fail = (code: string): never => { throw new Error(code); };
  const check = (current: NonNullable<typeof attempt>) => {
    if (disposed || current !== attempt || current.abort.signal.aborted) fail('cancelled');
    if (Date.now() >= current.deadline) fail('expired');
  };
  const authenticate: SessionAuthenticator = async input => {
    const current = attempt;
    // Only start() owns this exact object. Password sign-in stays closed.
    if (!current || input !== current.permit) return fail('desktop_sign_in_is_external');
    check(current);
    const protocol = createDeviceAuthorizationProtocol({ origin: ORIGIN, fetch: options.fetch, signal: current.abort.signal, requestTimeoutMs: options.requestTimeoutMs });
    const data = await protocol.start('Nolo Desktop');
    current.deadline = protocol.deadline;
    // Validate the unmodified protocol URL first; the marker is presentation
    // only, never an authorization input or a server-controlled redirect.
    const url = `${data.verificationUriComplete}&client=desktop`;
    if (!isDesktopAuthorizationUrl(url)) fail('invalid_response');
    publish({ status: 'pending', authorizationUrl: url, expiresAt: current.deadline });
    check(current);
    // A popup blocker is recoverable with reopen(); polling remains active.
    try { (options.open ?? openDesktopAuthorizationPage)(url); } catch { /* no credential-bearing error propagation */ }
    while (true) {
      check(current);
      const poll = await protocol.poll(data.deviceCode);
      if (poll.status === 'pending') {
        await protocol.wait(data.interval);
        continue;
      }
      check(current);
      publish({ status: 'committing' });
      return { token: poll.token };
    }
  };
  const cancel = () => {
    if (!attempt || state.status === 'committing') return;
    const previous = attempt;
    attempt = undefined;
    previous.abort.abort();
    publish({ status: 'cancelled' });
  };
  return {
    authenticate,
    getState: () => state,
    subscribe(listener: () => void) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    start(): Promise<void> {
      if (disposed) return Promise.resolve();
      if (running) return running;
      const current = { abort: new AbortController(), deadline: Date.now() + 600000, permit: { username: '', password: '', locale: '' } };
      attempt = current;
      // Defer notifications and signIn so a reentrant subscriber sees running.
      running = Promise.resolve().then(async () => {
        try {
          check(current);
          publish({ status: 'starting' });
          await options.signIn(current.permit);
          if (attempt === current) publish({ status: 'succeeded' });
        } catch (error) {
          if (attempt !== current) return;
          const code = error instanceof Error ? error.message : '';
          const allowed = ['cancelled', 'expired', 'request_timeout', 'invalid_response', 'start_failed', 'authorization_failed'];
          publish(code === 'expired' ? { status: 'expired' } : code === 'cancelled' ? { status: 'cancelled' } : { status: 'failed', error: allowed.includes(code) ? code : 'authorization_failed' });
        } finally {
          if (attempt === current) attempt = undefined;
          running = undefined;
        }
      });
      return running;
    },
    cancel,
    reopen(): boolean {
      if (disposed || state.status !== 'pending' || !state.authorizationUrl || !state.expiresAt || Date.now() >= state.expiresAt) return false;
      try { return (options.open ?? openDesktopAuthorizationPage)(state.authorizationUrl); } catch { return false; }
    },
    dispose() { if (disposed) return; cancel(); disposed = true; listeners.clear(); },
  };
}
/** Desktop login-page contract, attached as store.desktopBrowserAuthorization.
 * useSyncExternalStore(controller.subscribe, controller.getState) reads state.
 * start resolves on every terminal outcome; inspect state.status for success.
 * Repeated start shares the in-flight promise. Unmount calls cancel, not dispose.
 * committing is irreversible and intentionally ignores cancel. dispose belongs
 * to the session-runtime owner and permanently prevents further starts.
 */
export interface DesktopBrowserAuthorizationController {
  getState(): DesktopBrowserAuthorizationState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  cancel(): void;
  reopen(): boolean;
  dispose(): void;
}
