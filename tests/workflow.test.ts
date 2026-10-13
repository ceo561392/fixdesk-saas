import { describe, it, expect } from "vitest";
import { canTransition } from "../worker/workflow";
describe("ticket lifecycle", () => {
  it("supports assigned work through completion", () => {
    for (const [from, to] of [
      ["open", "assigned"],
      ["assigned", "in_progress"],
      ["in_progress", "resolved"],
      ["resolved", "closed"],
    ])
      expect(canTransition(from, to)).toBe(true);
  });
  it("rejects skipped and final-state changes", () => {
    for (const [from, to] of [
      ["open", "closed"],
      ["closed", "open"],
      ["assigned", "resolved"],
    ])
      expect(canTransition(from, to)).toBe(false);
  });
  it("allows reopening a resolved repair", () =>
    expect(canTransition("resolved", "in_progress")).toBe(true));
});
