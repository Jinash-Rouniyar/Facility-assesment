import type { ManualInputs } from "./types";

export const NOT_AVAILABLE = "N/A";

/**
 * Parses a CMS string value into a number. CMS returns every field as a string
 * and uses empty strings (with separate footnote codes) for suppressed values.
 */
export function parseScore(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Short-stay claims measures: two decimal places with a percent sign. */
export function formatPercentage(value: number | null): string {
  if (value === null) return NOT_AVAILABLE;
  return `${value.toFixed(2)}%`;
}

/** Long-stay claims measures: rate per 1000 resident days, two decimals. */
export function formatRate(value: number | null): string {
  if (value === null) return NOT_AVAILABLE;
  return value.toFixed(2);
}

/** Star ratings are whole numbers 1–5; suppressed ratings render as N/A. */
export function formatStar(value: number | null): string {
  if (value === null) return NOT_AVAILABLE;
  return String(Math.round(value));
}

export function formatBeds(value: number | null): string {
  if (value === null) return NOT_AVAILABLE;
  return String(Math.round(value));
}

export function formatText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : NOT_AVAILABLE;
}

/** Title-cases a single token, preserving interior characters. */
function titleCaseWord(word: string): string {
  if (word.length === 0) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map(titleCaseWord)
    .join(" ");
}

/**
 * Derives the display name without mutating the CMS legal name: a non-empty
 * override wins, otherwise the CMS name is used. Keeping both fields separate
 * preserves the audit trail and protects the static brand header.
 */
export function resolveDisplayName(
  cmsLegalName: string | null,
  nameOverride: string,
): string {
  const override = nameOverride.trim();
  if (override.length > 0) return override;
  return cmsLegalName ?? "Unknown Facility";
}

export function manualValue(inputs: ManualInputs, key: keyof ManualInputs): string {
  return formatText(inputs[key]);
}
