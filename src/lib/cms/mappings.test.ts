import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildBodyRows, buildChartData, buildClaimsRows } from "../report-view";
import { EMPTY_MANUAL_INPUTS } from "../types";
import { buildFacilityReport, formatLocation } from "./mappings";
import { cmsQueryResponse, type CmsRow } from "./schemas";

function loadFixture(name: string): CmsRow[] {
  const path = resolve(process.cwd(), "fixtures", name);
  const json = JSON.parse(readFileSync(path, "utf-8"));
  return cmsQueryResponse.parse(json).results;
}

const provider = loadFixture("686123-provider.json");
const claims = loadFixture("686123-claims.json");
const stateFl = loadFixture("686123-state-fl.json");
const nation = loadFixture("686123-state-nation.json");

function report() {
  return buildFacilityReport({
    ccn: "686123",
    provider: provider[0],
    claims,
    stateRow: stateFl[0],
    nationRow: nation[0],
  });
}

describe("buildFacilityReport — provider mapping", () => {
  it("maps identity, location, beds and ratings from live fixture", () => {
    const r = report();
    expect(r.cmsLegalName).toBe("KENDALL LAKES HEALTHCARE AND REHAB CENTER");
    expect(r.state).toBe("FL");
    expect(r.location).toBe("5280 SW 157 AVENUE, Miami, FL");
    expect(r.certifiedBeds).toBe(150);
    expect(r.ratings).toEqual({
      overall: 5,
      healthInspection: 5,
      staffing: 2,
      qualityOfResidentCare: 5,
    });
    expect(r.careCompareUrl).toContain("/686123");
  });
});

describe("buildFacilityReport — claims by measure code", () => {
  it("reads adjusted_score for 521/522/551/552", () => {
    const r = report();
    expect(r.claims.shortStayHospitalization.facility).toBeCloseTo(25.575578);
    expect(r.claims.shortStayEdVisit.facility).toBeCloseTo(8.094575);
    expect(r.claims.longStayHospitalization.facility).toBeCloseTo(2.752503);
    expect(r.claims.longStayEdVisit.facility).toBeCloseTo(0.910105);
  });

  it("maps the wide-format state and national averages", () => {
    const r = report();
    expect(r.claims.shortStayHospitalization.state).toBeCloseTo(26.203324);
    expect(r.claims.longStayEdVisit.state).toBeCloseTo(1.156036);
    expect(r.claims.shortStayHospitalization.national).not.toBeNull();
  });
});

describe("graceful degradation", () => {
  it("flags missing claims and renders N/A scores", () => {
    const r = buildFacilityReport({
      ccn: "686123",
      provider: provider[0],
      claims: [],
      stateRow: undefined,
      nationRow: undefined,
    });
    expect(r.partial.claims).toBe(true);
    expect(r.partial.stateAverages).toBe(true);
    expect(r.claims.shortStayHospitalization.facility).toBeNull();
  });
});

describe("report-view rows", () => {
  it("produces the 13 body rows with override applied", () => {
    const r = report();
    const rows = buildBodyRows(r, { ...EMPTY_MANUAL_INPUTS, nameOverride: "Kendall Lakes", emr: "PCC" });
    expect(rows).toHaveLength(13);
    expect(rows[0]).toEqual({ label: "Name of Facility", value: "Kendall Lakes" });
    expect(rows.find((x) => x.label === "EMR")?.value).toBe("PCC");
    expect(rows.find((x) => x.label === "Census Capacity")?.value).toBe("150");
    expect(rows.find((x) => x.label === "Overall Star Rating")?.value).toBe("5");
  });

  it("produces the 12 hospitalization rows in reference order and formatting", () => {
    const rows = buildClaimsRows(report());
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ label: "Short Term Hospitalization", value: "25.58%" });
    expect(rows[6]).toEqual({ label: "LT Hospitalization", value: "2.75" });
    expect(rows[9]).toEqual({ label: "ED Visit", value: "0.91" });
  });

  it("falls back to the CMS name when override is blank", () => {
    const rows = buildBodyRows(report(), EMPTY_MANUAL_INPUTS);
    expect(rows[0].value).toBe("KENDALL LAKES HEALTHCARE AND REHAB CENTER");
  });
});

describe("formatLocation", () => {
  it("joins street, title-cased city, and state", () => {
    expect(formatLocation(provider[0])).toBe("5280 SW 157 AVENUE, Miami, FL");
  });

  it("omits missing parts and returns null when nothing is present", () => {
    expect(formatLocation({ citytown: "MIAMI", state: "FL" })).toBe("Miami, FL");
    expect(formatLocation({ provider_address: "1 MAIN ST" })).toBe("1 MAIN ST");
    expect(formatLocation({})).toBeNull();
  });
});

describe("buildChartData", () => {
  it("returns four measures with units and facility/state/national values", () => {
    const data = buildChartData(report());
    expect(data).toHaveLength(4);
    expect(data[0]).toMatchObject({ name: "STR Hospitalization", unit: "%" });
    expect(data[2]).toMatchObject({ name: "LT Hospitalization", unit: "rate" });
    expect(data[0].Facility).toBeCloseTo(25.575578);
    expect(data[0].State).toBeCloseTo(26.203324);
  });
});
