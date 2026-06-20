import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderToBuffer } from "@react-pdf/renderer";
import { Packer } from "docx";

import { FacilitySnapshotDocument } from "../src/components/pdf/FacilitySnapshotDocument";
import { buildFacilityReport } from "../src/lib/cms/mappings";
import { cmsQueryResponse } from "../src/lib/cms/schemas";
import { buildSnapshotDoc } from "../src/lib/export/docx";
import { EMPTY_MANUAL_INPUTS } from "../src/lib/types";

const load = (name: string) =>
  cmsQueryResponse.parse(JSON.parse(readFileSync(resolve("fixtures", name), "utf-8"))).results;

const report = buildFacilityReport({
  ccn: "686123",
  provider: load("686123-provider.json")[0],
  claims: load("686123-claims.json"),
  stateRow: load("686123-state-fl.json")[0],
  nationRow: load("686123-state-nation.json")[0],
});

const manual = {
  ...EMPTY_MANUAL_INPUTS,
  emr: "PCC",
  currentCensus: "112",
  typeOfPatient: "Long-term & Short-term",
  previousCoverage: "Yes",
  previousPerformance: "About 30 patients/day",
  medicalCoverage: "Optometry, PCP, Podiatry",
};

const out = resolve("samples");
const pdf = await renderToBuffer(FacilitySnapshotDocument({ report, manual }));
writeFileSync(resolve(out, "facility-assessment-686123.pdf"), pdf);
const docx = await Packer.toBuffer(buildSnapshotDoc(report, manual));
writeFileSync(resolve(out, "facility-assessment-686123.docx"), docx);
console.log("wrote samples:", pdf.byteLength, "pdf bytes,", docx.byteLength, "docx bytes");
