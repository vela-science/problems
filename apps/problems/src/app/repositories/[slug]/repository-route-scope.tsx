"use client";

import { createContext, useContext, type ReactNode } from "react";

const RepositorySlugContext = createContext<string | null>(null);

export function RepositoryRouteScope({ children, slug }: { children: ReactNode; slug: string }) {
  return <RepositorySlugContext value={slug}>{children}</RepositorySlugContext>;
}

export function useRepositoryRouteSlug(): string {
  const slug = useContext(RepositorySlugContext);
  if (!slug) throw new Error("Repository route scope is missing its exact slug");
  return slug;
}

export function RepositoryRouteName() {
  return useRepositoryRouteSlug();
}
