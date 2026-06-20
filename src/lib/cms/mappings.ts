import { careCompareUrl } from "../ccn";
import { parseScore, titleCase } from "../formatters";
import type { FacilityReport, MetricComparison } from "../types";
import type { CmsRow } from "./schemas";

export const DATASETS = {
  providerInfo: "4pq5-n9py",
  claims: "ijh5-nb2v",
  stateAverages: "xcdc-v8bm",
} as const;

// Keyed by stable CMS measure codes rather than description text, which CMS rewords between releases.
export const MEASURE_CODES = {
  shortStayHospitalization: "521",
  shortStayEdVisit: "522",
  longStayHospitalization: "551",
  longStayEdVisit: "552",
} as const;

// Wide-format columns in the State US Averages dataset (names are truncated by CMS, e.g. the _de9d suffix).
export const STATE_AVERAGE_COLUMNS = {
  shortStayHospitalization:
    "percentage_of_short_stay_residents_who_were_rehospitalized__1d02",
  shortStayEdVisit:
    "percentage_of_short_stay_residents_who_had_an_outpatient_em_d911",
  longStayHospitalization: "number_of_hospitalizations_per_1000_longstay_resident_days",
  longStayEdVisit:
    "number_of_outpatient_emergency_department_visits_per_1000_l_de9d",
} as const;

type MetricKey = keyof typeof MEASURE_CODES;

const METRIC_KEYS: MetricKey[] = [
  "shortStayHospitalization",
  "shortStayEdVisit",
  "longStayHospitalization",
  "longStayEdVisit",
];

// Title-case the city only; the street is left exactly as CMS returns it to stay data-faithful.
export function formatLocation(provider: CmsRow): string | null {
  const street = provider.provider_address?.trim();
  const city = provider.citytown?.trim();
  const state = provider.state?.trim();
  const parts: string[] = [];
  if (street) parts.push(street);
  if (city) parts.push(titleCase(city));
  if (state) parts.push(state);
  return parts.length > 0 ? parts.join(", ") : null;
}

function adjustedScoreByMeasure(claims: CmsRow[]): Record<MetricKey, number | null> {
  const result = {} as Record<MetricKey, number | null>;
  for (const key of METRIC_KEYS) {
    const code = MEASURE_CODES[key];
    const row = claims.find((r) => r.measure_code === code);
    result[key] = parseScore(row?.adjusted_score);
  }
  return result;
}

function stateValues(
  row: CmsRow | undefined,
): Record<MetricKey, number | null> {
  const result = {} as Record<MetricKey, number | null>;
  for (const key of METRIC_KEYS) {
    result[key] = parseScore(row?.[STATE_AVERAGE_COLUMNS[key]]);
  }
  return result;
}

export interface BuildReportInput {
  ccn: string;
  provider: CmsRow;
  claims: CmsRow[];
  stateRow: CmsRow | undefined;
  nationRow: CmsRow | undefined;
}

/**
 * Pure transform from raw CMS rows to the report DTO. Missing claims or average
 * rows degrade to `null`, which the formatters render as "N/A".
 */
export function buildFacilityReport(input: BuildReportInput): FacilityReport {
  const { ccn, provider, claims, stateRow, nationRow } = input;

  const facility = adjustedScoreByMeasure(claims);
  const state = stateValues(stateRow);
  const national = stateValues(nationRow);

  const metric = (key: MetricKey): MetricComparison => ({
    facility: facility[key],
    state: state[key],
    national: national[key],
  });

  return {
    ccn,
    cmsLegalName: provider.provider_name?.trim() || null,
    location: formatLocation(provider),
    state: provider.state?.trim() || null,
    certifiedBeds: parseScore(provider.number_of_certified_beds),
    ratings: {
      overall: parseScore(provider.overall_rating),
      healthInspection: parseScore(provider.health_inspection_rating),
      staffing: parseScore(provider.staffing_rating),
      qualityOfResidentCare: parseScore(provider.qm_rating),
    },
    claims: {
      shortStayHospitalization: metric("shortStayHospitalization"),
      shortStayEdVisit: metric("shortStayEdVisit"),
      longStayHospitalization: metric("longStayHospitalization"),
      longStayEdVisit: metric("longStayEdVisit"),
    },
    careCompareUrl: careCompareUrl(ccn),
    partial: {
      claims: claims.length === 0,
      stateAverages: stateRow === undefined && nationRow === undefined,
    },
  };
}
