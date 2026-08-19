import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import { PageShell } from "@vela/ui/vela/page-shell";
import { EditorialPlate } from "@/components/vela/editorial-plate";
import { PublicInformationNav } from "@/components/vela/public-information-page";
import archivePlate from "@editorial/assets/paintings/endless-folio-archive.webp";
import handoffPlate from "@editorial/assets/paintings/endless-folio-handoff.webp";
import openingPlate from "@editorial/assets/paintings/endless-folio-opening.webp";
import styles from "./essay.module.css";

const DESCRIPTION = "Discovery is only part of scientific progress. Knowledge also has to be preserved, interpreted, and handed to the people who need it next.";

export const metadata: Metadata = {
  title: "Endless Frontiers",
  description: DESCRIPTION,
  alternates: { canonical: "/about/endless-frontiers" },
  openGraph: {
    title: "Endless Frontiers",
    description: DESCRIPTION,
    type: "article",
    publishedTime: "2026-01-08",
    modifiedTime: "2026-08-18",
  },
};

const sections = [
  ["record", "The record around the result"],
  ["handoff", "Five separate acts"],
  ["plural", "Plural records, shared navigation"],
  ["frontier", "The endless frontier"],
] as const;

export default function EndlessFrontiersPage() {
  return (
    <PageShell as="article" archetype="reading" layout="reading" className={styles.page}>
      <header className={styles.hero}>
        <div>
          <div className="mb-8"><PublicInformationNav current="/about/endless-frontiers" /></div>
          <h1 className={styles.title}>Endless Frontiers</h1>
          <p className={styles.subtitle}>The missing handoff between what a field knows and what it builds next.</p>
          <p className="mt-5 font-sans text-meta text-muted-foreground">First published January 2026 · revised for the current product August 2026</p>
        </div>
        <EditorialPlate image={openingPlate} caption="An authored horizon for the long scientific handoff. The painting is atmosphere, not a data map." priority />
      </header>

      <div className={styles.article}>
        <div className={styles.prose}>
          <section id="record" className={styles.section}>
            <h2>The record around the result</h2>
            <p>I was six years old when an MRI revealed the brain tumor that had been causing months of headaches, nausea, and problems with my balance. My parents had taken me to doctors twelve times over four months, but each visit was treated as an isolated event. Once they insisted on a scan, the tumor was visible almost immediately.</p>
            <p>Doctors had seen the same symptoms in other children, and the patterns had been recorded in medical literature long before I became sick. My parents knew that the explanations they were receiving did not fit the child they knew, but they had no practical way to connect what was happening to what medicine had already learned.</p>
            <p>That experience shaped how I think about scientific progress. We often describe science as the production of new knowledge. Discovery is only part of the process. Knowledge also has to be preserved, interpreted, and made available to the people who need it.</p>
            <aside className={styles.note}><strong>A necessary limit.</strong> A better record can support recognition; it cannot guarantee a diagnosis. Medicine retains uncertainty, professional judgment, and responsibility for action.</aside>
            <p>Science is very good at saving information, but not always at saving the judgment around that information. Papers preserve conclusions, methods, and evidence. They do not automatically show which later findings held up, which scope changed, which path was tried and abandoned, or what a field should inspect next.</p>
            <p>Vannevar Bush described part of this problem in <a href="https://worrydream.com/refs/Bush%20-%20As%20We%20May%20Think%20(Life%20Magazine%209-10-1945).pdf" rel="noopener">“As We May Think”</a>: research results had outgrown any one person&apos;s ability to use them, while the means of navigating the record had not kept pace. His memex preserved a reader&apos;s trails between documents, not only the documents themselves.</p>
            <EditorialPlate className={styles.plate} image={archivePlate} caption="Archive, evidence, and route remain distinct. The painting carries the story; exact records remain in the product." />
          </section>

          <section id="handoff" className={styles.section}>
            <h2>Five separate acts</h2>
            <p>The problem grows when the cost of producing a new attempt falls. In 2026, the First Proof exercise put ten active research problems to four AI systems and received thirty-nine proposed solutions. Some were correct, some wrong, and some difficult enough that referees spent hours determining what the arguments even claimed. The <a href="https://arxiv.org/abs/2606.18119" rel="noopener">First Proof Second Batch report</a> publishes the problems, outputs, methodology, and referee reports.</p>
            <p>If proposed results grow from dozens to thousands, the limiting factor is no longer production. It is the expert attention required to understand, check, and reuse them.</p>
            <p className={styles.hinge}>Produce. Preserve. Check. Decide. Reuse.</p>
            <p>A researcher or agent produces a bounded piece of work. A durable Result preserves its assertion, artifacts, evidence, conditions, and caveats. A named reviewer checks one stated property. A Repository decides whether that exact contribution changes its local starting point. The next researcher continues from that state.</p>
            <p>Each act has a different owner and scope. A Lean kernel can check a term against a formal statement and environment. An instrument can check a physical quantity under calibration and sampling assumptions. Neither check supplies a universal scientific verdict. A signature proves attribution and integrity, not truth.</p>
          </section>

          <section id="plural" className={styles.section}>
            <h2>Plural records, shared navigation</h2>
            <p>A useful record does not need to make every community agree. A laboratory may accept a synthesis on its instruments while a standards body waits for durability data. Their records should show whether they disagree about the question, the evidence, the check, or the decision.</p>
            <p>Vela keeps current state Repository-local. problems.science gives those records a public reading surface organized around the Problem. Collections retain source-owned identity. Results retain attribution and limitations. Checks remain observations. Explicit Decisions determine what one Repository carries forward.</p>
            <p>A relationship map can then help a reader navigate exact links without merging the objects it connects. Ten papers may analyze the same patient cohort. Two laboratories may share an assay and one failure mode. Without those links, repetition can look like confirmation. With invented links, a diagram can look more certain than the record. The map has to earn every edge.</p>
            <aside className={styles.note}><strong>Tools keep their own work.</strong> GitHub owns source history and maintainer decisions. Entire and native tools own generic agent sessions and checkpoints. Local workbenches own files, processes, secrets, and execution. Problems links to that context without copying it into a second provenance store.</aside>
          </section>

          <section id="frontier" className={styles.section}>
            <h2>The endless frontier</h2>
            <p>The same limit returns once machines produce a large share of humanity&apos;s scientific output. The constraint is not how much they can produce. It is whether what they produce can be examined, trusted for a defined purpose, corrected, and built on.</p>
            <p>The record therefore has to remain public and portable. Its memory cannot depend on one laboratory or company continuing to operate, or on the original researchers remaining available to explain what they meant. An outsider should be able to open a Problem, understand the best retained Result and its limits, inspect the source, see prior work, and choose what to do next.</p>
            <p>When I was six, I saw doctor after doctor before the cause of what was happening to me was found. I cannot know whether a better shared record would have changed my experience. What I do know is that another child should have a better chance of benefiting from what other doctors, researchers, and patients have already learned. That child should not depend entirely on whether one person happens to remember the right connection at the right time.</p>
            <p>None of us starts from nothing. We receive knowledge from people we will never meet, including those whose failed experiments narrowed the search. We work with that knowledge for a while and leave it for the people who come next, so long as we make sure that others can actually use it.</p>
          </section>
        </div>

        <nav className={styles.contents} aria-label="Essay sections">
          <p>In this essay</p>
          <ol>{sections.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
        </nav>
      </div>

      <footer className={styles.closing}>
        <EditorialPlate image={handoffPlate} caption="One route closes; another researcher continues from the retained record." />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl font-[family-name:var(--vela-font-body)] text-[1.125rem] leading-7 text-muted-foreground">The essay is an argument for the handoff. The product begins with the Problems available now.</p>
          <Button nativeButton={false} render={<Link href="/problems" />}>Browse Problems <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden data-icon="inline-end" /></Button>
        </div>
      </footer>
    </PageShell>
  );
}
