import * as stylex from "@stylexjs/stylex";

// Reuse .code-content for monospace and horizontal scrolling.
// Inherit thinking text size and keep spacing understated.
export const streamingStructuredMarkdownStyles = stylex.create({
  plainCode: {
    fontSize: "inherit",
    margin: 0,
    padding: 8,
    whiteSpace: "pre",
    userSelect: "text",
  },
});
