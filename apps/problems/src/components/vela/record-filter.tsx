"use client";

import { Field, FieldLabel } from "@vela/ui/components/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@vela/ui/components/select";
import { kindLabel, stateOptionGroups } from "@/lib/product-language";

/* One select over one projection column, for both controllers that read those
 * columns.
 *
 * Search and the graph each had a private `Filter` with the same signature and
 * a byte-identical option renderer, so the kind-label rule and the axis
 * grouping had two homes — and had already drifted: one printed the escape
 * hatch as the bare word `all`, the other as "All kinds". They read the same
 * columns, so they now read one control.
 *
 * `all` is an option like any other, present only where a caller offers it: the
 * graph's Repository filter deliberately has no all, because the map is drawn for
 * one Repository at a time.
 *
 * A cleared selection is ignored rather than re-applied. Re-applying the value
 * pushed a navigation that changed nothing. */
export function RecordFilter({
  label,
  value,
  values,
  onChange,
  variant = "bar",
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
  /** `bar` is a compact trigger in a filter row; `field` carries its own label. */
  variant?: "bar" | "field";
}) {
  const option = (item: string) => (
    <SelectItem key={item} value={item}>
      {optionLabel(label, item)}
    </SelectItem>
  );
  const rest = values.filter((item) => item !== "all");
  const select = (
    <Select value={value} onValueChange={(next) => { if (next) onChange(next); }}>
      <SelectTrigger
        aria-label={variant === "bar" ? `Filter by ${label.toLowerCase()}` : label}
        size={variant === "bar" ? "sm" : undefined}
        className={variant === "bar" ? "w-36" : "w-full min-w-40"}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent align="start">
        {values.includes("all") ? option("all") : null}
        {label === "State"
          ? stateOptionGroups(rest).map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.values.map(option)}
              </SelectGroup>
            ))
          : rest.map(option)}
      </SelectContent>
    </Select>
  );
  return variant === "field" ? <Field><FieldLabel>{label}</FieldLabel>{select}</Field> : select;
}

function optionLabel(label: string, item: string): string {
  if (item === "all") return `All ${label.toLowerCase()}s`;
  return label === "Kind" ? kindLabel(item) : item.replaceAll("_", " ");
}
