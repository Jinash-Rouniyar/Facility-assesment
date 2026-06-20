export interface CcnValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Strips non-digits and requires exactly six digits. Left-padding is avoided on
 * purpose: the CMS API returns no results for zero-padded CCNs (verified live).
 */
export function validateCcn(input: string): CcnValidationResult {
  const normalized = input.replace(/\D/g, "");
  if (normalized.length !== 6) {
    return { valid: false, normalized, error: "CCN must be 6 digits" };
  }
  return { valid: true, normalized };
}

export function careCompareUrl(ccn: string): string {
  return `https://www.medicare.gov/care-compare/details/nursing-home/${ccn}`;
}
