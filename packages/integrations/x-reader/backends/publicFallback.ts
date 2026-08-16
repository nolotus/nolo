import {
  createXReadFailure,
  type XPost,
  type XReaderBackend,
  type XReadResult,
  type XThread,
} from "../types";

export function createPublicFallbackBackend(): XReaderBackend {
  return {
    name: "public_fallback",
    async readPost(url: string): Promise<XReadResult<XPost>> {
      return createXReadFailure({
        code: "not_connected",
        message: `No public fallback reader has been configured for ${url}.`,
        nextStep:
          "Use the fixture backend for offline tests or the local browser backend for a live spike.",
        backend: "public_fallback",
      });
    },
    async readThread(url: string): Promise<XReadResult<XThread>> {
      return createXReadFailure({
        code: "not_connected",
        message: `No public fallback thread reader has been configured for ${url}.`,
        nextStep:
          "Use the fixture backend for offline tests or the local browser backend for a live spike.",
        backend: "public_fallback",
      });
    },
  };
}
