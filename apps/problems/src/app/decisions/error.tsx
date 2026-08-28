"use client";

import { RouteError } from "@/components/vela/route-error";

export default function DecisionsError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="Decisions could not load."
    reading="A Decision is Repository-local authority, read from the exact projection."
    action={{ href: "/repositories", label: "Open Repositories" }}
    archetype="history"
    reset={reset}
  />;
}
