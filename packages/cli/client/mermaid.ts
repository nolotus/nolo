import {
  themeColorSequence,
  resolveTuiBrightness,
  type TuiBrightness,
} from "../tui/theme";

const STYLE = {
  reset: "\x1b[0m",
};

/**
 * Minimal terminal Mermaid renderer (scope A).
 *
 * Turns a ```mermaid ``` flowchart block into a compact box-drawing diagram
 * instead of dumping raw source as a plain code block. Only the flowchart
 * subset is handled:
 *
 *   - node decls: `id`, `id["label"]`, `id[label]`, `id{label}`,
 *     `id([label])`, `id[(label)]`, `id((label))`
 *   - edges: `A-->B`, `A --> B`, `A-->|label|B`, `A-- label -->B`,
 *     `A-.->B`, `A==>B`, long arrows `A---->B`, chains `A-->B-->C`,
 *     semicolon-separated statements `A-->B; B-->C;`
 *   - pragmas: `%%` comments and `graph TD` / `flowchart LR` headers ignored
 *
 * Anything that doesn't parse cleanly is emitted via a safe fallback that
 * keeps the raw lines (user content is never dropped).
 *
 * Layout model: every box shares one global width and one horizontal gap, so
 * the k-th box of any layer sits in the same column. Layers (longest-path
 * distance from a root) render as horizontal rows, and consecutive layers are
 * joined by vertical arrow stems. Straight chains line up cleanly;
 * cross-column or cyclic edges are left as highlighted fallback lines appended
 * after the diagram — a deliberate terminal-first trade-off (no edge router).
 */

export type MermaidNodeShape =
  | "rect"
  | "diamond"
  | "rounded"
  | "stadium"
  | "parallelogram";

export interface MermaidNode {
  id: string;
  label: string;
  shape: MermaidNodeShape;
}

export interface MermaidEdge {
  from: string;
  to: string;
  label?: string;
}

export interface MermaidFlow {
  nodes: Map<string, MermaidNode>;
  edges: MermaidEdge[];
  /** Lines that were not parsed (kept so no user content is dropped). */
  skipped: string[];
}

/** Mask bracket/quote/pipe spans so `--`, `;`, `-`, `>` inside a node label can
 *  never be mistaken for edge arrows or statement separators. Replaces
 *  `["a;b--c"]`, `{x}`, `([y])`, `|label|` with `\x00M<n>\x00` placeholders;
 *  `unmask` restores them. Same masking technique used in assistantOutput. */
function maskLabelSpans(line: string, restores: string[] = []): { text: string; restores: string[] } {
  const text = line.replace(
    /("[^"\n]*"|\[[^\]\n]*\]|\{[^}\n]*\}|\([^()\n]*\)|\|[^|\n]*\|)/g,
    (m) => {
      const idx = restores.push(m) - 1;
      return `\x00M${idx}\x00`;
    }
  );
  return { text, restores };
}

function unmask(masked: string, restores: string[]): string {
  return masked.replace(/\x00M(\d+)\x00/g, (_, i) => restores[+i] ?? "");
}

