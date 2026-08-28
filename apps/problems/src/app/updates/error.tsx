"use client";

import { RouteError } from "@/components/vela/route-error";

export default function UpdatesError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="Updates could not load."
    reading="This timeline reads recorded Repository history, not a feed."
    action={{ href: "/problems", label: "Open Problems" }}
    archetype="history"
    reset={reset}
  />;
}
