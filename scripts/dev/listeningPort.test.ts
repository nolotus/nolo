import { describe, expect, test } from "bun:test";
import { parseListeningPortOutput, parseWindowsNetstatOutput } from "./listeningPort";

describe("parseListeningPortOutput", () => {
  test("detects a matching listening TCP port", () => {
    const output = [
      "COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME",
      "bun 123 user 10u IPv4 0xabc 0t0 TCP *:38323 (LISTEN)",
    ].join("\n");

    expect(parseListeningPortOutput(output, 38323)).toBe(true);
  });

  test("ignores other ports and non-listening sockets", () => {
    const output = [
      "bun 123 user 10u IPv4 0xabc 0t0 TCP *:38324 (LISTEN)",
      "bun 123 user 11u IPv4 0xdef 0t0 TCP 127.0.0.1:38323->127.0.0.1:50000 (ESTABLISHED)",
    ].join("\n");

    expect(parseListeningPortOutput(output, 38323)).toBe(false);
  });
});

describe("parseWindowsNetstatOutput", () => {
  test("detects a matching listening TCP port for a pid", () => {
    const output = [
      "  Proto  Local Address          Foreign Address        State           PID",
      "  TCP    127.0.0.1:38277        0.0.0.0:0              LISTENING       84268",
    ].join("\n");

    expect(parseWindowsNetstatOutput(output, 84268, 38277)).toBe(true);
  });

  test("ignores different pids, ports, and non-listening sockets", () => {
    const output = [
      "  TCP    127.0.0.1:38277        0.0.0.0:0              LISTENING       11111",
      "  TCP    127.0.0.1:38278        0.0.0.0:0              LISTENING       84268",
      "  TCP    127.0.0.1:38277        127.0.0.1:50000        ESTABLISHED     84268",
    ].join("\n");

    expect(parseWindowsNetstatOutput(output, 84268, 38277)).toBe(false);
  });
});
