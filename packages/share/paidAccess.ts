import { asOptionalTrimmedString } from "core/optionalString";

export type SharePaidAccess =
  | {
      mode: "free";
      productId: null;
    }
  | {
      mode: "product";
      productId: string;
    };

const getShareProductId = (share: unknown): string | null => {
  const productId = (share as any)?.meta?.productId;
  return asOptionalTrimmedString(productId) ?? null;
};

export function resolveSharePaidAccess(share: unknown): SharePaidAccess {
  const productId = getShareProductId(share);

  if (productId) {
    return {
      mode: "product",
      productId,
    };
  }

  return {
    mode: "free",
    productId: null,
  };
}
