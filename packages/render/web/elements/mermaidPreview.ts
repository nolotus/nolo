export type MermaidParse = (content: string) => Promise<unknown>;

const parseWithMermaid: MermaidParse = async (input) => {
  const { default: mermaid } = await import("mermaid");
  return mermaid.parse(input);
};

export async function canRenderMermaid(
  content: string,
  parseMermaid: MermaidParse = parseWithMermaid
) {
  const trimmed = content.trim();
  if (!trimmed) return false;

  try {
    await parseMermaid(trimmed);
    return true;
  } catch {
    return false;
  }
}
