"use client";

import { useEffect, useState } from "react";
import { ComputerIcon as System, ContrastIcon as Contrast, Moon01Icon as Moon, Sun01Icon as Sun } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@vela/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@vela/ui/components/dropdown-menu";
import { cn } from "@vela/ui/lib/utils";

/* Three choices, and `system` is the absence of a stored one rather than a third
   stored value, so the boot script in `layout.tsx` needs no vocabulary beyond
   the two grounds it can paint. */
type Choice = "system" | "dark" | "light";
export const VELA_CONTRAST_STORAGE_KEY = "vela-contrast";

const systemPrefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export function applyTheme(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && systemPrefersDark());
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.classList.toggle("dark", dark);
  if (choice === "system") localStorage.removeItem("vela-theme");
  else localStorage.setItem("vela-theme", choice);
}

export function applyContrast(high: boolean) {
  document.documentElement.dataset.contrast = high ? "high" : "standard";
  if (high) localStorage.setItem(VELA_CONTRAST_STORAGE_KEY, "high");
  else localStorage.removeItem(VELA_CONTRAST_STORAGE_KEY);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = useState<Choice>("system");
  const [dark, setDark] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const stored = localStorage.getItem("vela-theme");
      setChoice(stored === "light" || stored === "dark" ? stored : "system");
      setDark(document.documentElement.dataset.theme === "dark");
      setHighContrast(document.documentElement.dataset.contrast === "high");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  /* While the choice is `system` the ground has to follow the machine changing
     its mind, not only the page loading. */
  useEffect(() => {
    if (choice !== "system") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { applyTheme("system"); setDark(query.matches); };
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [choice]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className={cn(className)} aria-label="Choose appearance" />}>
        {dark ? <HugeiconsIcon icon={Moon} aria-hidden /> : <HugeiconsIcon icon={Sun} aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={choice}
          onValueChange={(value) => {
            const next = value as Choice;
            setChoice(next);
            applyTheme(next);
            setDark(next === "dark" || (next === "system" && systemPrefersDark()));
          }}
        >
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioItem value="system"><HugeiconsIcon icon={System} aria-hidden />System</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light"><HugeiconsIcon icon={Sun} aria-hidden />Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><HugeiconsIcon icon={Moon} aria-hidden />Dark</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={highContrast}
          onCheckedChange={(checked) => {
            const next = checked === true;
            setHighContrast(next);
            applyContrast(next);
          }}
        >
          <HugeiconsIcon icon={Contrast} aria-hidden />
          High contrast
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
