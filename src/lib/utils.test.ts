import { describe, expect, it } from "vitest";
import { friendlyError, formatTime, makeId } from "./utils";

describe("application utilities", () => {
  it("creates a non-empty identifier", () => {
    expect(makeId().length).toBeGreaterThan(0);
  });

  it("formats valid timestamps using the Libyan Arabic locale", () => {
    expect(formatTime("2026-01-01T12:30:00.000Z")).toMatch(/\d/);
  });

  it("returns safe fallback text for non-Error values", () => {
    expect(friendlyError({ reason: "unknown" })).toBe("صار خطأ غير متوقع. حاول مرة ثانية.");
  });
});