/** Decode the shape group after a node id; returns shape + label. */
function decodeShape(rest: string): { shape: MermaidNodeShape; label: string } | null {
  let lm: RegExpMatchArray | null;
  if ((lm = rest.match(/^\[\s*"([^"]*)"\s*\]/))) return { shape: "rect", label: lm[1] };
  if ((lm = rest.match(/^\(\s*\(\s*"?([^"()]*)"?\s*\)\s*\)/))) return { shape: "stadium", label: lm[1] };
  if ((lm = rest.match(/^\(\s*\[\s*"?([^"()]*)"?\s*\]\s*\)/))) return { shape: "stadium", label: lm[1] };
  if ((lm = rest.match(/^\[\s*([^\[\]]+)\s*\]/))) return { shape: "rect", label: lm[1] };
  if ((lm = rest.match(/^\{\s*([^}]*)\s*\}/))) return { shape: "diamond", label: lm[1] };
  if ((lm = rest.match(/^\(\s*"?([^[\]()]*)"?\s*\)/))) return { shape: "rounded", label: lm[1] };
  return null;
}

/** Parse a single node segment (`id[shape]` or bare `id`) into a node. */
function parseNodeSeg(seg: string): { id: string; shape: MermaidNodeShape; label: string } | null {
  const t = seg.trim();
  if (!t) return null;
  const m = t.match(/^([A-Za-z_][A-Za-z0-9_-]*)(.*)$/s);
  if (!m) return null;
  const id = m[1];
  const rest = m[2].trim();
  // Trailing text that is not a decodable shape means this is not a plain node
  // (e.g. `->>`, a `classDef` directive, or `: ` sequence text). Return null so
  // the line lands in `skipped` instead of mis-parsing into a bogus node.
  if (rest && decodeShape(rest) === null) return null;
  const dec = decodeShape(rest);
  return { id, shape: dec ? dec.shape : "rect", label: (dec ? dec.label : id).trim() || id };
}

function stripComment(line: string): string {
  const idx = line.indexOf("%%");
  // Also drop trailing punctuation (`,` / `;`) so `A-->B; B-->C;` parses.
  return (idx >= 0 ? line.slice(0, idx) : line).trim().replace(/[,;]\s*$/, "");
}

const DIAGRAM_HEADERS =
  /^\s*(graph|flowchart|subgraph|end)\b|^\s*(sequenceDiagram|sequence|gantt|classDiagram|stateDiagram|erDiagram|requirementDiagram|pie|journey|mindmap|sankey|timeline)\b/;

export function parseMermaid(source: string): MermaidFlow {
  const nodes = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];
  const skipped: string[] = [];

  /** Parse a single already-normalized arrow statement (`A --> B`, chains).
   *  Returns false if any hop fails (caller drops the whole line to skipped). */
  const parseStatement = (maskedStmt: string, restores: string[]): boolean => {
    const parts = maskedStmt.split(/-->/);
    if (parts.length < 2) {
      // Plain declaration.
      const parsed = parseNodeSeg(unmask(parts[0], restores).trim());
      if (parsed) {
        nodes.set(parsed.id, { id: parsed.id, label: parsed.label, shape: parsed.shape });
        return true;
      }
      return false;
    }
    // Transactional: commit only if every hop parses.
    const lineNodes = new Map<string, MermaidNode>();
    const lineEdges: MermaidEdge[] = [];
    let ok = true;
    let fromPrev: string | null = null;
    for (let i = 0; i < parts.length; i++) {
      let seg = parts[i];
      let label: string | undefined;
      if (i > 0) {
        const restored = unmask(seg, restores);
        const pm = restored.match(/^\|\s*([^|]*)\s*\|([\s\S]*)$/);
        if (pm) { label = pm[1].trim() || undefined; seg = pm[2]; }
      }
      const nodeText = unmask(seg, restores).trim();
      const parsed = parseNodeSeg(nodeText);
      if (!parsed) { ok = false; break; }
      const prev = lineNodes.get(parsed.id);
      lineNodes.set(parsed.id, {
        id: parsed.id,
        label: parsed.label !== parsed.id && parsed.label ? parsed.label : prev?.label ?? parsed.label,
        shape: parsed.shape !== "rect" ? parsed.shape : prev?.shape ?? parsed.shape,
      });
      if (i > 0 && fromPrev !== null) lineEdges.push({ from: fromPrev, to: parsed.id, label });
      fromPrev = parsed.id;
    }
    if (!ok) return false;
    for (const [id, n] of lineNodes) {
      const cur = nodes.get(id);
      if (cur) {
        if (n.label !== id) cur.label = n.label;
        if (n.shape !== "rect") cur.shape = n.shape;
      } else nodes.set(id, n);
    }
    for (const e of lineEdges) edges.push(e);
    return true;
  };

  for (const raw of source.split("\n")) {
    const line = stripComment(raw);
    if (!line) continue;
    if (DIAGRAM_HEADERS.test(line)) continue;

    // 1) Mask node labels/pipe spans so `;`/`--`/`-` inside them are never read
    //    as separators or edge arrows (`A["a;b"] --> B` stays intact).
    const restores: string[] = [];
    const { text: masked1 } = maskLabelSpans(line, restores);
    // 2) Normalize arrow variants on the masked line: long `A---->B`, dotted
    //    `A-.->B`, thick `A==>B` → `-->`; text edges `A-- yes -->B` → `-->|yes|B`.
    let norm = masked1.replace(/-{2,}>/g, "-->");
    norm = norm.replace(/\.?-[.]?->/g, "-->");
    norm = norm.replace(/={2,}>/g, "-->");
    norm = norm.replace(/--\s*([^>]+?)\s*-->/g, "-->|$1|");
    // 3) Re-mask the pipe labels produced above so `;` inside a text-edge label
    //    (`A -- a;b --> B`) is protected before splitting statements.
    const { text: masked } = maskLabelSpans(norm, restores);
    // 4) Split into semicolon-separated statements (`A-->B; B-->C;`).
    const stmts = masked.split(";").map((s) => s.trim()).filter(Boolean);
    // All-or-nothing for the whole line: if any statement fails, drop the line
    // whole into `skipped` so no partial nodes leak.
    const results = stmts.map((s) => parseStatement(s, restores));
    if (results.some((r) => !r)) {
      skipped.push(raw.trim());
    }
  }
  return { nodes, edges, skipped };
}

/** Layer per node = longest-path distance from any root (indegree 0). Nodes
 *  unreachable (all nodes have an incoming edge, e.g. a cycle) default to the
 *  shallowest available layer so the whole graph still renders. */
function assignLayers(flow: MermaidFlow): Map<string, number> {
  const layer = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of flow.nodes.keys()) {
    adj.set(id, []);
    indeg.set(id, 0);
  }
  for (const e of flow.edges) {
    adj.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, d] of indeg) {
    if (d === 0) {
      layer.set(id, 0);
      queue.push(id);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const l = layer.get(cur) ?? 0;
    for (const next of adj.get(cur) ?? []) {
      if ((layer.get(next) ?? 0) < l + 1) {
        layer.set(next, l + 1);
        queue.push(next);
      }
    }
  }
  if (queue.length === 0) {
    for (const id of flow.nodes.keys()) if (!layer.has(id)) layer.set(id, 0);
  }
  return layer;
}

/** Word-wrap a label into lines that fit `width` (soft, char-width approx). */
function wrapLabel(label: string, width: number): string[] {
  const clean = label.replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  if (clean.length <= width) return [clean];
  const words = clean.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function boxCorners(shape: MermaidNodeShape): { l: string; r: string } {
  switch (shape) {
    case "diamond":
      return { l: "<", r: ">" };
    case "rounded":
    case "stadium":
      return { l: "(", r: ")" };
    case "parallelogram":
      return { l: "/", r: "\\" };
    default:
      return { l: "[", r: "]" };
  }
}

/** Draw a single node box as rows of equal length (width + 2 for corners). */
function drawBox(
  node: MermaidNode,
  width: number,
  accent: (s: string) => string
): string[] {
  const inner = wrapLabel(node.label, Math.max(1, width - 2));
  const { l, r } = boxCorners(node.shape);
  const rows: string[] = [];
  rows.push(accent(l + "─".repeat(width) + r));
  for (const text of inner) {
    const pad = " ".repeat(Math.max(0, width - 2 - text.length));
    rows.push(accent(l + " " + text + pad + " " + r));
  }
  rows.push(accent(l + "─".repeat(width) + r));
  return rows;
}

/**
 * Render a parsed flow into an ANSI-colored terminal diagram.
 * Returns a string without a trailing newline. `colorEnabled=false` strips
 * ANSI (used for tests).
 */
export function renderMermaid(
  flow: MermaidFlow,
  brightness: TuiBrightness,
  colorEnabled = true
): string {
  const accentTok = themeColorSequence("accent", process.env, brightness);
  const warningTok = themeColorSequence("warning", process.env, brightness);
  const mutedTok = themeColorSequence("muted", process.env, brightness);
  const wrap = (s: string, tok: string) =>
    colorEnabled ? `${tok}${s}${STYLE.reset}` : s;
  const cAccent = (s: string) => wrap(s, accentTok);
  const cWarn = (s: string) => wrap(s, warningTok);
  const cMuted = (s: string) => wrap(s, mutedTok);

  if (flow.nodes.size === 0) {
    const sk = flow.skipped.join("\n");
    return cMuted("(empty mermaid diagram)") + (sk ? "\n" + cMuted(sk) : "");
  }

  const layers = assignLayers(flow);
  const maxLayer = Math.max(...Array.from(layers.values(), (v) => v));
  const byLayer: string[][] = [];
  for (let l = 0; l <= maxLayer; l++) byLayer.push([]);
  for (const [id] of flow.nodes) byLayer[layers.get(id) ?? 0].push(id);

  const width = Math.max(
    8,
    ...Array.from(flow.nodes.values(), (n) => n.label.length + 2)
  );
  const GAP = 3;

  const edgeLabel = new Map<string, string>();
  for (const e of flow.edges) {
    if (e.label && !edgeLabel.has(`${e.from}:${e.to}`)) {
      edgeLabel.set(`${e.from}:${e.to}`, e.label);
    }
  }

  const out: string[] = [];
  for (let l = 0; l <= maxLayer; l++) {
    const layerIds = byLayer[l] ?? [];
    if (layerIds.length === 0) continue;

    const boxes = layerIds.map((id) => drawBox(flow.nodes.get(id)!, width, cAccent));
    const boxHeight = Math.max(...boxes.map((b) => b.length));
    const colStart = (bi: number) => bi * (width + GAP);

    for (let r = 0; r < boxHeight; r++) {
      let line = "";
      boxes.forEach((b, bi) => {
        const cell = b[r] ?? b[b.length - 1];
        const col = colStart(bi);
        if (line.length < col) line += " ".repeat(col - line.length);
        line += cell;
      });
      out.push(line);
    }

    // Connector to the next layer.
    if (l < maxLayer) {
      const down: boolean[] = layerIds.map((id) =>
        flow.edges.some(
          (e) => e.from === id && (layers.get(e.to) ?? -1) === l + 1
        )
      );
      if (down.some(Boolean)) {
        let stemRow = "";
        layerIds.forEach((_, bi) => {
          if (!down[bi]) return;
          const mid = colStart(bi) + Math.floor(width / 2);
          if (stemRow.length < mid) stemRow += " ".repeat(mid - stemRow.length);
          stemRow += "│";
        });
        out.push(stemRow);

        let arrowRow = "";
        layerIds.forEach((_, bi) => {
          if (!down[bi]) return;
          const mid = colStart(bi) + Math.floor(width / 2);
          if (arrowRow.length < mid) arrowRow += " ".repeat(mid - arrowRow.length);
          arrowRow += cWarn("▼");
        });
        out.push(arrowRow);

        const labels = layerIds.flatMap((id, bi) => {
          if (!down[bi]) return [];
          return flow.edges
            .filter((e) => e.from === id && (layers.get(e.to) ?? -1) === l + 1)
            .map((e) => edgeLabel.get(`${e.from}:${e.to}`))
            .filter((t): t is string => !!t);
        });
        if (labels.length > 0) {
          out.push(cMuted("  ⤷ " + labels.join(" / ")));
        }
      }
    }
  }
  if (flow.skipped.length > 0) {
    out.push(cMuted("(skipped)"));
    for (const s of flow.skipped) out.push(cMuted(s));
  }
  return out.join("\n");
}

/**
 * Convenience entry: render a raw ```mermaid ``` code-block body (the lines
 * between the fences, without the fence markers) into a terminal diagram.
 * Falls back to the raw source if nothing parses.
 */
export function renderMermaidBlock(
  source: string,
  brightness: TuiBrightness,
  colorEnabled = true
): string {
  const flow = parseMermaid(source);
  if (flow.nodes.size === 0) {
    // Nothing parseable (empty, or non-flowchart like sequenceDiagram/gantt):
    // let callers keep the raw block so no user content is lost.
    return source;
  }
  return renderMermaid(flow, brightness, colorEnabled);
}
