import { describe, expect, it } from "bun:test";
import React from "react";
import { renderInDom } from "../../../testing/domRender";
import { useSettingsStylesheet } from "./useSettingsStylesheet";

const SETTINGS_CSS_HREF = "/public/route-styles/settings.css";

describe("useSettingsStylesheet", () => {
  it("does not inject settings.css because settings styles are bundled", async () => {
    const { document, cleanup } = await renderInDom(
      React.createElement(() => {
        useSettingsStylesheet();
        return React.createElement("div", null, "test");
      })
    );

    const link = document.head.querySelector(`link[href="${SETTINGS_CSS_HREF}"]`);
    expect(link).toBeNull();

    await cleanup();
  });

  it("keeps repeated mounts free of duplicate stylesheet links", async () => {
    const { document: doc1, cleanup: cleanup1 } = await renderInDom(
      React.createElement(() => {
        useSettingsStylesheet();
        return React.createElement("div", null, "a");
      })
    );
    expect(doc1.head.querySelectorAll(`link[href="${SETTINGS_CSS_HREF}"]`).length).toBe(0);
    await cleanup1();

    const { document: doc2, cleanup: cleanup2 } = await renderInDom(
      React.createElement(() => {
        useSettingsStylesheet();
        return React.createElement("div", null, "b");
      })
    );
    expect(doc2.head.querySelectorAll(`link[href="${SETTINGS_CSS_HREF}"]`).length).toBe(0);
    await cleanup2();
  });
});
