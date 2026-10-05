const FETCH_TIMEOUT = 5000;

export const fetchConvMsgs = async (
  server: string,
  token: string,
  {
    dialogId,
    dialogKey,
    limit,
    beforeKey,
  }: { dialogId: string; dialogKey?: string; limit?: number; beforeKey?: string },
  options: { signal?: AbortSignal } = {}
) => {
  const { signal: externalSignal } = options;

  const controller = new AbortController();
  // The 5s budget covers the whole exchange — request start through the body
  // being fully parsed. It is only released in `finally`, never on headers.
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);
  // Covers a signal that was already aborted, plus an abort that lands between
  // the `aborted` read and the listener registration.
  if (externalSignal?.aborted) {
    controller.abort();
  }

  try {
    const response = await fetch(`${server}/rpc/getConvMsgs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dialogId,
        ...(dialogKey && { dialogKey }),
        limit,
        ...(beforeKey && { beforeKey }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`fetchConvMsgs: Failed ${response.status} from ${server}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Only re-throw when external signal was aborted (user navigated away)
    if (externalSignal?.aborted) {
      throw error;
    }
    console.error(`fetchConvMsgs: Error fetching from ${server}:`, error);
    return [];
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
};
