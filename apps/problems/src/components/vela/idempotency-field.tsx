"use client";

import { useEffect, useRef, useState } from "react";

/* One command, one key — per submit, not per render.
 *
 * This was a hidden input whose value a server component computed, so every
 * form on one page render shared one key per form for the page's lifetime. A
 * user who submitted twice without a reload replayed the first command: the
 * idempotency record answered with the original response and the second
 * change was silently not made.
 *
 * The server-rendered value stays as the no-JS fallback (one submit works;
 * a repeat replays, which is the safe direction). Once hydrated, the key is
 * fresh per mount and regenerates after every submit, so a deliberate second
 * submit is a second command. */
export function IdempotencyField() {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    /* After the submit is dispatched, not before — the in-flight command
       keeps the key it was submitted with. */
    const regenerate = () => setTimeout(() => setKey(crypto.randomUUID()), 0);
    form.addEventListener("submit", regenerate);
    return () => form.removeEventListener("submit", regenerate);
  }, []);
  return <input ref={input} type="hidden" name="idempotencyKey" value={key} readOnly suppressHydrationWarning />;
}
