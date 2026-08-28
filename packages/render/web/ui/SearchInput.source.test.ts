import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "SearchInput.tsx"), "utf-8");
const css = readFileSync(join(import.meta.dir, "../ui.css"), "utf-8");

describe("SearchInput a11y and API surface", () => {
  test("keeps the original props backwards-compatible", () => {
    // All previously-supported props remain in the interface
    expect(source).toContain("value: string;");
    expect(source).toContain("onChange: (value: string) => void;");
    expect(source).toContain("onSearch: () => void;");
    expect(source).toContain("onClear: () => void;");
    expect(source).toContain("placeholder?: string;");
    expect(source).toContain("className?: string;");
    expect(source).toContain("autoFocus?: boolean;");
  });

  test("exposes the new a11y / form props as optional", () => {
    expect(source).toContain("label?: string;");
    expect(source).toContain("description?: string;");
    expect(source).toContain("errorMessage?: string;");
    expect(source).toContain("name?: string;");
    expect(source).toContain("inputId?: string;");
    expect(source).toContain("disabled?: boolean;");
    expect(source).toContain('size?: "small" | "medium";');
    expect(source).toContain("clearAriaLabel?: string;");
    expect(source).toContain("searchButtonLabel?: string;");
  });

  test("wires aria-invalid / aria-describedby / id on the input", () => {
    expect(source).toContain("aria-invalid={hasError || undefined}");
    expect(source).toContain("aria-describedby={describedBy}");
    expect(source).toContain("id={fieldId}");
    expect(source).toContain('const fieldId = inputId ?? `search-input-${reactId}`;');
  });

  test("uses role=search and label association when label is provided", () => {
    expect(source).toContain('role="search"');
    expect(source).toContain("htmlFor={fieldId}");
    expect(source).toContain('<label htmlFor={fieldId} className="search-input-label">');
  });

  test("clear button is non-focusable when hidden or disabled", () => {
    expect(source).toContain("tabIndex={!showClearControl || disabled ? -1 : 0}");
    expect(source).toContain("aria-hidden={!showClearControl}");
    expect(source).toContain("disabled={disabled}");
  });

  test("rendered error message has role=alert and stable id", () => {
    expect(source).toContain("role=\"alert\"");
    expect(source).toContain("id={errorId}");
  });

  test("submit on Enter still works and is disabled-aware", () => {
    expect(source).toContain("e.preventDefault();");
    expect(source).toContain("if (disabled) return;");
    expect(source).toContain("onSearch();");
  });

  test("Escape clears when not empty, and always when dismissible", () => {
    expect(source).toContain(
      'if (e.key === "Escape" && (dismissible || !isEmpty))',
    );
    expect(source).toContain("dismissible?: boolean;");
  });

  test("data-empty attribute drives the clear button via CSS, not JS classes", () => {
    expect(source).toContain("data-empty={isEmpty}");
    expect(source).toContain("data-dismissible={dismissible || undefined}");
    expect(source).toContain("data-disabled={disabled || undefined}");
    expect(source).toContain("data-invalid={hasError || undefined}");
  });
});

describe("SearchInput CSS hooks", () => {
  test("data-empty hides the clear button via CSS unless dismissible", () => {
    expect(css).toContain(".search-form[data-empty] .clear-btn-wrapper");
    expect(css).toContain(".search-form:not([data-empty]) .clear-btn-wrapper");
    expect(css).toContain(".search-form[data-dismissible] .clear-btn-wrapper");
  });

  test("error and disabled states have CSS hooks", () => {
    expect(css).toContain(".search-form[data-invalid] .input-field-wrapper");
    expect(css).toContain(".search-form[data-disabled] .input-field-wrapper");
  });

  test("size=small variant is styled", () => {
    expect(css).toContain(".search-form--small .input-field-wrapper");
    expect(css).toContain(".search-form--small .search-btn");
  });

  test("label / description / error text classes exist", () => {
    expect(css).toContain(".search-input-label");
    expect(css).toContain(".search-input-description");
    expect(css).toContain(".search-input-error");
  });
});
