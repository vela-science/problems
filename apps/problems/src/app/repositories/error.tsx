"use client";

import { RouteError } from "@/components/vela/route-error";

export default function RepositoriesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="This Repository could not load."
    reading="A Repository view reads an exact projection release, and a root that has moved on underneath a cached view fails here."
    action={{ href: "/repositories", label: "Open Repositories" }}
    archetype="data"
    reset={reset}
  />;
}
