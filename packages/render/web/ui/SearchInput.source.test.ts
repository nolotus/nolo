import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "SearchInput.tsx"), "utf-8");
const styles = readFileSync(
  join(import.meta.dir, "searchInput.styles.ts"),
  "utf-8",
);

describe("SearchInput accessibility", () => {
  test("label is wired to the field via htmlFor/fieldId", () => {
    expect(source).toContain('htmlFor={fieldId}');
    expect(source).toContain("searchInputStyles.label");
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

  test("field state is data-* attributed for tests and consumers", () => {
    expect(source).toContain('"data-empty": isEmpty');
    expect(source).toContain('"data-dismissible": dismissible || undefined');
    expect(source).toContain('"data-disabled": disabled || undefined');
    expect(source).toContain('"data-invalid": hasError || undefined');
  });
});

describe("SearchInput state styling (StyleX, props-driven)", () => {
  test("clear button visibility is driven by showClearControl", () => {
    expect(source).toContain(
      "showClearControl\n                ? searchInputStyles.clearWrapperVisible\n                : searchInputStyles.clearWrapperHidden",
    );
    expect(styles).toContain("clearWrapperVisible:");
    expect(styles).toContain("clearWrapperHidden:");
  });

  test("error and disabled states have StyleX hooks", () => {
    expect(styles).toContain("fieldWrapperInvalid:");
    expect(styles).toContain("fieldWrapperDisabled:");
    expect(source).toContain("hasError && searchInputStyles.fieldWrapperInvalid");
    expect(source).toContain("disabled && searchInputStyles.fieldWrapperDisabled");
  });

  test("size=small variant is styled", () => {
    expect(styles).toContain("fieldWrapperSmall:");
    expect(styles).toContain("searchBtnSmall:");
  });
});
