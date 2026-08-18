#!/usr/bin/env bun

import { resolve } from "node:path";

const runnerPath = resolve(import.meta.dir, "verifyMachineAgentWebE2E.cjs");
const proc = Bun.spawn(["node", runnerPath, ...Bun.argv.slice(2)], {
  cwd: resolve(import.meta.dir, "../.."),
  env: process.env,
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await proc.exited);
