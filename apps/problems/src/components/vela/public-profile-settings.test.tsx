import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/profile", () => ({
  savePublicProfileAction: vi.fn(async (state: unknown) => state),
}));

import { PublicProfileSettings } from "./public-profile-settings";

describe("PublicProfileSettings", () => {
  it("does not claim a save occurred on a fresh private form", () => {
    render(<PublicProfileSettings profile={null} accountName="Ada Lovelace" />);
    /* The heading here restated the page's own h1 and the card it sat in was
       the only card among the three /account pages. The region keeps the
       accessible name; the visible state is the published address, or its
       absence. */
    expect(screen.getByRole("region", { name: "Public contributor profile" })).toBeVisible();
    expect(screen.getByText("Not created")).toBeVisible();
    expect(screen.queryByRole("link", { name: /Preview/u })).toBeNull();
    expect(screen.queryByText("Profile saved")).toBeNull();
    expect(screen.getByRole("radio", { name: /Private/iu })).toBeChecked();
  });
});
