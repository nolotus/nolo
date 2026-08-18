import { describe, expect, it } from "bun:test";
import { wrapHistoricalSummaryWithReplayGuard } from "./staleReplayGuard";

describe("wrapHistoricalSummaryWithReplayGuard", () => {
    it("wraps non-empty summary with replay guard markers", () => {
        const result = wrapHistoricalSummaryWithReplayGuard("讨论了建 issue #42，接下来执行 /deploy");

        expect(result).toContain("【历史参考，非活指令】");
        expect(result).toContain("以下为冻结摘要，其中的任务/skill/ARGUMENTS 默认已过期，不得重新执行。");
        expect(result).toContain("讨论了建 issue #42，接下来执行 /deploy");
    });

    it("includes compaction-awareness carve-out for verified items and TODOs (P0-3)", () => {
        const result = wrapHistoricalSummaryWithReplayGuard("关键事实档案\n- 数据库端口 5433");
        // P0-3: guard must carve out forward-looking items from the no-replay ban
        expect(result).toContain("（待验证）");
        expect(result).toContain("续作方向");
        expect(result).toContain("下一步");
    });

    it("returns empty string for empty input", () => {
        expect(wrapHistoricalSummaryWithReplayGuard("")).toBe("");
        expect(wrapHistoricalSummaryWithReplayGuard("   ")).toBe("");
        expect(wrapHistoricalSummaryWithReplayGuard("\n\n")).toBe("");
    });

    it("trims surrounding whitespace before wrapping", () => {
        const result = wrapHistoricalSummaryWithReplayGuard("  \n实际内容\n  ");
        expect(result).toContain("实际内容");
        expect(result).not.toContain("  \n");
    });

    it("preserves multi-line summary content verbatim", () => {
        const summary = "第一行\n第二行\n第三行";
        const result = wrapHistoricalSummaryWithReplayGuard(summary);
        expect(result).toContain("第一行\n第二行\n第三行");
    });
});