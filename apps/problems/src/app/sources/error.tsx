"use client";

import { RouteError } from "@/components/vela/route-error";

export default function SourcesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="This source could not load."
    reading="A source record is read from the exact projection, and reports what its own observation retained."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="reading"
    reset={reset}
  />;
}
