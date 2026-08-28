"use client";

import { RouteError } from "@/components/vela/route-error";

export default function WorkspacesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="Workspaces could not load."
    reading="A shared workspace is hosted activity and is never scientific state."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="work"
    reset={reset}
  />;
}
