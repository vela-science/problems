import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type VelaPageArchetype =
  "default" | "problem" | "work" | "reading" | "history" | "data";
export type VelaPageLayout = "standard" | "reading" | "canvas";

/**
 * Canonical frame for every Vela product route. It owns the one responsive
 * gutter, content origin, maximum width, print reset, and quiet atmospheric
 * layer. Route components own only their scientific content and archetype.
 */
export function PageShell<T extends ElementType = "div">({
  as,
  archetype = "default",
  layout = "standard",
  className,
  ...props
}: {
  as?: T;
  archetype?: VelaPageArchetype;
  layout?: VelaPageLayout;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">) {
  const Component = as ?? "div";
  return (
    <Component
      className={cn("vela-page", className)}
      data-archetype={archetype}
      data-layout={layout}
      {...props}
    />
  );
}

export function PageHero({
  children,
  className,
  density = "default",
}: {
  children: ReactNode;
  className?: string;
  density?: "default" | "compact";
}) {
  return (
    <header
      className={cn("vela-page-hero", density === "compact" && "vela-page-hero-compact", className)}
      data-density={density}
    >
      {children}
    </header>
  );
}

export function PageSection({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={cn("vela-page-section", className)} {...props}>
      {children}
    </section>
  );
}

export function PageSectionHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("vela-page-section-head", className)}>{children}</div>
  );
}
