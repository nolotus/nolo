import { afterEach, describe, expect, test } from "bun:test";
import { createClientLogger } from "./clientLogger";

const originalWrite = process.stderr.write;

afterEach(() => {
  process.stderr.write = originalWrite;
  delete process.env.NOLO_LOG_LEVEL;
});

describe("client logger", () => {
  test("writes structured logs to stderr without requiring pino", () => {
    let output = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    createClientLogger("test").error(
      { error: new Error("boom"), requestId: "req-1" },
      "request failed"
    );

    const record = JSON.parse(output);
    expect(record).toMatchObject({
      level: "error",
      name: "test",
      requestId: "req-1",
      msg: "request failed",
      error: { name: "Error", message: "boom" },
    });
  });

  test("supports child fields and suppresses debug at the default level", () => {
    let output = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    const logger = createClientLogger("test", { service: "cli" });
    logger.debug("hidden");
    logger.child({ requestId: "req-2" }).info("visible");

    expect(output).not.toContain("hidden");
    expect(JSON.parse(output)).toMatchObject({
      level: "info",
      service: "cli",
      requestId: "req-2",
      msg: "visible",
    });
  });

  test("serializes circular fields without throwing", () => {
    let output = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    const fields: Record<string, unknown> = {};
    fields.self = fields;
    createClientLogger("test").error(fields, "circular");

    expect(JSON.parse(output)).toMatchObject({
      self: { self: "[Circular]" },
      msg: "circular",
    });
  });

  test("serializes shared non-circular fields at each reference", () => {
    let output = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stderr.write;

    const shared = { requestId: "req-shared" };
    createClientLogger("test").info({ first: shared, second: shared }, "shared");

    expect(JSON.parse(output)).toMatchObject({
      first: { requestId: "req-shared" },
      second: { requestId: "req-shared" },
      msg: "shared",
    });
  });

  test("honors NOLO_LOG_LEVEL when debug logging is explicitly enabled", () => {
    let output = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    process.env.NOLO_LOG_LEVEL = "debug";

    createClientLogger("test").debug("visible");

    expect(JSON.parse(output)).toMatchObject({
      level: "debug",
      msg: "visible",
    });
  });
});
