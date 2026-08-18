import { expect, test } from "bun:test";

import { isLineRangeCovered, mergeLineRanges } from "./readRangeLedger";

test("mergeLineRanges coalesces overlapping and adjacent ranges", () => {
  expect(mergeLineRanges([
    { startLine: 1, endLine: 10 },
    { startLine: 5, endLine: 20 },
    { startLine: 21, endLine: 30 },
    { startLine: 40, endLine: 50 },
  ])).toEqual([
    { startLine: 1, endLine: 30 },
    { startLine: 40, endLine: 50 },
  ]);
});

test("mergeLineRanges drops invalid ranges and does not mutate input", () => {
  const input = [
    { startLine: 10, endLine: 1 },
    { startLine: 3, endLine: 4 },
  ];
  expect(mergeLineRanges(input)).toEqual([{ startLine: 3, endLine: 4 }]);
  expect(input[0]).toEqual({ startLine: 10, endLine: 1 });
});

test("isLineRangeCovered detects subset, overlap and disjoint requests", () => {
  const covered = [{ startLine: 1, endLine: 200 }];
  expect(isLineRangeCovered({ startLine: 1, endLine: 200 }, covered)).toBe(true);
  expect(isLineRangeCovered({ startLine: 50, endLine: 120 }, covered)).toBe(true);
  // One line beyond the covered union is not covered.
  expect(isLineRangeCovered({ startLine: 200, endLine: 210 }, covered)).toBe(false);
  expect(isLineRangeCovered({ startLine: 201, endLine: 210 }, covered)).toBe(false);
});

test("isLineRangeCovered works across a fragmented union", () => {
  const covered = [
    { startLine: 1, endLine: 10 },
    { startLine: 20, endLine: 30 },
  ];
  expect(isLineRangeCovered({ startLine: 5, endLine: 10 }, covered)).toBe(true);
  // The 11-19 gap breaks coverage.
  expect(isLineRangeCovered({ startLine: 5, endLine: 20 }, covered)).toBe(false);
  // Adjacent ranges merge: 30-31 touches the 20-30 block.
  expect(isLineRangeCovered({ startLine: 20, endLine: 31 }, [...covered, { startLine: 31, endLine: 40 }])).toBe(true);
});
