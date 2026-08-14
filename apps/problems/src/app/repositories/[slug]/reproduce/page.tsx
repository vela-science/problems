import { PageShell } from "@vela/ui/vela/page-shell";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert02Icon as ShieldAlert, CheckmarkCircle02Icon as CheckCircle2 } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { allRepositories, repositoryBySlug, projectionRelease, statusStateRoots } from "@vela/projection-data";
import { repositoryRegistry } from "@vela/projection-data/registry";
import { StatusBadge } from "@vela/ui/vela/status-badge";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@vela/ui/components/collapsible";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@vela/ui/components/item";
import { PageIntro } from "@/components/vela/page-intro";
import { RootFact } from "@/components/vela/root-fact";

export const dynamicParams = false;
export async function generateStaticParams() { return (await allRepositories()).map((repository) => ({ slug: repository.slug })); }
export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/reproduce">): Promise<Metadata> { const { slug } = await params; const repository = await repositoryBySlug(slug); return repository ? { title: `Reproduce ${repository.status.repository.name}`, description: `Pinned replay instructions for the ${repository.status.repository.name} repository.`, alternates: { canonical: `/repositories/${slug}/reproduce` } } : {}; }

export default async function ReproducePage({ params }: PageProps<"/repositories/[slug]/reproduce">) {
  const { slug } = await params;
  const [repository, release] = await Promise.all([repositoryBySlug(slug), projectionRelease()]);
  /* The checkout directory is declared per Repository in the registry, beside the
     remote it is cloned from. It used to be re-derived here by splitting the
     remote on `/` and stripping `.git`, with the slug as a fallback that would
     have named a directory no clone produces. A reader is told to run this
     line, so it is read from the declaration rather than reconstructed. A slug
     with no registry entry means the projection and the registry disagree about
     which Repositories exist, and this page cannot state exact steps for it. */
  const source = repositoryRegistry.repositories.find((entry) => entry.slug === slug);
  if (!repository || !source) notFound();
  const binaryHash = release.generator.vela_binary_sha256.replace("sha256:", "");
  const stateRoots = statusStateRoots(repository.status);
  const steps = [
    { title: "Obtain the exact source", description: repository.source.access === "private" ? "Verify authorized GitHub access, acquire the private canonical repository, and check out the published commit." : "Clone the configured repository and check out the published commit.", commands: [repository.reproduce.clone, `cd ${source.directory}`, repository.reproduce.checkout].join("\n"), expected: `HEAD resolves to ${repository.source.commit.slice(0, 12)} and the worktree is clean.` },
    { title: "Verify the Vela binary", description: "Confirm both the release identity and the exact executable bytes.", commands: ["vela --version", "shasum -a 256 \"$(command -v vela)\""].join("\n"), expected: `${release.generator.vela_version}; SHA-256 ${binaryHash}.` },
    { title: "Replay the snapshot", description: "Run the pinned reproduction command without repairing or reinterpreting state.", commands: repository.reproduce.command, expected: `${repository.status.integrity.replay}; ${repository.status.integrity.blocker_count} retained strict blockers.` },
  ];
  return <PageShell archetype="default" layout="reading"><PageIntro title={`Reproduce ${repository.status.repository.name}`} description="Obtain the exact source, verify the released binary, and replay the published repository." actions={<StatusBadge tone="evidence">exact checkout</StatusBadge>} /><ItemGroup className="mt-6">{steps.map((step, index) => <Item key={step.title} variant="outline" className="min-w-0 items-start p-4"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-subtitle text-primary-foreground">{index + 1}</span><ItemContent className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><ItemTitle>{step.title}</ItemTitle><ItemDescription>{step.description}</ItemDescription></div><CopyButton value={step.commands} label={`Copy ${step.title.toLowerCase()} commands`} /></div><pre className="mt-3 w-full min-w-0 overflow-x-auto rounded-md bg-command p-4 text-meta leading-6 text-command-foreground"><code>{step.commands}</code></pre><p className="mt-2 text-meta text-muted-foreground"><strong className="text-foreground">Expected:</strong> {step.expected}</p></ItemContent></Item>)}</ItemGroup><section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Meaning of successful replay"><Item variant="muted" className="items-start"><HugeiconsIcon icon={CheckCircle2} aria-hidden className="mt-0.5 size-4 text-[var(--status-progress)]" /><ItemContent><ItemTitle>What success proves</ItemTitle><ItemDescription className="line-clamp-none">The pinned Git tree is available; the repository index matches its canonical records; strict checks match this release.</ItemDescription></ItemContent></Item><Item variant="muted" className="items-start"><HugeiconsIcon icon={ShieldAlert} aria-hidden className="mt-0.5 size-4 text-[var(--status-caution)]" /><ItemContent><ItemTitle>What success does not prove</ItemTitle><ItemDescription className="line-clamp-none">That a pending Claim is accepted, verifier output has scientific authority, or this commit is the freshest state.</ItemDescription></ItemContent></Item></section><Collapsible className="mt-8 rounded-lg border"><CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-compact font-medium">Exact source and roots <span className="text-meta text-muted-foreground">{6 + stateRoots.length} values</span></CollapsibleTrigger><CollapsibleContent className="border-t p-4"><dl className="grid gap-4 sm:grid-cols-2"><RootFact label="Remote" value={repository.source.remote} /><RootFact label="Commit" value={repository.source.commit} /><RootFact label="Tree" value={repository.source.tree} /><RootFact label="Vela" value={release.generator.vela_version} /><RootFact label="Binary root" value={release.generator.vela_binary_sha256} />{stateRoots.map((root) => <RootFact key={root.label} label={root.label} value={root.value} />)}<RootFact label="Published" value={repository.published_snapshot_at} /></dl></CollapsibleContent></Collapsible></PageShell>;
}
