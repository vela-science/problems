import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NotificationCenter } from "@/components/vela/notification-center";

afterEach(cleanup);

describe("NotificationCenter", () => {
  it("reports a rooted empty Proposal queue without inventing unread state", async () => {
    render(<NotificationCenter repositories={[{ slug: "erdos", name: "Erdős", pending: 0 }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(await screen.findByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText("No Proposal needs attention")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open proposals" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open decisions" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument());
  });

  it("links pending Proposals to their Repository's Proposals", async () => {
    render(<NotificationCenter repositories={[
      { slug: "erdos", name: "Erdős", pending: 2 },
      { slug: "quantum-codes", name: "Quantum Codes", pending: 0 },
    ]} />);

    fireEvent.click(screen.getByRole("button", { name: "Notifications, 2 pending" }));

    expect(await screen.findByRole("link", { name: /Erdős/u })).toHaveAttribute("href", "/repositories/erdos/proposals");
    expect(screen.getByText("2 pending Proposals require a Decision.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Quantum Codes/u })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument());
  });
});
