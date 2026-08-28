"use client";

import { RouteError } from "@/components/vela/route-error";

export default function GraphError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="The research map could not load."
    reading="The map draws only retained relationships, read from the exact projection."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="data"
    reset={reset}
  />;
}
