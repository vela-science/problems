import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const status = vi.hoisted(() => ({ pending: false }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => status,
}));

import { ImportError, ImportSubmit } from "./import-feedback";

/* Every failure on this route arrives as a redirect to `/import?error=…`, so
   the message is in the parsed HTML of a new document. A live region only
   announces what changes after it is already in the accessibility tree, which
   means `role="alert"` alone announced nothing at all here. Focus is what
   carries it. */
describe("import feedback", () => {
  it("takes focus to the error, because a redirect will not announce one", () => {
    render(<ImportError message="Manual URL import is limited to public GitHub repositories." />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("limited to public GitHub repositories");
    expect(alert).toHaveFocus();
    /* Reachable by script, never a stop on the way through the form. */
    expect(alert).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the status region mounted while it has nothing to say", () => {
    status.pending = false;
    render(<ImportSubmit pending="Inspecting">Inspect public codebase</ImportSubmit>);

    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Inspect public codebase" })).toBeEnabled();
  });

  it("disarms the control and says what is happening while the action runs", () => {
    status.pending = true;
    render(<ImportSubmit pending="Inspecting">Inspect public codebase</ImportSubmit>);

    expect(screen.getByRole("button", { name: "Inspecting" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Reading the pinned revision from GitHub");
    status.pending = false;
  });

  /* The signed-out page submits `<form action="/inspect" method="get">`, a plain
     browser navigation. `useFormStatus` only reports forms React dispatched, so
     it stays false there for the whole ~25s round trip — on the one path a
     signed-out reader has. The form's own submit event is what covers it. */
  it("reports a plain GET navigation, which useFormStatus cannot see", () => {
    status.pending = false;
    render(
      <form action="/inspect" method="get">
        <ImportSubmit pending="Inspecting">Inspect public codebase</ImportSubmit>
      </form>,
    );

    expect(screen.getByRole("button", { name: "Inspect public codebase" })).toBeEnabled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    const form = document.querySelector("form")!;
    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(screen.getByRole("button", { name: "Inspecting" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Reading the pinned revision from GitHub");
  });
});
