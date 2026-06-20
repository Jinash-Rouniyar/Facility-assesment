import { afterEach, describe, expect, it, vi } from "vitest";

import { CmsUnreachableError, queryDataset } from "./client";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("queryDataset — request construction", () => {
  it("builds an equality-filter PDC query URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await queryDataset("4pq5-n9py", "cms_certification_number_ccn", "686123");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/datastore/query/4pq5-n9py/0?");
    expect(url).toContain("conditions%5B0%5D%5Bproperty%5D=cms_certification_number_ccn");
    expect(url).toContain("conditions%5B0%5D%5Bvalue%5D=686123");
    expect(url).toContain("conditions%5B0%5D%5Boperator%5D=%3D");
  });

  it("returns the results array on success", async () => {
    const rows = [{ cms_certification_number_ccn: "686123", provider_name: "TEST" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ results: rows })));

    await expect(
      queryDataset("4pq5-n9py", "cms_certification_number_ccn", "686123"),
    ).resolves.toEqual(rows);
  });

  it("returns an empty array when CMS reports no matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ results: [] })));

    await expect(
      queryDataset("4pq5-n9py", "cms_certification_number_ccn", "999999"),
    ).resolves.toEqual([]);
  });
});

describe("queryDataset — failure handling", () => {
  it("maps network errors to CmsUnreachableError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    await expect(queryDataset("x", "p", "v")).rejects.toBeInstanceOf(CmsUnreachableError);
  });

  it("maps non-2xx responses to CmsUnreachableError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));

    await expect(queryDataset("x", "p", "v")).rejects.toBeInstanceOf(CmsUnreachableError);
  });

  it("maps unparseable bodies to CmsUnreachableError", async () => {
    const badBody = {
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(badBody));

    await expect(queryDataset("x", "p", "v")).rejects.toBeInstanceOf(CmsUnreachableError);
  });

  it("maps unexpected response shapes to CmsUnreachableError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })));

    await expect(queryDataset("x", "p", "v")).rejects.toBeInstanceOf(CmsUnreachableError);
  });
});
