import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allRepositories, repositoryBySlug } from "@vela/projection-data";
import { Button } from "@vela/ui/components/button";
import { CopyButton } from "@vela/ui/vela/copy-button";
import { PageShell } from "@vela/ui/vela/page-shell";
import { RouteTitle } from "@/components/vela/route-title";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await allRepositories()).map((repository) => ({ slug: repository.slug }));
}

export async function generateMetadata({ params }: PageProps<"/repositories/[slug]/contribute">): Promise<Metadata> {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  return repository ? {
    title: `${repository.status.repository.name}: contribution handoff`,
    description: `Current source-owned contribution path for ${repository.status.repository.name}.`,
    alternates: { canonical: `/repositories/${slug}/contribute` },
  } : {};
}

export default async function RepositoryContribution({ params }: PageProps<"/repositories/[slug]/contribute">) {
  const { slug } = await params;
  const repository = await repositoryBySlug(slug);
  if (!repository) notFound();
  const action = repository.status.actions.work;

  return (
    <PageShell archetype="work" layout="reading">
      <RouteTitle title="Contribution handoff" scope={repository.status.repository.name} />
      <div className="mt-6 max-w-[70ch]">
        <h2 className="text-title">Submit bounded evidence from the native source</h2>
        <p className="mt-3 text-body text-muted-foreground">{action.note}</p>
        <p className="mt-3 text-meta text-muted-foreground">
          This is a contribution path, not a scientific priority ranking. A Submission and its
          Checks do not change Standing; only an authorized Repository Decision can do that.
        </p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-eyebrow uppercase text-muted-foreground">Exact local command</h3>
            <CopyButton value={action.command} label="Copy the submission command" />
          </div>
          <pre className="overflow-x-auto rounded-md bg-command p-3 text-micro leading-5 text-command-foreground"><code>{action.command}</code></pre>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href={`/repositories/${slug}/reproduce`} />}>
            Reproduce Repository state
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href={`/repositories/${slug}/proposals`} />}>
            Inspect proposed changes
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
