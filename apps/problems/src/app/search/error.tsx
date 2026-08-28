"use client";

import { RouteError } from "@/components/vela/route-error";

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return <RouteError
    title="This search could not run."
    reading="Search reads the exact projection index rather than a cached summary."
    action={{ href: "/problems", label: "Browse Problems" }}
    archetype="default"
    reset={reset}
  />;
}
