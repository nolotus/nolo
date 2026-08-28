import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const versionHistorySource = readFileSync(
  join(import.meta.dir, "../../create/version/VersionHistoryPanel.tsx"),
  "utf-8"
);
const voiceInputSource = readFileSync(
  join(import.meta.dir, "../../chat/web/VoiceInputButton.tsx"),
  "utf-8"
);
const topBarStateSource = readFileSync(
  join(import.meta.dir, "../../render/layout/useTopBarState.tsx"),
  "utf-8"
);
const spaceEventsSource = readFileSync(
  join(import.meta.dir, "../../create/space/hooks/useSpaceEvents.ts"),
  "utf-8"
);
const imageElementSource = readFileSync(
  join(import.meta.dir, "../../render/web/elements/ImageElement.tsx"),
  "utf-8"
);
const messageItemSource = readFileSync(
  join(import.meta.dir, "../../chat/messages/web/MessageItem.tsx"),
  "utf-8"
);
const markdownSource = readFileSync(
  join(import.meta.dir, "../../render/web/ui/ReadOnlyMarkdownContent.tsx"),
  "utf-8"
);
const topbarUserMenuSource = readFileSync(
  join(import.meta.dir, "../../render/layout/TopbarUserMenu.tsx"),
  "utf-8"
);
const spaceContentPageSource = readFileSync(
  join(import.meta.dir, "../../create/space/pages/SpaceContent.tsx"),
  "utf-8"
);
const spaceContentListSource = readFileSync(
  join(import.meta.dir, "../../create/space/components/SpaceContentList.tsx"),
  "utf-8"
);
const spaceContentBlockSource = readFileSync(
  join(import.meta.dir, "../../create/space/components/SpaceContentBlock.tsx"),
  "utf-8"
);

describe("runtime snapshot consumer source contract", () => {
  it("routes auxiliary content flows through the runtime snapshot", () => {
    expect(versionHistorySource).toContain(
      'import { selectRuntimeSnapshot } from "app/stateViews/runtime"'
    );
    expect(voiceInputSource).toContain(
      'import { selectRuntimeSnapshot } from "app/stateViews/runtime"'
    );
    expect(topBarStateSource).toContain(
      'import { selectRuntimeSnapshot } from "app/stateViews/runtime"'
    );
    expect(spaceEventsSource).toContain(
      'import { selectRuntimeSnapshot } from "app/stateViews/runtime"'
    );
    expect(imageElementSource).toContain(
      'import { selectRuntimeCurrentServer } from "app/stateViews/runtime"'
    );
    expect(messageItemSource).toContain(
      'import { selectRuntimeCurrentServer } from "app/stateViews/runtime"'
    );
    expect(markdownSource).toContain(
      'import { selectRuntimeCurrentServer } from "app/stateViews/runtime"'
    );
    expect(topbarUserMenuSource).toContain(
      'import { selectRuntimeCurrentServer } from "app/stateViews/runtime"'
    );
    expect(spaceContentBlockSource).toContain(
      'import { useContentImageSrc } from "./useContentImageSrc"'
    );
  });

  it("does not keep raw current server or token selectors in those paths", () => {
    expect(versionHistorySource).not.toContain("selectCurrentServer");
    expect(versionHistorySource).not.toContain("selectCurrentToken");
    expect(voiceInputSource).not.toContain("selectCurrentServer");
    expect(voiceInputSource).not.toContain("selectCurrentToken");
    expect(topBarStateSource).not.toContain("selectCurrentServer");
    expect(topBarStateSource).not.toContain("selectCurrentToken");
    expect(spaceEventsSource).not.toContain("selectCurrentServer");
    expect(spaceEventsSource).not.toContain("selectCurrentToken");
    expect(imageElementSource).not.toContain("selectCurrentServer");
    expect(messageItemSource).not.toContain("selectCurrentServer");
    expect(markdownSource).not.toContain("selectCurrentServer");
    expect(topbarUserMenuSource).not.toContain("selectCurrentServer");
    expect(spaceContentPageSource).not.toContain("selectCurrentServer");
    expect(spaceContentBlockSource).not.toContain("selectCurrentServer");
    expect(spaceContentListSource).not.toContain("currentServer:");
  });
});
