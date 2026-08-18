import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "SpaceMembers.tsx"), "utf-8");
const styles = readFileSync(join(import.meta.dir, "SpaceMembers.css"), "utf-8");

describe("SpaceMembers source contract", () => {
  it("does not manually append invited members after addMember succeeds", () => {
    expect(source).not.toContain("setMembers((prev) => [...prev, newMember])");
    expect(source).toContain("await dispatch(");
    expect(source).toContain("addMember({");
  });

  it("uses a flat divider list instead of nested rounded member cards", () => {
    expect(source).toContain('className="space-members__members-list"');
    expect(source).not.toContain("space-members__members-shell");
    expect(source).not.toContain("space-members__member-card");
    expect(styles).toContain("border-top: 1px solid var(--borderLight)");
    expect(styles).toContain("border-bottom: 1px solid var(--borderLight)");
    expect(styles).not.toContain("space-members__members-shell");
    expect(styles).not.toContain("space-members__member-card");
  });
});
