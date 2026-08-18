import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const imageElementSource = readFileSync(
  join(import.meta.dir, "../render/web/elements/ImageElement.tsx"),
  "utf-8"
);
const topbarUserMenuSource = readFileSync(
  join(import.meta.dir, "../render/layout/TopbarUserMenu.tsx"),
  "utf-8"
);
const userProfileSource = readFileSync(
  join(import.meta.dir, "../app/settings/web/UserProfile.tsx"),
  "utf-8"
);
const spaceContentBlockSource = readFileSync(
  join(import.meta.dir, "../create/space/components/SpaceContentBlock.tsx"),
  "utf-8"
);
const spaceContentMediaSource = readFileSync(
  join(import.meta.dir, "../create/space/components/spaceContentMedia.ts"),
  "utf-8"
);
const rnMessageInputSource = readFileSync(
  join(import.meta.dir, "../chat/messages/rn/MessageInput.tsx"),
  "utf-8"
);
const omniInputSource = readFileSync(
  join(import.meta.dir, "../rn/components/home/OmniInput.tsx"),
  "utf-8"
);
const rnImageAttachmentsHelperSource = readFileSync(
  join(import.meta.dir, "../rn/utils/imageAttachments.ts"),
  "utf-8"
);

describe("database file url source contract", () => {
  it("reuses shared helpers across file-backed UI surfaces", () => {
    expect(imageElementSource).toContain("buildDatabaseFileContentUrl");
    expect(topbarUserMenuSource).toContain("resolveAvatarUrl");
    expect(userProfileSource).toContain("buildDatabaseFileContentUrl");
    expect(spaceContentBlockSource).toContain("useContentImageSrc");
    expect(spaceContentMediaSource).toContain("buildDatabaseFileContentUrl");
    expect(rnImageAttachmentsHelperSource).toContain("buildDatabaseFileContentUrl");
    expect(rnMessageInputSource).toContain("buildReadyImageParts");
    expect(omniInputSource).toContain("buildReadyImageParts");
  });

  it("avoids ad-hoc file content url string building in those surfaces", () => {
    expect(imageElementSource).not.toContain('API_ENDPOINTS.DATABASE}/file/content/${');
    expect(topbarUserMenuSource).not.toContain('API_ENDPOINTS.DATABASE}/file/content/${');
    expect(userProfileSource).not.toContain('API_ENDPOINTS.DATABASE}/file/content/${');
    expect(spaceContentBlockSource).not.toContain('API_ENDPOINTS.DATABASE}/file/content/${');
    expect(rnMessageInputSource).not.toContain('API_ENDPOINTS.DATABASE}/file/content/${');
    expect(omniInputSource).not.toContain('API_ENDPOINTS.DATABASE}/file/content/${');
  });
});
