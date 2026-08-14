import { ExactValue } from "@vela/ui/vela/exact-value";

/* One labelled exact value inside a record's `dl`.
 *
 * Five routes had written this cell out privately — three called it `Root`, two
 * `Fact`, one of the `Fact`s shared its name with a different component in the
 * same file, and the fifth copy had already lost `min-w-0` and taken a
 * different label token. The label is a type role rather than `text-meta
 * font-medium`, which is what root DESIGN.md's Type section asks for and what
 * the drifted copy already used; the two are the same 12px/500 either way, so
 * nothing moves on the page.
 *
 * `min-w-0` is not cosmetic: without it a 64-hex root refuses to shrink and
 * pushes its grid column past the viewport. */
export function RootFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        <ExactValue value={value} label={label} />
      </dd>
    </div>
  );
}
