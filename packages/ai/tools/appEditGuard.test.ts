import { describe, expect, it } from "bun:test";
import {
  evaluateSmallVisualEditGuard,
  isSmallVisualEditRequest,
} from "./appEditGuard";

describe("appEditGuard", () => {
  it("detects small visual edit requests", () => {
    expect(isSmallVisualEditRequest("把按钮字体大一点，别改别的")).toBe(true);
    expect(isSmallVisualEditRequest("重做整个首页视觉和布局")).toBe(false);
  });

  it("allows minimal token migration for small visual edits", () => {
    const result = evaluateSmallVisualEditGuard({
      userInput: "把正文和按钮字体调大一点",
      previousSource: {
        files: [
          {
            name: "App.tsx",
            code: `export default function App(){return <div><p style={{fontSize:'16px'}}>hi</p><button style={{fontSize:'14px'}}>go</button></div>;}`,
          },
        ],
      },
      nextSource: {
        files: [
          {
            name: "tokens.ts",
            code: `export const tokens={fontSize:{body:'18px',button:'16px'}};`,
          },
          {
            name: "App.tsx",
            code: `import { tokens } from './tokens'; export default function App(){return <div><p style={{fontSize:tokens.fontSize.body}}>hi</p><button style={{fontSize:tokens.fontSize.button}}>go</button></div>;}`,
          },
        ],
      },
    });

    expect(result).toEqual({ ok: true, reason: "not-applicable" });
  });

  it("blocks broad rewrites for small visual edits", () => {
    const result = evaluateSmallVisualEditGuard({
      userInput: "把按钮字体大一点",
      previousSource: {
        files: [
          {
            name: "App.tsx",
            code: `export default function App(){return <main><h1>Title</h1><button style={{fontSize:'14px'}}>go</button></main>;}`,
          },
        ],
      },
      nextSource: {
        files: [
          {
            name: "App.tsx",
            code: `import { useEffect, useState } from 'react'; export default function App(){const [open,setOpen]=useState(false);useEffect(()=>{fetch('/api/data')},[]);return <section><header><h1>Title</h1></header><div><button onClick={()=>setOpen(!open)} style={{fontSize:'18px'}}>go</button><aside>{open?'open':'closed'}</aside></div></section>;}`,
          },
          {
            name: "Dashboard.tsx",
            code: "export default function Dashboard(){ return <div>new</div>; }",
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected violation");
    expect(result.rawData.code).toBe("SMALL_VISUAL_SCOPE_EXCEEDED");
    expect(result.rawData.issueCodes).toEqual(
      expect.arrayContaining(["added-non-token-files", "logic-change"])
    );
    expect(result.rawData.repairPlan.revertFiles).toContain("Dashboard.tsx");
    expect(result.rawData.repairPlan.keepFiles).toContain("App.tsx");
    expect(result.rawData.repairPlan.targetStyleFields).toContain("fontSize");
  });

  it("blocks changes to non-target elements when the user names specific elements", () => {
    const result = evaluateSmallVisualEditGuard({
      userInput: "只把按钮和正文的字体调大一点，别动别的",
      previousSource: {
        files: [
          {
            name: "App.tsx",
            code: `export default function App(){return <section style={{borderRadius:'16px',boxShadow:'0 8px 30px rgba(0,0,0,0.08)'}}><h1 style={{fontSize:'28px'}}>Title</h1><p style={{fontSize:'16px'}}>Body</p><button style={{fontSize:'14px'}}>Go</button></section>;}`,
          },
        ],
      },
      nextSource: {
        files: [
          {
            name: "App.tsx",
            code: `export default function App(){return <section style={{borderRadius:'20px',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}><h1 style={{fontSize:'32px'}}>Title</h1><p style={{fontSize:'18px'}}>Body</p><button style={{fontSize:'16px'}}>Go</button></section>;}`,
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected violation");
    expect(result.rawData.issueCodes).toContain("non-target-element-change");
    expect(result.rawData.repairPlan.targetElements).toEqual(
      expect.arrayContaining(["button", "p"])
    );
  });
});
