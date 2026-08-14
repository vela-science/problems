import { z } from "zod";

/*
  Shape of the editorial summary, with no I/O.

  Split out from editorial.ts so the snapshot generator can validate what it is
  about to write without importing the module that *reads* the snapshot — which
  would fail on a first run, before the file exists.

  ── v5, 2026-08-14 ────────────────────────────────────────────────────────────

  v5 removes the retired central work inventory from the current summary.
  Bounded evidence enters through the direct Submission action carried by the
  strict-replayed Repository status. Prior snapshot bytes remain immutable;
  the current reader and writer do not keep a compatibility branch for them.

  ── v2, 2026-07-28 ────────────────────────────────────────────────────────────

  v1 could no longer be regenerated. It named two things the protocol had
  stopped publishing.

  Roots. v1 carried `event_root` from `status.roots.event_log`. The current
  repository emitter publishes `origin`, `repository`, `authority_keyset` and
  `authority_policy`, and no event log root at all. Rather than pick a
  replacement by hand, v2 asks `statusStateRoot()` — the same helper the
  Problems renders from — which already encodes which root is canonical for
  each status shape, and carries the label with it so the site can name the
  root truthfully instead of hardcoding one word for a value whose meaning
  changed underneath it.

  Work. v1 read `open_work` and `available_work` off `status.counts`, where none
  of them now exist. v2 temporarily read a separate Target projection. v5
  deletes that projection and its counters rather than carrying permanent
  decode-only fields in the live contract.

  `counts.events` is gone with no replacement: the emitter does not publish an
  event count, and inventing one from another field would be a guess.
*/

const root = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

export const editorialSummarySchema = z.object({
  schema: z.literal("site.repository-editorial-summary.v5"),
  generated_at: z.string(),
  vela_version: z.string(),
  repositories: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    source: z.object({ remote: z.string().url(), commit: z.string().regex(/^[0-9a-f]{40}$/u) }),
    /* The root a reader should clone and check against, and what this status
       shape calls it. */
    canonical_root: root,
    canonical_root_label: z.string().min(1),
    origin_root: root,
    replay: z.string(),
    strict_blockers: z.number().int().nonnegative(),
    counts: z.object({
      claims: z.number().int().nonnegative(),
      pending_review: z.number().int().nonnegative(),
    }),
  })),
});

export type EditorialSummary = z.infer<typeof editorialSummarySchema>;
