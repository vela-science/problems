"use client";

import { RouteError } from "@/components/vela/route-error";

export default function CodebasesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="This codebase could not load."
    reading="A codebase reference is hosted activity bound to an exact Repository anchor."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="work"
    reset={reset}
  />;
}
