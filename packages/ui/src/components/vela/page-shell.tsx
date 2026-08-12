import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../../lib/utils";
import styles from "./page-shell.module.css";

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
      className={cn("vela-page", styles.page, className)}
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
      className={cn(
        "vela-page-hero",
        styles.hero,
        density === "compact" && ["vela-page-hero-compact", styles.heroCompact],
        className,
      )}
      data-density={density}
    >
      {children}
    </header>
  );
}

export function PageSection<T extends ElementType = "section">({
  as,
  children,
  className,
  ...props
}: { as?: T; children: ReactNode; className?: string } & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">) {
  const Component = as ?? "section";
  return (
    <Component className={cn("vela-page-section", styles.section, className)} {...props}>
      {children}
    </Component>
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
    <div className={cn("vela-page-section-head", styles.sectionHead, className)}>{children}</div>
  );
}
