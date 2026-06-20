import { describe, expect, it } from "vitest";

import { careCompareUrl, validateCcn } from "./ccn";

describe("validateCcn", () => {
  it("accepts a clean 6-digit CCN", () => {
    expect(validateCcn("686123")).toEqual({ valid: true, normalized: "686123" });
  });

  it("strips formatting characters", () => {
    expect(validateCcn("686-123")).toEqual({ valid: true, normalized: "686123" });
    expect(validateCcn(" 686 123 ")).toEqual({ valid: true, normalized: "686123" });
  });

  it("rejects inputs that are not exactly six digits", () => {
    expect(validateCcn("68612").valid).toBe(false);
    expect(validateCcn("0686123").valid).toBe(false);
    expect(validateCcn("abc").valid).toBe(false);
  });

  it("returns a clear error message", () => {
    expect(validateCcn("123").error).toBe("CCN must be 6 digits");
  });
});

describe("careCompareUrl", () => {
  it("builds the Medicare Care Compare URL", () => {
    expect(careCompareUrl("686123")).toBe(
      "https://www.medicare.gov/care-compare/details/nursing-home/686123",
    );
  });
});
