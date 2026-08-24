import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@vela/ui/components/badge";
import { Button } from "@vela/ui/components/button";
import { PageHero, PageSection, PageShell } from "@vela/ui/vela/page-shell";
import frontier from "./frontier-data.json";

// A derived, disposable projection over the whole upstream corpus, computed
// from each declaration's axiom closure and type-level sorryAx reachability.
// It holds no authority and rebuilds from its census; on productization the
// dataset moves into @vela/projection-data beside the collection it extends.

export const metadata: Metadata = {
  title: "The Formal Conjectures Frontier",
  description:
    "Every authored declaration in the corpus, typed by the work it asks for: prove, state, or repair.",
  alternates: { canonical: "/problems/formal-conjectures/frontier" },
};

const { totals, authored_declarations, families, top_prove_families, repair_declarations, generated_from } = frontier;
const settled = totals.kernel + totals.compiler;
const open = totals.prove + totals.state + totals.repair;
const pct = (n: number) => `${((n / authored_declarations) * 100).toFixed(1)}%`;

const obligations = [
  {
    key: "prove",
    n: totals.prove,
    dot: "bg-status-caution",
    title: "Prove — attackable now",
    body: "Fully stated theorems whose only hole is the proof. Any prover, human or machine, can attack these today; a success is a genuine advance.",
  },
  {
    key: "state",
    n: totals.state,
    dot: "bg-status-progress",
    title: "State — instantiate before proving",
    body: "answer(sorry) declarations whose statement is itself the unknown. They cannot be proved, only instantiated; standard trust reporting cannot tell these apart from provable targets.",
  },
  {
    key: "repair",
    n: totals.repair,
    dot: "bg-status-conflict",
    title: "Repair — foundations resting on holes",
    body: "Statements that read complete but quantify over objects defined by choice from a sorried existence lemma. Invisible to source inspection; found only by walking the type's transitive closure.",
  },
] as const;

export default function FormalConjecturesFrontierPage() {
  return (
    <PageShell archetype="problem">
      <PageHero density="compact" className="vela-product-hero grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display">The Frontier</h1>
            <Badge variant="secondary">Derived view · {authored_declarations.toLocaleString()} declarations</Badge>
          </div>
          <p className="mt-3 max-w-3xl text-body text-muted-foreground">
            Every authored declaration in the upstream corpus, typed by the work it
            actually asks for — computed from exact state, not read from labels.{" "}
            <span className="font-medium text-foreground">{totals.prove.toLocaleString()} theorems are attackable right now.</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/problems/formal-conjectures" />}>
              Published subset <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden data-icon="inline-end" />
            </Button>
            <Button nativeButton={false} variant="outline" render={<Link href="/contribute" />}>Add a Result</Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-meta">
          <div className="bg-card p-4"><dt className="text-muted-foreground">Open obligations</dt><dd className="mt-1 font-medium">{open.toLocaleString()}</dd></div>
          <div className="bg-card p-4"><dt className="text-muted-foreground">Settled results</dt><dd className="mt-1 font-medium">{settled.toLocaleString()}</dd></div>
          <div className="bg-card p-4"><dt className="text-muted-foreground">Problem families</dt><dd className="mt-1 font-medium">{families.toLocaleString()}</dd></div>
          <div className="bg-card p-4"><dt className="text-muted-foreground">Lean toolchain</dt><dd className="mt-1 font-mono text-micro">{generated_from.lean_toolchain.replace("leanprover/lean4:", "")}</dd></div>
        </dl>
      </PageHero>

      <PageSection aria-labelledby="frontier-shape" className="pt-6">
        <h2 id="frontier-shape" className="sr-only">The shape of the frontier</h2>
        <div className="flex h-10 overflow-hidden rounded-md border" role="img"
          aria-label={`Proportions: settled kernel ${totals.kernel}, settled compiler-trust ${totals.compiler}, prove ${totals.prove}, state ${totals.state}, repair ${totals.repair}`}>
          <div style={{ flexGrow: totals.kernel }} className="bg-status-evidence/70" />
          <div style={{ flexGrow: totals.compiler }} className="bg-status-evidence/35" />
          <div style={{ flexGrow: totals.prove }} className="bg-status-caution/80" />
          <div style={{ flexGrow: totals.state }} className="bg-status-progress/60" />
          <div style={{ flexGrow: totals.repair, minWidth: 4 }} className="bg-status-conflict" />
        </div>
        <p className="mt-2 text-meta text-muted-foreground">
          Settled · kernel {totals.kernel.toLocaleString()} ({pct(totals.kernel)}) · compiler-trust {totals.compiler} ·{" "}
          <span className="text-foreground">prove {totals.prove.toLocaleString()} ({pct(totals.prove)})</span> · state {totals.state} · repair {totals.repair}
        </p>
      </PageSection>

      <PageSection aria-labelledby="obligation-types" className="pt-6">
        <h2 id="obligation-types" className="text-label border-b pb-2">Three kinds of open work</h2>
        <ul className="divide-y">
          {obligations.map((o) => (
            <li key={o.key} className="flex gap-4 px-2 py-4">
              <span aria-hidden className={`mt-2 size-1.5 shrink-0 rounded-full ${o.dot}`} />
              <div>
                <h3 className="text-compact font-medium">
                  <span className="font-mono">{o.n.toLocaleString()}</span> · {o.title}
                </h3>
                <p className="mt-1 max-w-[78ch] text-meta text-muted-foreground">{o.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection aria-labelledby="dense-edge" className="pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
          <h2 id="dense-edge" className="text-label">Where the live edge is densest</h2>
          <p className="text-meta text-muted-foreground">families by attackable theorems</p>
        </div>
        <ul className="divide-y">
          {top_prove_families.map((f) => (
            <li key={f.family} className="flex items-baseline justify-between gap-3 px-2 py-3">
              <span className="min-w-0 truncate font-mono text-micro">{f.family}</span>
              <span className="shrink-0 text-meta text-muted-foreground">
                <span className="font-medium text-foreground">{f.prove} prove</span>
                {f.state ? ` · ${f.state} state` : ""}
              </span>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection aria-labelledby="repair-list" className="pt-6">
        <h2 id="repair-list" className="text-label border-b pb-2">The {totals.repair} foundations to repair</h2>
        <p className="mt-3 max-w-[78ch] text-meta text-muted-foreground">
          Each rests on an existence lemma proved by sorry, through .choose or Nat.find.
          Downstream work here builds on sand until the existence proof lands.
        </p>
        <ul className="mt-3 grid gap-1 font-mono text-micro">
          {repair_declarations.map((d) => <li key={d} className="truncate">{d}</li>)}
        </ul>
      </PageSection>

      <PageSection aria-labelledby="frontier-provenance" className="pt-8">
        <h2 id="frontier-provenance" className="text-label border-b pb-2">Exact-state provenance</h2>
        <p className="mt-3 max-w-[78ch] text-meta text-muted-foreground">
          A derived, disposable projection: it holds no authority, changes no Standing,
          and rebuilds from its census at any time. Obligation types are computed from
          each declaration&rsquo;s axiom closure and type-level sorryAx reachability under
          the pinned toolchain.
        </p>
        <dl className="mt-3 grid gap-1 font-mono text-micro text-muted-foreground">
          <div>corpus {generated_from.corpus} @ {generated_from.commit.slice(0, 12)} (≡ {generated_from.upstream_equivalent})</div>
          <div>census {generated_from.census} · measured {generated_from.measured_on}</div>
        </dl>
      </PageSection>
    </PageShell>
  );
}
