import { RepositoryNotProjected } from "@/components/vela/repository-not-projected";
import { PageShell } from "@vela/ui/vela/page-shell";
import { RepositoryRouteName } from "./repository-route-scope";

export default function RepositoryNotFound() {
  return <PageShell archetype="default" layout="reading"><RepositoryNotProjected repository={<RepositoryRouteName />} /></PageShell>;
}
