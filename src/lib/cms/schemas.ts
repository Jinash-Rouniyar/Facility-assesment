import { z } from "zod";

/**
 * The PDC Query API returns every field as a string inside a `results` array.
 * We validate the envelope shape and keep rows as loose string records so that
 * monthly CMS column changes surface in the mapping layer rather than crashing
 * the parser. Footnote/suppressed fields arrive as empty strings.
 */
const cmsRow = z.record(z.string(), z.string().nullable());

export const cmsQueryResponse = z.object({
  results: z.array(cmsRow),
  count: z.number().optional(),
});

export type CmsRow = z.infer<typeof cmsRow>;
export type CmsQueryResponse = z.infer<typeof cmsQueryResponse>;
