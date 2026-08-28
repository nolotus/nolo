import { describe, expect, it } from "bun:test";

import { stripDurableImageInlinePayload } from "./imagePayloadPersistence";

describe("stripDurableImageInlinePayload", () => {
  it("removes migrated data URLs while keeping the durable file URL", () => {
    expect(
      stripDurableImageInlinePayload({
        type: "image_url",
        image_url: {
          url: "https://nolo.chat/api/v1/db/file/content/file-user-image",
        },
        original_data_url: "data:image/png;base64,QUJD",
      }),
    ).toEqual({
      type: "image_url",
      image_url: {
        url: "https://nolo.chat/api/v1/db/file/content/file-user-image",
      },
    } as any);
  });

  it("removes google native inline bytes and transient thought signatures", () => {
    expect(
      stripDurableImageInlinePayload({
        type: "image_url",
        image_url: {
          url: "https://nolo.chat/api/v1/db/file/content/file-user-image",
        },
        google_native: {
          inlineData: {
            mimeType: "image/png",
            data: "QUJD",
          },
          thoughtSignature: "sig-demo",
        },
      } as any),
    ).toEqual({
      type: "image_url",
      image_url: {
        url: "https://nolo.chat/api/v1/db/file/content/file-user-image",
      },
    } as any);
  });
});
