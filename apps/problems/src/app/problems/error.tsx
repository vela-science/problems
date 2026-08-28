"use client";

import { RouteError } from "@/components/vela/route-error";

/* This surface reads an immutable projection release, so a root that has moved
   on underneath a cached view fails here rather than anywhere a reader can see. */
export default function ProblemsError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="This Problem could not load."
    reading="A Problem view reads an immutable projection release, and a root that has moved on underneath a cached view fails here."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="problem"
    reset={reset}
  />;
}
