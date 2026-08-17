import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/auth", () => ({ signOutAccount: vi.fn() }));

import { AccountMenu } from "@/components/vela/account-menu";
import { AccountStateProvider } from "@/components/vela/account-state";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function accountResponse(value: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })));
}

function renderAccountMenu(enabled = true, key?: string) {
  return render(<AccountStateProvider enabled={enabled} key={key}><AccountMenu /></AccountStateProvider>);
}

describe("AccountMenu", () => {
  it("offers sign in only after the server reports configured authentication", async () => {
    accountResponse({ status: "signed_out" });
    renderAccountMenu();
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("shows a minimal signed-in account menu", async () => {
    const user = userEvent.setup();
    const requestSubmit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
    accountResponse({
      status: "signed_in",
      account: { displayName: "Ada Lovelace", email: "ada@example.org", initials: "AL" },
    });
    renderAccountMenu();

    await user.click(await screen.findByRole("button", { name: "Open account menu for Ada Lovelace" }));
    expect(await screen.findByText("ada@example.org")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "My work" })).toHaveAttribute("href", "/my-work");
    expect(screen.getByRole("menuitem", { name: "Account" })).toHaveAttribute("href", "/account");
    const signOut = screen.getByRole("menuitem", { name: "Sign out" });
    expect(signOut).toHaveAttribute("type", "button");
    expect(signOut.closest("form")).toBeNull();
    expect(document.querySelector("#vela-account-sign-out")).toHaveAttribute("action");
    fireEvent.click(signOut);
    expect(requestSubmit).toHaveBeenCalledOnce();
  });

  it("does not expose a broken control when auth is unavailable or malformed", async () => {
    accountResponse({ status: "unavailable" });
    const { rerender } = renderAccountMenu();
    await waitFor(() => expect(screen.queryByLabelText("Loading account")).not.toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();

    accountResponse({ status: "signed_in", account: { email: "missing fields" } });
    rerender(<AccountStateProvider enabled key="invalid"><AccountMenu /></AccountStateProvider>);
    await waitFor(() => expect(screen.queryByLabelText("Loading account")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Open account menu/u })).not.toBeInTheDocument();
  });

  it("does not fetch or render account controls in an unconfigured release", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderAccountMenu(false);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Loading account")).not.toBeInTheDocument();
  });
});
