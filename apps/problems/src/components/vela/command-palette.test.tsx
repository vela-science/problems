import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/repositories/formal-conjectures", push: vi.fn() }));
const search = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("@/lib/search-index", () => ({ loadSearchIndex: search.load }));
vi.mock("@vela/ui/components/command", () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandDialog: ({ children, open, onOpenChange, onOpenChangeComplete }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void; onOpenChangeComplete: (open: boolean) => void }) => <div data-testid="command-dialog-root" data-open={open}>{open ? <div role="dialog">{children}<button type="button" onClick={() => { onOpenChange(false); onOpenChangeComplete(false); }}>Close palette</button></div> : null}</div>,
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading: string }) => <section aria-label={heading}>{children}</section>,
  CommandInput: ({ onValueChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { onValueChange: (value: string) => void }) => <input {...props} onChange={(event) => onValueChange(event.currentTarget.value)} />,
  CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) => <button type="button" onClick={onSelect}>{children}</button>,
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandSeparator: () => <hr />,
  CommandShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { COMMAND_PALETTE_TRIGGER_ID, CommandPaletteProvider, PRODUCT_DOCS_URL, useCommandPalette } from "@/components/vela/command-palette";

const proposalId = "vpr_7aba66544ffefd99";
const projectionRoot = `sha256:${"7".repeat(64)}`;
const repositories = [{ slug: "formal-conjectures", name: "Formal Conjectures", pending: 0, hasGraph: true, hasProblems: true }];

function OpenPalette() {
  const { setOpen } = useCommandPalette();
  return <button id={COMMAND_PALETTE_TRIGGER_ID} type="button" onClick={() => setOpen(true)}>Open palette</button>;
}

beforeEach(() => {
  navigation.push.mockReset();
  search.load.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("CommandPaletteProvider exact record search", () => {
  it("points product documentation at the canonical documentation host", () => {
    expect(PRODUCT_DOCS_URL).toBe("https://github.com/vela-science/vela/tree/main/docs");
  });

  it("keeps the dialog root mounted and returns focus after Base UI completes close", () => {
    render(<CommandPaletteProvider repositories={repositories} projectionRoot={projectionRoot}><OpenPalette /></CommandPaletteProvider>);
    const trigger = screen.getByRole("button", { name: "Open palette" });

    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close palette" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("command-dialog-root")).toHaveAttribute("data-open", "false");
    expect(trigger).toHaveFocus();
  });

  it("uses current display language while retaining the published target routes", () => {
    render(<CommandPaletteProvider repositories={repositories} projectionRoot={projectionRoot}><OpenPalette /></CommandPaletteProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Open palette" }));

    const targets = screen.getAllByRole("button", { name: "Contribution handoff" });
    expect(targets).toHaveLength(1);
    expect(screen.queryByText("Workflow")).not.toBeInTheDocument();
    expect(screen.queryByText("Inspect")).not.toBeInTheDocument();
    fireEvent.click(targets[0]!);
    expect(navigation.push).toHaveBeenCalledWith("/repositories/formal-conjectures/contribute");
  });

  it("queries the root-bound endpoint and opens an exact proposal result", async () => {
    search.load.mockResolvedValue({
      schema: "site.search-index.v1",
      bundle_root: projectionRoot,
      generated_at: "2026-08-03T00:00:00Z",
      records: [{
        id: proposalId,
        kind: "proposal",
        repository: "formal-conjectures",
        standing: "accepted",
        assertion: "Retain the exact foreign-reference package.",
        href: `/repositories/formal-conjectures/proposals/${proposalId}`,
      }],
    });

    render(<CommandPaletteProvider repositories={repositories} projectionRoot={projectionRoot}><OpenPalette /></CommandPaletteProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Open palette" }));
    fireEvent.change(screen.getByPlaceholderText("Search Problems, Assertions, and sources…"), { target: { value: proposalId } });

    await waitFor(() => expect(search.load).toHaveBeenCalledWith(projectionRoot, { q: proposalId }));
    const resultLabel = await screen.findByText(`${proposalId} · Retain the exact foreign-reference package.`);
    const result = resultLabel.closest("button");
    expect(result).not.toBeNull();
    fireEvent.click(result!);
    expect(navigation.push).toHaveBeenCalledWith(`/repositories/formal-conjectures/proposals/${proposalId}`);
  });

  it("keeps a query-addressed full-search path when the palette finds no record", async () => {
    search.load.mockResolvedValue({ schema: "site.search-index.v1", bundle_root: projectionRoot, generated_at: "2026-08-03T00:00:00Z", records: [] });

    render(<CommandPaletteProvider repositories={repositories} projectionRoot={projectionRoot}><OpenPalette /></CommandPaletteProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Open palette" }));
    fireEvent.change(screen.getByPlaceholderText("Search Problems, Assertions, and sources…"), { target: { value: "unknown-record" } });

    expect(await screen.findByText("No exact published record matches.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open full search for “unknown-record”" }));
    expect(navigation.push).toHaveBeenCalledWith("/search?q=unknown-record");
  });
});

/* ⌘K was the only key the product answered to, so these are the first
   shortcuts that can collide with typing. Every case below is about the
   collision rather than about the navigation. */
describe("CommandPaletteProvider keyboard shortcuts", () => {
  const mount = () =>
    render(<CommandPaletteProvider repositories={repositories} projectionRoot={projectionRoot}><OpenPalette /></CommandPaletteProvider>);

  it("jumps on a g prefix followed by a destination key", () => {
    mount();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "p" });
    expect(navigation.push).toHaveBeenCalledWith("/problems");
  });

  /* A prefix that never expires swallows the next keystroke a reader makes
     minutes later, so `g` alone must leave nothing armed. */
  it("forgets the prefix after the window closes", () => {
    vi.useFakeTimers();
    mount();
    fireEvent.keyDown(window, { key: "g" });
    vi.advanceTimersByTime(2000);
    fireEvent.keyDown(window, { key: "p" });
    expect(navigation.push).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  /* The whole reason single-letter shortcuts are risky: a `g` in a query is a
     letter, and `/` in one is a path separator. */
  it("never fires while a field has focus", () => {
    mount();
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();

    for (const key of ["g", "p", "/", "?"]) fireEvent.keyDown(field, { key });

    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    field.remove();
  });

  it("opens search on / and the shortcut sheet on ?", () => {
    mount();
    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    cleanup();
    mount();
    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
  });

  /* A modifier chord belongs to the browser or the OS, not to a single-letter
     binding that happens to share the letter. */
  it("leaves a modified key to the platform", () => {
    mount();
    fireEvent.keyDown(window, { key: "g", metaKey: true });
    fireEvent.keyDown(window, { key: "p" });
    expect(navigation.push).not.toHaveBeenCalled();
  });
});
