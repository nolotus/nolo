import { describe, expect, it } from "bun:test";
import {
  analyzeAppStyleSystem,
  buildAppReadSnapshotWarning,
  buildAppStyleSystemHint,
  classifyAppReadSnapshot,
} from "./appReadSnapshot";

describe("appReadSnapshot", () => {
  it("treats multi-file results as source files", () => {
    expect(
      classifyAppReadSnapshot({
        files: [{ name: "App.tsx", code: "export default function App() { return null; }" }],
      })
    ).toBe("source-files");
  });

  it("detects compiled deploy artifacts from bundled html shell", () => {
    const kind = classifyAppReadSnapshot({
      code: '<!DOCTYPE html><html><body><script type="importmap">{"imports":{"react":"https://esm.sh/react@19.2.1"}}</script><script type="module">import{createRoot}from"react-dom/client";</script></body></html>',
    });

    expect(kind).toBe("compiled-artifact");
    expect(buildAppReadSnapshotWarning(kind)).toContain("部署产物 / 打包 bundle");
  });

  it("treats plain worker source as editable single-file code", () => {
    const kind = classifyAppReadSnapshot({
      code: "export default { async fetch() { return new Response('ok'); } };",
    });

    expect(kind).toBe("single-file-source");
    expect(buildAppReadSnapshotWarning(kind)).toBeNull();
  });

  it("detects existing design-system files", () => {
    const analysis = analyzeAppStyleSystem({
      files: [
        { name: "tokens.ts", code: "export const tokens = { colors: {}, typography: {} };" },
        { name: "App.tsx", code: "import { tokens } from './tokens';" },
      ],
    });

    expect(analysis.status).toBe("design-system");
    expect(analysis.legacyMigrationRecommended).toBe(false);
    expect(buildAppStyleSystemHint(analysis)).toContain("已经有设计系统 / token 层");
  });

  it("detects legacy hardcoded inline styles and recommends token migration", () => {
    const analysis = analyzeAppStyleSystem({
      files: [
        {
          name: "App.tsx",
          code: `
            export default function App() {
              return <div style={{ padding: '24px', color: '#333', backgroundColor: '#fff', borderRadius: '8px' }}>
                <p style={{ fontSize: '16px', lineHeight: 1.8, margin: '0 0 32px 0' }}>hello</p>
              </div>;
            }
          `,
        },
      ],
    });

    expect(analysis.status).toBe("hardcoded-inline-styles");
    expect(analysis.legacyMigrationRecommended).toBe(true);
    expect(buildAppStyleSystemHint(analysis)).toContain("旧式硬编码样式");
  });
});
