export interface StarRatings {
  overall: number | null;
  healthInspection: number | null;
  staffing: number | null;
  qualityOfResidentCare: number | null;
}

export interface MetricComparison {
  facility: number | null;
  national: number | null;
  state: number | null;
}

export interface ClaimsMetrics {
  shortStayHospitalization: MetricComparison;
  shortStayEdVisit: MetricComparison;
  longStayHospitalization: MetricComparison;
  longStayEdVisit: MetricComparison;
}

export interface FacilityReport {
  ccn: string;
  cmsLegalName: string | null;
  location: string | null;
  state: string | null;
  certifiedBeds: number | null;
  ratings: StarRatings;
  claims: ClaimsMetrics;
  careCompareUrl: string;
  /** Tracks which secondary datasets failed so the UI can surface N/A rows. */
  partial: { claims: boolean; stateAverages: boolean };
}

export interface ManualInputs {
  nameOverride: string;
  emr: string;
  currentCensus: string;
  typeOfPatient: string;
  previousCoverage: string;
  previousPerformance: string;
  medicalCoverage: string;
}

export const EMPTY_MANUAL_INPUTS: ManualInputs = {
  nameOverride: "",
  emr: "",
  currentCensus: "",
  typeOfPatient: "",
  previousCoverage: "",
  previousPerformance: "",
  medicalCoverage: "",
};
