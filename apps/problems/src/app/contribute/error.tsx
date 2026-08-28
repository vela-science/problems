"use client";

import { RouteError } from "@/components/vela/route-error";

export default function ContributeError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="The contribution guide could not load."
    reading="This page reads the published release to name what a Repository will accept."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="reading"
    reset={reset}
  />;
}
