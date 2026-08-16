import { describe, expect, it } from "bun:test";
import { isGatewayHttpStatus } from "./gatewayHttpStatus";

describe("isGatewayHttpStatus pure seam", () => {
  it("rejects success, client errors, and non-gateway 5xx", () => {
    expect(isGatewayHttpStatus(200)).toBe(false);
    expect(isGatewayHttpStatus(201)).toBe(false);
    expect(isGatewayHttpStatus(400)).toBe(false);
    expect(isGatewayHttpStatus(401)).toBe(false);
    expect(isGatewayHttpStatus(403)).toBe(false);
    expect(isGatewayHttpStatus(404)).toBe(false);
    expect(isGatewayHttpStatus(429)).toBe(false);
    expect(isGatewayHttpStatus(500)).toBe(false);
    expect(isGatewayHttpStatus(501)).toBe(false);
    expect(isGatewayHttpStatus(505)).toBe(false);
    expect(isGatewayHttpStatus(599)).toBe(false);
  });

  it("accepts gateway 502/503/504 only", () => {
    expect(isGatewayHttpStatus(502)).toBe(true);
    expect(isGatewayHttpStatus(503)).toBe(true);
    expect(isGatewayHttpStatus(504)).toBe(true);
  });
});
