import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/profile", () => ({
  savePublicProfileAction: vi.fn(async (state: unknown) => state),
}));

import { PublicProfileSettings } from "./public-profile-settings";

describe("PublicProfileSettings", () => {
  it("does not claim a save occurred on a fresh private form", () => {
    render(<PublicProfileSettings profile={null} accountName="Ada Lovelace" />);
    expect(screen.getByRole("heading", { name: "Public contributor profile" })).toBeVisible();
    expect(screen.queryByText("Profile saved")).toBeNull();
    expect(screen.getByRole("radio", { name: /Private/iu })).toBeChecked();
  });
});
