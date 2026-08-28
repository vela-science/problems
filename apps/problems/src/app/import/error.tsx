"use client";

import { RouteError } from "@/components/vela/route-error";

export default function ImportError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="The import view could not load."
    reading="This page reads the published release to describe an exact handoff."
    action={{ href: "/contribute", label: "Open contribute" }}
    archetype="reading"
    reset={reset}
  />;
}
