import { describe, expect, it } from "bun:test";
import { providerCallChargeIdempotencyKey } from "./providerCallBillingKeys";

describe("provider-call billing keys", () => {
  it("dedupes the same user's call while isolating the same call id across users", () => {
    expect(providerCallChargeIdempotencyKey("user-a", "call-1")).toBe(
      providerCallChargeIdempotencyKey("user-a", "call-1"),
    );
    expect(providerCallChargeIdempotencyKey("user-a", "call-1")).not.toBe(
      providerCallChargeIdempotencyKey("user-b", "call-1"),
    );
  });
});
