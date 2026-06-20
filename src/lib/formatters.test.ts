import { describe, expect, it } from "vitest";

import {
  formatBeds,
  formatPercentage,
  formatRate,
  formatStar,
  formatText,
  NOT_AVAILABLE,
  parseScore,
  resolveDisplayName,
  titleCase,
} from "./formatters";

describe("parseScore", () => {
  it("parses numeric strings", () => {
    expect(parseScore("25.575578")).toBeCloseTo(25.575578);
  });

  it("returns null for empty / missing / non-numeric values", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore("   ")).toBeNull();
    expect(parseScore(null)).toBeNull();
    expect(parseScore(undefined)).toBeNull();
    expect(parseScore("N/A")).toBeNull();
  });
});

describe("formatPercentage", () => {
  it("rounds to two decimals with a percent sign", () => {
    expect(formatPercentage(25.575578)).toBe("25.58%");
    expect(formatPercentage(8.094575)).toBe("8.09%");
  });

  it("renders N/A for null", () => {
    expect(formatPercentage(null)).toBe(NOT_AVAILABLE);
  });
});

describe("formatRate", () => {
  it("rounds to two decimals", () => {
    expect(formatRate(2.752503)).toBe("2.75");
    expect(formatRate(0.910105)).toBe("0.91");
  });

  it("renders N/A for null", () => {
    expect(formatRate(null)).toBe(NOT_AVAILABLE);
  });
});

describe("formatStar / formatBeds", () => {
  it("formats whole numbers", () => {
    expect(formatStar(5)).toBe("5");
    expect(formatBeds(150)).toBe("150");
  });

  it("renders N/A for suppressed ratings", () => {
    expect(formatStar(null)).toBe(NOT_AVAILABLE);
    expect(formatBeds(null)).toBe(NOT_AVAILABLE);
  });
});

describe("formatText", () => {
  it("falls back to N/A for blank input", () => {
    expect(formatText("")).toBe(NOT_AVAILABLE);
    expect(formatText("   ")).toBe(NOT_AVAILABLE);
    expect(formatText("PCC")).toBe("PCC");
  });
});

describe("titleCase", () => {
  it("title-cases each word", () => {
    expect(titleCase("MIAMI")).toBe("Miami");
    expect(titleCase("NORTH MIAMI BEACH")).toBe("North Miami Beach");
  });
});

describe("resolveDisplayName", () => {
  it("prefers a non-empty override", () => {
    expect(resolveDisplayName("CMS NAME", "Custom Name")).toBe("Custom Name");
  });

  it("falls back to the CMS name when override is blank", () => {
    expect(resolveDisplayName("CMS NAME", "   ")).toBe("CMS NAME");
  });

  it("uses a safe placeholder when both are missing", () => {
    expect(resolveDisplayName(null, "")).toBe("Unknown Facility");
  });
});
