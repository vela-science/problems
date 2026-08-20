import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";
import { EditorialPlate } from "@/components/vela/editorial-plate";
import { PublicInformationNav } from "@/components/vela/public-information-page";
import atlasPlate from "@editorial/assets/paintings/hero.webp";
import styles from "./about-brand.module.css";
import { Disclosure } from "@/components/vela/disclosure";

export const metadata: Metadata = {
  title: "About",
  description: "Why problems.science exists, how it presents scientific problems and evidence, and what Vela does and does not claim.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell as="article" archetype="reading" layout="reading" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <div className="mb-8"><PublicInformationNav current="/about" /></div>
          <h1 className={styles.title}>Science should remember the route, not only the arrival.</h1>
          <p className={styles.lead}>problems.science brings a question, its sources, durable Results, active Work, and the history between them into one readable place.</p>
          <p className="mt-4 max-w-[58ch] text-body leading-7 text-muted-foreground">
            problems.science is a Vela project. <a href="https://vela.space" className="font-medium text-primary underline underline-offset-4">Learn about Vela</a>.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden data-icon="inline-end" /></Button>
            <Button nativeButton={false} variant="outline" render={<a href="https://vela.space/constellations" />}>Read Endless Frontiers</Button>
          </div>
        </div>
        <EditorialPlate
          image={atlasPlate}
          caption="The sail is orientation; exact relationships live in the research map."
          href="/graph"
          linkLabel="Open research map"
          priority
        />
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Start with the Problem.</h2>
        <div className={styles.copy}>
          <p>Every public page begins with a scientific question. Results are durable outputs attached to that question: a proof, computation, dataset, review, negative result, or correction. Work stays visibly separate because an active approach is not yet a result.</p>
          <p>Source wording and status remain attributed to the collection that published them. A Vela Repository may record its own current state, but problems.science does not turn that local decision into universal truth.</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Keep each handoff visible.</h2>
        <div>
          <p className={styles.copy}>A useful scientific record preserves the boundaries between what was published, what someone added, what was checked, and what one Repository decided to inherit.</p>
          <ol className={styles.passage} aria-label="How source material becomes readable current state">
            <li><strong>Source</strong><span>The collection owns the question, wording, revision, and source status.</span></li>
            <li><strong>Result</strong><span>A human or agent contributes one attributable, bounded output.</span></li>
            <li><strong>Check</strong><span>A scoped review records what it observed, with method and limitations.</span></li>
            <li><strong>Repository state</strong><span>An explicit local decision determines what that Repository carries forward.</span></li>
          </ol>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Human and agent work shares one provenance grammar.</h2>
        <div className={styles.copy}>
          <p>Performer kind is not a quality score. The useful context is the named performer, provider or affiliation, model and version where relevant, method, environment, independence, limitations, and evidence.</p>
          <p>GitHub remains the home of source contributions and maintainer decisions. Entire and native tools remain the home of generic agent sessions and checkpoints. Problems keeps exact references when they help a reader understand the scientific work.</p>
        </div>
      </section>

      <aside className={styles.boundary} aria-labelledby="about-boundary-title">
        <h2 id="about-boundary-title" className="text-title">What this site does not claim</h2>
        <p className="mt-3 max-w-[72ch] text-body leading-7 text-muted-foreground">A signature proves attribution and integrity, not truth. A passing check does not accept a Result. An account does not grant scientific authority. Search and browsing help a reader choose what to inspect; problems.science does not read the literature for new results, rank problems, or decide which question deserves attention next.</p>
        <p className="mt-4 max-w-[72ch] text-body leading-7 text-muted-foreground">Keeping a contribution, its checks, and a decision on separate axes is a practice other scientific registries also follow, and some present it well. What this site adds is the admitted record behind a Result: the exact source it was scoped to, what each check covered, the named Repository decision that changed state, and every correction since, all replayable from the repository itself.</p>
        <Disclosure className="mt-5 border-t border-border pt-4 text-meta" summaryClassName="font-medium text-foreground" summary="Technical release details">
          <p className="mt-3 max-w-[68ch] text-muted-foreground">The current source revisions, generator version, collection roots, and projection root are published in the exact site manifest.</p>
          <a href="/.well-known/vela-site.json" className="mt-2 inline-flex min-h-6 items-center font-medium text-primary underline underline-offset-4">Open exact release manifest</a>
        </Disclosure>
      </aside>
    </PageShell>
  );
}
