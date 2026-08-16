#!/usr/bin/env bun
/**
 * Static verification that the notification popover CSS rules have the
 * expected specificity and width values. This can be run without a dev server.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const cssPath = resolve(import.meta.dir, "../../packages/render/layout/layout.css");
const css = readFileSync(cssPath, "utf-8");

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("❌", message);
    process.exit(1);
  }
  console.log("✅", message);
}

// 1. High-specificity popup rule exists and sets min-width
assert(
  css.includes(".TopbarNotification .topbar-notification__popup"),
  "Selector .TopbarNotification .topbar-notification__popup exists"
);

const popupRule = css.match(
  /\.TopbarNotification \.topbar-notification__popup\s*\{([^}]+)\}/
);
assert(!!popupRule, "Popup rule body captured");
assert(
  popupRule![1].includes("min-width: min(360px"),
  "Popup rule sets min-width: min(360px, ...)"
);
assert(
  popupRule![1].includes("padding: 0"),
  "Popup rule sets padding: 0"
);

// 2. Mobile media query also uses the high-specificity selector
const popupMatches = [
  ...css.matchAll(/\.TopbarNotification\s+\.topbar-notification__popup\s*\{([^}]+)\}/g),
];
assert(popupMatches.length >= 2, "At least two popup rules found");

// Find the popup rule that sits inside a @media (max-width: 768px) block
let mobilePopupBody: string | null = null;
for (const match of popupMatches) {
  const idx = match.index ?? 0;
  const mediaIdx = css.lastIndexOf("@media (max-width: 768px)", idx);
  if (mediaIdx === -1) continue;

  // Simple brace-balance check: from media start to match, '{' should outnumber '}'
  let depth = 0;
  for (let i = mediaIdx; i < idx; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") depth--;
  }
  if (depth > 0) {
    mobilePopupBody = match[1];
    break;
  }
}
assert(!!mobilePopupBody, "Mobile popup rule found inside @media (max-width: 768px)");
const mobilePopupBodyText = mobilePopupBody as string;
assert(
  mobilePopupBodyText.includes("min-width: min(320px"),
  "Mobile popup rule sets min-width: min(320px, ...)"
);

// 3. Title and subtitle have overflow guards
assert(
  css.includes(".topbar-notification__title") &&
    css.includes("white-space: nowrap"),
  "Title has white-space: nowrap guard"
);
assert(
  css.includes(".topbar-notification__subtitle") &&
    css.includes("white-space: nowrap"),
  "Subtitle has white-space: nowrap guard"
);

// 4. Mark-all-read is visually secondary
const markAllRule = css.match(/\.topbar-notification__mark-all\s*\{([^}]+)\}/);
assert(!!markAllRule, "Mark-all rule captured");
assert(
  markAllRule![1].includes("margin-left: auto"),
  "Mark-all uses margin-left: auto for alignment"
);
assert(
  markAllRule![1].includes("font-size: 11px"),
  "Mark-all uses smaller 11px font size"
);

// 5. Items have word-break protection
assert(
  css.includes("overflow-wrap: break-word"),
  "Notification message has overflow-wrap: break-word"
);

// 6. Footer link keeps text and arrow vertically centered with stable spacing
const footerLinkRule = css.match(/\.topbar-notification__footer-link\s*\{([^}]+)\}/);
assert(!!footerLinkRule, "Footer-link rule captured");
assert(
  footerLinkRule![1].includes("align-items: center"),
  "Footer-link uses align-items: center"
);
assert(
  footerLinkRule![1].includes("gap: 8px"),
  "Footer-link uses gap: 8px"
);
assert(
  footerLinkRule![1].includes("justify-content: space-between") ||
    footerLinkRule![1].includes("justify-content:space-between"),
  "Footer-link uses justify-content: space-between"
);

const footerChildrenRule = css.match(
  /\.topbar-notification__footer-link\s+span,\s*\.topbar-notification__footer-link\s+svg\s*\{([^}]+)\}/
);
assert(!!footerChildrenRule, "Footer-link children rule captured");
assert(
  footerChildrenRule![1].includes("display: inline-flex"),
  "Footer-link children use display: inline-flex"
);
assert(
  footerChildrenRule![1].includes("line-height: 1"),
  "Footer-link children use line-height: 1"
);

console.log("\n🎉 All static CSS checks passed.");
