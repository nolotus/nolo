type GlobCompat = {
  match(path: string): boolean;
  scanSync(opts: { cwd: string; dot?: boolean; onlyFiles?: boolean }): string[];
};

export function resolveExecutableOnPath(_name: string): string | null {
  return null;
}

export function createGlob(_pattern: string): GlobCompat {
  return {
    match() {
      return false;
    },
    scanSync() {
      return [];
    },
  };
}

export type WebSpawnResult = {
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  exited: Promise<number>;
};

export function spawnToWebStreams(_options: {
  cmd: string[];
  env?: Record<string, string | undefined>;
}): WebSpawnResult {
  throw new Error("runtimeCompat.spawnToWebStreams is not available in browser bundles");
}