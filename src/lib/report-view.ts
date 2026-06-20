import {
  formatBeds,
  formatPercentage,
  formatRate,
  formatStar,
  manualValue,
  resolveDisplayName,
} from "./formatters";
import type { FacilityReport, ManualInputs, MetricComparison } from "./types";

export interface LabeledRow {
  label: string;
  value: string;
}

// The 13 overview rows in the exact order and labelling of the reference snapshot.
export function buildBodyRows(
  report: FacilityReport,
  manual: ManualInputs,
): LabeledRow[] {
  return [
    { label: "Name of Facility", value: resolveDisplayName(report.cmsLegalName, manual.nameOverride) },
    { label: "Location", value: report.location ?? "N/A" },
    { label: "EMR", value: manualValue(manual, "emr") },
    { label: "Census Capacity", value: formatBeds(report.certifiedBeds) },
    { label: "Current Census", value: manualValue(manual, "currentCensus") },
    { label: "Type of Patient", value: manualValue(manual, "typeOfPatient") },
    { label: "Previous Coverage from Medelite", value: manualValue(manual, "previousCoverage") },
    { label: "Previous Provider Performance from Medelite", value: manualValue(manual, "previousPerformance") },
    { label: "Medical Coverage", value: manualValue(manual, "medicalCoverage") },
    { label: "Overall Star Rating", value: formatStar(report.ratings.overall) },
    { label: "Health Inspection", value: formatStar(report.ratings.healthInspection) },
    { label: "Staffing", value: formatStar(report.ratings.staffing) },
    { label: "Quality of Resident Care", value: formatStar(report.ratings.qualityOfResidentCare) },
  ];
}

// The 12 hospitalization/ED lines; label order (facility, national, state) follows the reference snapshot.
export function buildClaimsRows(report: FacilityReport): LabeledRow[] {
  const pct = (m: MetricComparison) => ({
    facility: formatPercentage(m.facility),
    national: formatPercentage(m.national),
    state: formatPercentage(m.state),
  });
  const rate = (m: MetricComparison) => ({
    facility: formatRate(m.facility),
    national: formatRate(m.national),
    state: formatRate(m.state),
  });

  const strHosp = pct(report.claims.shortStayHospitalization);
  const strEd = pct(report.claims.shortStayEdVisit);
  const ltHosp = rate(report.claims.longStayHospitalization);
  const ltEd = rate(report.claims.longStayEdVisit);

  return [
    { label: "Short Term Hospitalization", value: strHosp.facility },
    { label: "STR National Avg. for Hospitalization", value: strHosp.national },
    { label: "STR State National Avg. for Hospitalization", value: strHosp.state },
    { label: "STR ED Visit", value: strEd.facility },
    { label: "STR ED Visits National Avg.", value: strEd.national },
    { label: "STR ED Visits State Avg.", value: strEd.state },
    { label: "LT Hospitalization", value: ltHosp.facility },
    { label: "LT National Avg. for Hospitalization", value: ltHosp.national },
    { label: "LT State National Avg. for Hospitalization", value: ltHosp.state },
    { label: "ED Visit", value: ltEd.facility },
    { label: "LT ED Visits National Avg.", value: ltEd.national },
    { label: "LT ED Visits State Avg.", value: ltEd.state },
  ];
}

export interface ChartDatum {
  name: string;
  Facility: number | null;
  State: number | null;
  National: number | null;
  unit: "%" | "rate";
}

/** Recharts comparison data — facility vs. state vs. national per measure. */
export function buildChartData(report: FacilityReport): ChartDatum[] {
  const { claims } = report;
  return [
    { name: "STR Hospitalization", unit: "%", Facility: claims.shortStayHospitalization.facility, State: claims.shortStayHospitalization.state, National: claims.shortStayHospitalization.national },
    { name: "STR ED Visit", unit: "%", Facility: claims.shortStayEdVisit.facility, State: claims.shortStayEdVisit.state, National: claims.shortStayEdVisit.national },
    { name: "LT Hospitalization", unit: "rate", Facility: claims.longStayHospitalization.facility, State: claims.longStayHospitalization.state, National: claims.longStayHospitalization.national },
    { name: "LT ED Visit", unit: "rate", Facility: claims.longStayEdVisit.facility, State: claims.longStayEdVisit.state, National: claims.longStayEdVisit.national },
  ];
}
