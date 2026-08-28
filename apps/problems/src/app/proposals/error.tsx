"use client";

import { RouteError } from "@/components/vela/route-error";

export default function ProposalsError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="Proposed changes could not load."
    reading="A Proposal is a Repository-local record read from the exact projection."
    action={{ href: "/repositories", label: "Open Repositories" }}
    archetype="data"
    reset={reset}
  />;
}
