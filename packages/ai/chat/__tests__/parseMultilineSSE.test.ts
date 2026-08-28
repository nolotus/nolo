
import { describe, it, expect } from "bun:test";
import { createSSEParser } from "../parseMultilineSSE";

describe("createSSEParser", () => {
    it("should parse standard single-line SSE", () => {
        const parser = createSSEParser();
        const chunk = 'data: {"id":"1"}\n\n';
        const result = parser(chunk);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: "1" });
    });

    it("should handle partial chunks", () => {
        const parser = createSSEParser();
        const result1 = parser('data: {"id":');
        expect(result1).toHaveLength(0);

        const result2 = parser('"1"}\n\n');
        expect(result2).toHaveLength(1);
        expect(result2[0]).toEqual({ id: "1" });
    });

    it("should handle [DONE]", () => {
        const parser = createSSEParser();
        const chunk = 'data: [DONE]\n\n';
        const result = parser(chunk);
        expect(result).toHaveLength(1);
        expect(result[0]).toBe("[DONE]");
    });

    it("should handle non-standard multi-line JSON (robustness check)", () => {
        const parser = createSSEParser();
        // Some servers might send pretty-printed JSON with data: prefix only on first line
        const chunk = 'data: {\n  "foo": "bar"\n}\n\n';
        const result = parser(chunk);
        // Current parser fails this.
        // We want it to succeed.
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ foo: "bar" });
    });
});
