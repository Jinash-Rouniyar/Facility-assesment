import { cmsQueryResponse, type CmsRow } from "./schemas";

const BASE_URL = "https://data.cms.gov/provider-data/api/1/datastore/query";

export class CmsUnreachableError extends Error {
  constructor(message = "Unable to reach CMS. Try again.") {
    super(message);
    this.name = "CmsUnreachableError";
  }
}

function buildQueryUrl(datasetId: string, property: string, value: string): string {
  const params = new URLSearchParams();
  params.set("conditions[0][property]", property);
  params.set("conditions[0][value]", value);
  params.set("conditions[0][operator]", "=");
  params.set("schema", "false");
  params.set("keys", "true");
  return `${BASE_URL}/${datasetId}/0?${params.toString()}`;
}

/**
 * Single equality-filter query against a PDC dataset. Any failure to obtain a
 * well-formed response — network error, non-2xx status, unparseable body, or
 * unexpected shape — surfaces as `CmsUnreachableError`. An empty match returns [].
 */
export async function queryDataset(
  datasetId: string,
  property: string,
  value: string,
): Promise<CmsRow[]> {
  let response: Response;
  try {
    response = await fetch(buildQueryUrl(datasetId, property, value), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new CmsUnreachableError();
  }

  if (!response.ok) {
    throw new CmsUnreachableError();
  }

  try {
    const json = await response.json();
    return cmsQueryResponse.parse(json).results;
  } catch {
    throw new CmsUnreachableError();
  }
}
