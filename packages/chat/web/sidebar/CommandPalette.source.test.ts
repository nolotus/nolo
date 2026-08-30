import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir);

const read = (name: string) => readFileSync(join(root, name), "utf8");

describe("CommandPalette source contract", () => {
  const paletteSource = read("CommandPalette.tsx");
  const sidebarPaletteSource = read("SidebarCommandPalette.tsx");
  const entriesSource = read("sidebarCommandPaletteEntries.ts");
  const styles = read("commandPaletteStyles.ts");
  const hatch = read("../chatStylexEscapeHatch.css");

  it("uses RAC Autocomplete + ModalOverlay shell with mod+k", () => {
    expect(paletteSource).toContain("ModalOverlay");
    expect(paletteSource).toContain("AriaAutocomplete");
    expect(paletteSource).toContain("useFilter");
    expect(paletteSource).toContain("SearchField");
    expect(paletteSource).toContain('COMMAND_PALETTE_SHORTCUT = "mod+k"');
    expect(paletteSource).toContain("onInputChange");
    expect(paletteSource).toContain("footer");
    expect(styles).toContain("dialog:");
    expect(hatch).toContain("chat-esc-cp-section-header");
    expect(styles).toContain("footer:");
    expect(hatch).toContain("chat-esc-cp-spinner");
  });

  it("sidebar palette aggregates favorites/spaces/content/public agents", () => {
    expect(sidebarPaletteSource).toContain("useFavoriteSidebarItems");
    expect(sidebarPaletteSource).toContain("useAllMemberSpaces");
    expect(sidebarPaletteSource).toContain("useMyContentItems");
    expect(sidebarPaletteSource).toContain("PublicAgentsWarmup");
    expect(sidebarPaletteSource).toContain("changeSpace");
    expect(sidebarPaletteSource).toContain("buildRoutableContentPath");
    expect(sidebarPaletteSource).toContain("MenuSection");
    expect(sidebarPaletteSource).toContain("initFavorites");
    expect(sidebarPaletteSource).toContain("SIDEBAR_PALETTE_IDLE_LIMITS");
    expect(sidebarPaletteSource).toContain("showPublicLoading");
    expect(sidebarPaletteSource).toContain("command_palette_loading_plaza");
    expect(sidebarPaletteSource).toContain(
      "collectExcludedContentKeys(favoriteItems)",
    );
    expect(sidebarPaletteSource).toContain("chat-esc-cp-footer-hint");
    expect(sidebarPaletteSource).toContain("command_palette_hint_navigate");
    expect(entriesSource).toContain("SIDEBAR_PALETTE_IDLE_LIMITS");
    expect(entriesSource).toContain("publicAgents: 0");
    expect(entriesSource).toContain("formatContentMeta");
  });
});
