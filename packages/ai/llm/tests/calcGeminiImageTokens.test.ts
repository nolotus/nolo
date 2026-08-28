// tests/calcGeminiImageTokens.test.ts

import { describe, it, expect } from "bun:test";
import { calculateGeminiImageTokens } from "../calculateGeminiImageTokens";

type TestCase = {
    width: number;
    height: number;
    expectedTokens: number;
    description: string;
};

const cases: TestCase[] = [
    {
        description: "小图 300x300（两个维度都 <= 384）=> 258 tokens",
        width: 300,
        height: 300,
        expectedTokens: 258,
    },
    {
        description: "边界 384x384 仍按小图计费 => 258 tokens",
        width: 384,
        height: 384,
        expectedTokens: 258,
    },
    {
        description: "刚超过阈值 385x384 => 使用平铺公式",
        width: 385,
        height: 384,
        // minSide=384, unit=floor(384/1.5)=256, clamp(256)=>256
        // tilesX=ceil(385/256)=2, tilesY=ceil(384/256)=2 => 4 tiles
        // tokens=4*258=1032
        expectedTokens: 1032,
    },
    {
        description: "文档示例 960x540 => 6 个图块 => 1548 tokens",
        width: 960,
        height: 540,
        // minSide=540, unit=floor(540/1.5)=360
        // tilesX=ceil(960/360)=3, tilesY=ceil(540/360)=2 => 6 tiles
        // tokens=6*258=1548
        expectedTokens: 1548,
    },
    {
        description: "正方形 1024x1024",
        width: 1024,
        height: 1024,
        // minSide=1024, unit=floor(1024/1.5)=682
        // tilesX=ceil(1024/682)=2, tilesY=2 => 4 tiles
        // tokens=4*258=1032
        expectedTokens: 1032,
    },
    {
        description: "2K 方图 2048x2048",
        width: 2048,
        height: 2048,
        // minSide=2048, rawUnit=floor(2048/1.5)=1365, clamp=>768
        // tilesX=ceil(2048/768)=3, tilesY=3 => 9 tiles
        // tokens=9*258=2322
        expectedTokens: 2322,
    },
    {
        description: "4K 方图 4096x4096",
        width: 4096,
        height: 4096,
        // minSide=4096, rawUnit≈2730, clamp=>768
        // tilesX=ceil(4096/768)=6, tilesY=6 => 36 tiles
        // tokens=36*258=9288
        expectedTokens: 9288,
    },
];

describe("calculateGeminiImageTokens", () => {
    it("正确计算各种合法尺寸的 token 数", () => {
        for (const c of cases) {
            const actual = calculateGeminiImageTokens(c.width, c.height);
            expect(actual).toBe(
                c.expectedTokens,
            );
        }
    });

    it("width 或 height 为非正数时抛出异常", () => {
        expect(() => calculateGeminiImageTokens(0, 100)).toThrow();
        expect(() => calculateGeminiImageTokens(-1, 100)).toThrow();
        expect(() => calculateGeminiImageTokens(100, 0)).toThrow();
    });

    it("width 或 height 为非有限数字时抛出异常", () => {
        expect(() => calculateGeminiImageTokens(Number.NaN, 100)).toThrow();
        expect(() => calculateGeminiImageTokens(100, Number.POSITIVE_INFINITY)).toThrow();
    });
});