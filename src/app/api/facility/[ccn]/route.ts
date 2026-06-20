import { NextResponse } from "next/server";

import { validateCcn } from "@/lib/ccn";
import { CmsUnreachableError, queryDataset } from "@/lib/cms/client";
import { buildFacilityReport, DATASETS } from "@/lib/cms/mappings";
import type { CmsRow } from "@/lib/cms/schemas";

const CCN_PROPERTY = "cms_certification_number_ccn";
const STATE_PROPERTY = "state_or_nation";

/** Secondary datasets degrade gracefully — a failure becomes an empty result. */
const safeQuery = (promise: Promise<CmsRow[]>): Promise<CmsRow[]> =>
  promise.catch(() => [] as CmsRow[]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ccn: string }> },
) {
  const { ccn } = await params;
  const { valid, normalized, error } = validateCcn(ccn);
  if (!valid) {
    return NextResponse.json({ error }, { status: 400 });
  }

  // Kick off the CCN-independent secondary queries before awaiting provider info
  // so the three slow calls run concurrently.
  const claimsPromise = safeQuery(
    queryDataset(DATASETS.claims, CCN_PROPERTY, normalized),
  );
  const nationPromise = safeQuery(
    queryDataset(DATASETS.stateAverages, STATE_PROPERTY, "NATION"),
  );

  let providerRows: CmsRow[];
  try {
    providerRows = await queryDataset(DATASETS.providerInfo, CCN_PROPERTY, normalized);
  } catch (err) {
    if (err instanceof CmsUnreachableError) {
      return NextResponse.json(
        { error: "Unable to reach CMS. Try again." },
        { status: 502 },
      );
    }
    throw err;
  }

  const provider = providerRows[0];
  if (!provider) {
    return NextResponse.json(
      { error: `No facility found for CCN ${normalized}` },
      { status: 404 },
    );
  }

  const stateCode = provider.state?.trim();
  const statePromise = stateCode
    ? safeQuery(queryDataset(DATASETS.stateAverages, STATE_PROPERTY, stateCode))
    : Promise.resolve<CmsRow[]>([]);

  const [claims, nationRows, stateRows] = await Promise.all([
    claimsPromise,
    nationPromise,
    statePromise,
  ]);

  const report = buildFacilityReport({
    ccn: normalized,
    provider,
    claims,
    stateRow: stateRows[0],
    nationRow: nationRows[0],
  });

  return NextResponse.json(report);
}
