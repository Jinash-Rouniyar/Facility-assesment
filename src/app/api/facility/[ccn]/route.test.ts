import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), "fixtures", name), "utf-8"));

const PROVIDER = fixture("686123-provider.json");
const CLAIMS = fixture("686123-claims.json");
const STATE_FL = fixture("686123-state-fl.json");
const NATION = fixture("686123-state-nation.json");

const EMPTY = { results: [] };

function asResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

/** Routes a CMS request URL to the matching fixture. */
function cmsRouter(overrides: Partial<Record<"provider" | "claims" | "state" | "nation", unknown>> = {}) {
  return vi.fn(async (url: string) => {
    if (url.includes("4pq5-n9py")) return asResponse(overrides.provider ?? PROVIDER);
    if (url.includes("ijh5-nb2v")) return asResponse(overrides.claims ?? CLAIMS);
    if (url.includes("xcdc-v8bm")) {
      const isNation = url.includes("NATION");
      return asResponse((isNation ? overrides.nation : overrides.state) ?? (isNation ? NATION : STATE_FL));
    }
    throw new Error(`Unexpected URL: ${url}`);
  });
}

function call(ccn: string) {
  return GET(new Request("http://test/api"), { params: Promise.resolve({ ccn }) });
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/facility/[ccn]", () => {
  it("returns 400 for a malformed CCN without calling CMS", async () => {
    const fetchMock = cmsRouter();
    vi.stubGlobal("fetch", fetchMock);

    const res = await call("123");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "CCN must be 6 digits" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a normalized report for a valid CCN", async () => {
    vi.stubGlobal("fetch", cmsRouter());

    const res = await call("686123");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cmsLegalName).toBe("KENDALL LAKES HEALTHCARE AND REHAB CENTER");
    expect(body.certifiedBeds).toBe(150);
    expect(body.claims.shortStayHospitalization.facility).toBeCloseTo(25.575578);
    expect(body.claims.shortStayHospitalization.state).toBeCloseTo(26.203324);
    expect(body.partial).toEqual({ claims: false, stateAverages: false });
  });

  it("normalizes formatted CCN input before querying", async () => {
    vi.stubGlobal("fetch", cmsRouter());

    const res = await call("686-123");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ccn: "686123" });
  });

  it("returns 404 when the facility is not found", async () => {
    vi.stubGlobal("fetch", cmsRouter({ provider: EMPTY }));

    const res = await call("999999");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "No facility found for CCN 999999" });
  });

  it("returns 502 when Provider Information is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("4pq5-n9py")) throw new Error("network down");
        return asResponse(EMPTY);
      }),
    );

    const res = await call("686123");
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: "Unable to reach CMS. Try again." });
  });

  it("degrades gracefully when claims and averages fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("4pq5-n9py")) return asResponse(PROVIDER);
        throw new Error("secondary dataset down");
      }),
    );

    const res = await call("686123");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.partial).toEqual({ claims: true, stateAverages: true });
    expect(body.claims.shortStayHospitalization.facility).toBeNull();
    expect(body.ratings.overall).toBe(5);
  });
});
