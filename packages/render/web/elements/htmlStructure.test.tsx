import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BaseTable, BaseTableCell, BaseTableRow } from "./BaseTable";
import { TextBlockRenderer } from "./TextBlockRenderer";

describe("render html structure", () => {
  it("renders paragraph blocks with image children as div containers", () => {
    const html = renderToStaticMarkup(
      <TextBlockRenderer
        attributes={{}}
        element={{
          type: "paragraph",
          children: [
            { text: "Here is an image: " },
            { type: "image" },
          ],
        }}
      >
        <div>image block</div>
      </TextBlockRenderer>
    );

    expect(html).toMatch(/^<div class="text-block text-paragraph">/);
    expect(html).not.toContain("<p");
  });

  it("wraps bare table rows in tbody", () => {
    const html = renderToStaticMarkup(
      <BaseTable>
        <BaseTableRow>
          <BaseTableCell>value</BaseTableCell>
        </BaseTableRow>
      </BaseTable>
    );

    expect(html).toContain("<table");
    expect(html).toContain("<tbody><tr");
  });

  it("preserves explicit table sections when provided", () => {
    const html = renderToStaticMarkup(
      <BaseTable>
        <thead>
          <BaseTableRow>
            <BaseTableCell header>header</BaseTableCell>
          </BaseTableRow>
        </thead>
        <tbody>
          <BaseTableRow>
            <BaseTableCell>value</BaseTableCell>
          </BaseTableRow>
        </tbody>
      </BaseTable>
    );

    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).not.toContain("<tbody><thead>");
  });
});
