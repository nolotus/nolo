/** 共享的 turn 内容生成器（贴近真实 transcript 的混合内容），供 scroll/markdown bench 复用。 */

export function makeTurnContent(idx: number): string {
  const kind = idx % 4;
  switch (kind) {
    case 0:
      // 短消息
      return `Short ${idx}: what is the fastest way to parse this file?`;
    case 1:
      // 中长 markdown
      return [
        `# Item ${idx}`,
        "",
        "Here is a moderately long explanation with **bold** and *italic* and `inline code`.",
        "- point one about the system design",
        "- point two about trade-offs and constraints",
        "",
        "```ts",
        `const handler = (req: Request) => {`,
        `  return new Response(await processItem(${idx}));`,
        `};`,
        "```",
        "",
        "This trailing paragraph explains the handler above in more detail.",
      ].join("\n");
    case 2:
      // 代码块密集长消息
      return [
        `function computeItem${idx}(input: string): string {`,
        "  // compute some heavy transformation",
        "  const parts = input.split(/[\\s,]+/).filter(Boolean);",
        "  return parts.map(p => p.toUpperCase()).join('|');",
        "}",
        "",
        "> blockquote note",
        "",
        "```json",
        `{ "id": ${idx}, "enabled": true, "tags": ["a","b","c"] }`,
        "```",
        "Final line with `inline code` and a trailing summary sentence.",
      ].join("\n");
    default:
      return "impossible";
  }
}
