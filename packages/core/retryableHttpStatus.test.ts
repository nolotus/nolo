import { describe, expect, it } from "bun:test";
import { isRetryableHttpStatus } from "./retryableHttpStatus";

describe("isRetryableHttpStatus pure seam", () => {
  it("rejects success and non-retryable client errors", () => {
    expect(isRetryableHttpStatus(200)).toBe(false);
    expect(isRetryableHttpStatus(201)).toBe(false);
    expect(isRetryableHttpStatus(204)).toBe(false);
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(401)).toBe(false);
    expect(isRetryableHttpStatus(403)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
    expect(isRetryableHttpStatus(422)).toBe(false);
    expect(isRetryableHttpStatus(499)).toBe(false);
  });

  it("accepts rate-limit 429", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
  });

  it("accepts all 5xx statuses", () => {
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(502)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(504)).toBe(true);
    expect(isRetryableHttpStatus(599)).toBe(true);
  });
});
