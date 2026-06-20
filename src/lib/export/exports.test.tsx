import { renderToBuffer } from "@react-pdf/renderer";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";

import { FacilitySnapshotDocument } from "@/components/pdf/FacilitySnapshotDocument";
import { EMPTY_MANUAL_INPUTS, type FacilityReport } from "../types";
import { buildSnapshotDoc } from "./docx";

const report: FacilityReport = {
  ccn: "686123",
  cmsLegalName: "KENDALL LAKES HEALTHCARE AND REHAB CENTER",
  location: "5280 SW 157 AVENUE, Miami, FL",
  state: "FL",
  certifiedBeds: 150,
  ratings: { overall: 5, healthInspection: 5, staffing: 2, qualityOfResidentCare: 5 },
  claims: {
    shortStayHospitalization: { facility: 25.575578, state: 26.203324, national: 23.875617 },
    shortStayEdVisit: { facility: 8.094575, state: 9.157686, national: 12.013574 },
    longStayHospitalization: { facility: 2.752503, state: 2.147753, national: 1.897659 },
    longStayEdVisit: { facility: 0.910105, state: 1.156036, national: 1.798049 },
  },
  careCompareUrl: "https://www.medicare.gov/care-compare/details/nursing-home/686123",
  partial: { claims: false, stateAverages: false },
};

const manual = { ...EMPTY_MANUAL_INPUTS, emr: "PCC", currentCensus: "112" };

describe("export templates render to bytes", () => {
  it("renders a non-empty PDF buffer", async () => {
    const buffer = await renderToBuffer(
      <FacilitySnapshotDocument report={report} manual={manual} />,
    );
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("renders a non-empty DOCX blob", async () => {
    const blob = await Packer.toBlob(buildSnapshotDoc(report, manual));
    expect(blob.size).toBeGreaterThan(1000);
  });
});
