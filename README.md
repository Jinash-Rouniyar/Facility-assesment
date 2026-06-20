# Facility Assessment Report Generator

A Next.js app that looks up a nursing home by **CCN**, pulls public performance data from the
CMS Provider Data Catalog, merges it with manual operational inputs, and exports a branded
**Facility Assessment Snapshot** as PDF or Word — with facility-vs-state-vs-national charts in the
web UI.

Validation target: **CCN `686123`** (Kendall Lakes Healthcare and Rehab Center, FL).

**Live demo:** [https://facility-assesment.vercel.app/](https://facility-assesment.vercel.app/)

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Vitest unit + integration suite
npm run build    # production build
npm run samples  # regenerate samples/ PDF + DOCX from fixtures
```

Enter a CCN (e.g. `686123`) → **Lookup Facility** → fill operational inputs → **Download PDF / Word**.

## Architecture

```
Browser ─▶ /api/facility/[ccn] (Route Handler) ─▶ CMS PDC Query API
        ◀─ normalized FacilityReport JSON ◀─        (3 concurrent + 1 dependent query)
Browser ─▶ @react-pdf/renderer (PDF) · docx + file-saver (Word)  [client-side]
```

The browser never calls CMS directly — a server-side Route Handler proxies and normalizes all CMS
data, avoiding CORS exposure and centralizing mapping and error handling. Provider Information,
Claims, and the NATION average are fetched concurrently; the state-average query depends on the
facility's state, so it fires once Provider Information resolves and all promises are joined.

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Validation | Zod (CMS response envelopes) |
| PDF | `@react-pdf/renderer` (client) |
| Word | `docx` + `file-saver` (client) |
| Charts | Recharts (web UI only) |
| Tests | Vitest + frozen CMS fixtures |
| Deploy | Vercel |

### Project structure

```
src/
  app/
    page.tsx, layout.tsx              # web shell
    api/facility/[ccn]/route.ts       # CMS proxy + normalization (+ route.test.ts)
  components/
    FacilityReportApp.tsx             # form, lookup, inputs, export buttons
    ComparisonCharts.tsx              # Recharts bar charts
    pdf/FacilitySnapshotDocument.tsx  # @react-pdf/renderer template
  lib/
    ccn.ts                            # CCN validation + Care Compare URL
    formatters.ts                     # shared value formatting (single source of truth)
    report-view.ts                    # view model shared by UI, PDF, DOCX, charts
    types.ts                          # FacilityReport DTO + manual inputs
    branding/logo.ts                  # embedded INFINITE logo (base64 + bytes)
    cms/{client,mappings,schemas}.ts  # fetch, transform, Zod schemas
    export/docx.ts                    # Word document builder
fixtures/        # frozen live CMS responses for CCN 686123 (CI source of truth)
scripts/         # gen-samples.mts — writes sample PDF/DOCX from fixtures
```

## Key behaviors

- **CCN normalization:** non-digits stripped; exactly 6 digits required (no zero-padding, which the
  CMS API rejects). Malformed input → `400`; valid-but-unknown → `404`.
- **Claims score:** displays CMS `adjusted_score` (risk-adjusted) for measures `521/522/551/552`.
- **Formatting:** short-stay percentages to **2 decimals** (`25.58%`); long-stay rates to 2 decimals
  (`2.75`); star ratings as integers; suppressed/missing values render as **N/A**.
- **Graceful degradation:** if Claims or State Averages fail, the report still renders with `N/A`
  metrics and a UI notice. Only a missing Provider record is a `404`; CMS being unreachable is a `502`.
- **Branding guardrail:** the INFINITE logo (which carries "INFINITE — Managed by MEDELITE") is
  rendered as a centered image in the web header, PDF, and DOCX, with the title and state as text.
  None of these are ever derived from CMS data or the name override.
- **No caching (v1):** every lookup hits CMS live; usage is human-paced.

---

## Submission answers

### Tech Stack & Override Logic

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind**, **Zod** for response validation,
**`@react-pdf/renderer`** for PDF, **`docx` + `file-saver`** for Word, **Recharts** for charts,
**Vitest** for tests; deploys on **Vercel**.

**Facility name override** keeps the CMS legal name and the user override as independent fields; the
display name is derived only at render/export time and never mutates the CMS source
(`src/lib/formatters.ts`):

```ts
displayName = nameOverride.trim().length > 0
  ? nameOverride.trim()
  : cmsLegalName ?? "Unknown Facility";
```

The `INFINITE — Managed by MEDELITE` branding is rendered from a static logo asset in the export
templates and is never derived from any name field, so an override can never corrupt the brand or the
audit trail.

### Data Sourcing & QA Strategy

Three CMS Provider Data Catalog datasets are queried server-side via the PDC Query API
(`data.cms.gov/provider-data/api/1/datastore/query/{id}/0`):

| Dataset | ID | Filter |
|---|---|---|
| Provider Information | `4pq5-n9py` | `cms_certification_number_ccn = {ccn}` |
| Medicare Claims Quality Measures | `ijh5-nb2v` | `cms_certification_number_ccn = {ccn}` |
| State US Averages | `xcdc-v8bm` | `state_or_nation = {state}` and `= NATION` |

**Preventing label corruption:**
- Claims rows are mapped by **stable measure codes** (`521/522/551/552`), not by description strings
  that CMS can reword.
- Provider Info and the wide State-Averages columns use an explicit typed map (`mappings.ts`).
- A single immutable transform produces the `FacilityReport` DTO; **one set of formatters** feeds UI,
  PDF, DOCX, and charts, so a value is never formatted two different ways.
- Zod validates the API envelope so schema drift surfaces in tests rather than silently corrupting.
- **CI** runs Vitest against frozen fixtures in `fixtures/686123-*.json` (mapping, measure codes,
  formatting, override logic, graceful degradation, client/route behavior, export rendering).
- **Pre-submission manual check**: `686123` adjusted scores compared against the Medicare Care
  Compare profile in the browser.

We display CMS **`adjusted_score`** (risk-adjusted) because it is the public Care Compare reporting
standard and is comparable to the published state/national averages.

### Obstacles & Engineering Tradeoffs

- **Reference PDF was stale vs. live API.** The provided `Kendall Lakes…pdf` disagreed with the live
  API on most numeric fields (e.g. it showed 1/1/2/4 star ratings; the live API returns 5/5/2/5).
  *Resolution:* treat the reference as a **layout/branding exemplar only** and validate data
  correctness against frozen live fixtures + a manual Care Compare spot-check — never assert numeric
  equality with the PDF.
- **CMS query API quirks.** Filters require an explicit `operator==`; leading-zero CCNs (`0686123`)
  return zero results. *Resolution:* CCN input is stripped to digits and must be exactly 6 (no
  left-padding); the URL builder always sets the equality operator.
- **State averages are a wide table**, with truncated column names (e.g. `…_l_de9d`). *Resolution:*
  an explicit verified column map plus fixture tests pin the four needed columns.
- **State query depends on the facility's state.** *Resolution:* the CCN/constant-only calls (claims
  + NATION) start before Provider Information is awaited and run concurrently; the state-row query
  fires once the state code is known, then all in-flight promises join via `Promise.all`.
- **DOCX renders differently across viewers.** Word, Pages/Quick Look, and Google Docs disagree on
  OOXML defaults. *Resolution:* fixed DXA table widths + `TableLayoutType.FIXED` (percentage widths
  collapse outside Word), a three-column spacer table to center the logo geometrically, and explicit
  hyperlink run styling (the built-in `Hyperlink` style renders oversized in non-Word viewers).

### Assumptions

- `adjusted_score` is the headline claims value (documented above).
- Suppressed/footnoted CMS values and failed secondary datasets render as **N/A** (graceful
  degradation); a provider-not-found is the only data `404`.
- Location is a minimal, data-faithful join (`street, Title-Cased City, ST`) rather than inventing
  abbreviations the CMS source doesn't contain.
- No caching for v1 — lookups are human-paced.

## Testing

```bash
npm test
```

43 tests across 6 files:
- **CCN** normalization + Care Compare URL (`ccn.test.ts`)
- **Formatters** — percentages/rates/stars/beds/text, N/A handling, title-case, override resolution
  (`formatters.test.ts`)
- **CMS client** — query-URL construction and failure mapping for network/non-2xx/unparseable/bad-shape
  responses (`cms/client.test.ts`)
- **Mapping + view model** — fixture-based provider/claims/state/nation mapping, location edge cases,
  chart data, graceful degradation, 13 overview + 12 hospitalization rows (`cms/mappings.test.ts`)
- **Route handler** — `400`/`404`/`502`/`200`, input normalization, partial-failure degradation with a
  mocked CMS (`api/facility/[ccn]/route.test.ts`)
- **Export templates** — PDF (`%PDF` header) and DOCX render-to-bytes smoke tests (`export/exports.test.tsx`)

## Deployment

**Live URL:** [https://facility-assesment.vercel.app/](https://facility-assesment.vercel.app/)

The app deploys to **Vercel** with zero config (Route Handlers run as serverless functions; exports
are client-side, so no Chromium is needed). Repository:
[github.com/Jinash-Rouniyar/Facility-assesment](https://github.com/Jinash-Rouniyar/Facility-assesment)

## Refreshing fixtures

Fixtures in `fixtures/` are frozen CMS responses. To refresh, re-query the three datasets for a CCN
with `schema=false&keys=true` and save the response `results`. Then run `npm run samples` to
regenerate the sample exports.
