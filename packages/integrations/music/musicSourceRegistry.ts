import type { MusicSourceAdapter, MusicSourceId, SourceCapabilities } from "./musicTypes";
import { createMusicError } from "./musicTypes";

const sources = new Map<MusicSourceId, MusicSourceAdapter>();

export interface RegisterMusicSourceOptions {
  replace?: boolean;
}

const VALID_PLAYBACK_KINDS = new Set(["direct-url", "local-file", "sdk"]);

export function registerMusicSource(
  adapter: MusicSourceAdapter,
  options?: RegisterMusicSourceOptions,
): void {
  if (!adapter || typeof adapter !== "object") {
    throw createMusicError("unsupported", "Invalid music source adapter: adapter must be an object");
  }

  if (typeof adapter.id !== "string" || !adapter.id.trim()) {
    throw createMusicError("unsupported", "Invalid music source adapter: id is required and must be non-empty");
  }

  const caps = adapter.capabilities;
  if (!caps || typeof caps !== "object") {
    throw createMusicError(
      "unsupported",
      `Invalid capabilities for source "${adapter.id}": capabilities object is required`,
    );
  }

  if (!VALID_PLAYBACK_KINDS.has(caps.playback)) {
    throw createMusicError(
      "unsupported",
      `Invalid capabilities for source "${adapter.id}": playback must be one of "direct-url", "local-file", "sdk"`,
    );
  }

  if (!Array.isArray(caps.mediaKinds) || caps.mediaKinds.length === 0) {
    throw createMusicError(
      "unsupported",
      `Invalid capabilities for source "${adapter.id}": mediaKinds must be a non-empty array`,
    );
  }

  if (typeof adapter.resolvePlayback !== "function") {
    throw createMusicError(
      "unsupported",
      `Invalid music source adapter "${adapter.id}": resolvePlayback must be a function`,
    );
  }

  if (sources.has(adapter.id) && !options?.replace) {
    throw createMusicError(
      "unsupported",
      `Music source "${adapter.id}" is already registered (use { replace: true } to override)`,
    );
  }

  sources.set(adapter.id, adapter);
}

export function getMusicSource(id: MusicSourceId): MusicSourceAdapter {
  const adapter = sources.get(id);
  if (!adapter) {
    throw createMusicError("unknown-source", `Music source "${id}" not found`);
  }
  return adapter;
}

export function listMusicSources(): MusicSourceAdapter[] {
  return Array.from(sources.values());
}

export function capabilitiesOf(id: MusicSourceId): SourceCapabilities {
  return getMusicSource(id).capabilities;
}

export function hasMusicSource(id: MusicSourceId): boolean {
  return sources.has(id);
}

/** 展示用标签（如「本地」「网易云」）；未注册或未声明时返回 undefined。 */
export function getMusicSourceLabel(id: MusicSourceId): string | undefined {
  return sources.get(id)?.label;
}

export function __resetMusicSourcesForTests(): void {
  sources.clear();
}
