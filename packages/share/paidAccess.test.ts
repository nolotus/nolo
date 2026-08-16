import { describe, expect, test } from "bun:test";

import { resolveSharePaidAccess } from "./paidAccess";

describe("share paid access helpers", () => {
  test("uses product id as the only paid access source", () => {
    const access = resolveSharePaidAccess({
      meta: { productId: " doc_share:paid-doc ", price: 88 },
    });

    expect(access).toEqual({
      mode: "product",
      productId: "doc_share:paid-doc",
    });
  });

  test("treats product-backed docs without legacy price as paid", () => {
    const access = resolveSharePaidAccess({
      meta: { productId: "doc_share:paid-doc" },
    });

    expect(access.mode).toBe("product");
    expect(access.productId).toBe("doc_share:paid-doc");
  });

  test("ignores price-only metadata because meta.price is not a product field", () => {
    const access = resolveSharePaidAccess({ meta: { price: 12 } });

    expect(access).toEqual({
      mode: "free",
      productId: null,
    });
  });

  test("treats missing, zero, negative, and invalid prices as free", () => {
    for (const price of [undefined, 0, -1, Number.NaN, "12"]) {
      const access = resolveSharePaidAccess({ meta: { price } });
      expect(access.mode).toBe("free");
    }
  });

  test("trims product ids before returning product access", () => {
    expect(resolveSharePaidAccess({ meta: { productId: " product-1 " } })).toEqual({
      mode: "product",
      productId: "product-1",
    });
    expect(resolveSharePaidAccess({ meta: { productId: " " } })).toEqual({
      mode: "free",
      productId: null,
    });
  });
});
