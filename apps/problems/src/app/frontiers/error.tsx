"use client";

import { RouteError } from "@/components/vela/route-error";

export default function FrontiersError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="The frontier view could not load."
    reading="A frontier is derived from the exact projection release, not from a stored summary."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="data"
    reset={reset}
  />;
}
