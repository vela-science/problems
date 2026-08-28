import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicProfile } from "@/lib/hosted-account";
import type { PublicPerformerActivity } from "@/lib/performer-activity";
import { PublicPerformerProfile } from "./public-performer-profile";

/* A real Erdős 94 statement: five rendered lines, which is the length that
   exposed the clamp. */
const STATEMENT = "Suppose n points in R^2 determine a convex polygon and the set of distances between them is {u_1, …, u_k}. Suppose u_i appears as the distance between f(u_i) many pairs of points.";

const activity: PublicPerformerActivity[] = [{
  id: "role-1",
  role: "Result performer",
  performerId: "agent:submission-v3-cleanup",
  performerKind: "agent",
  performerDisplayName: null,
  occurredAt: "2026-08-18T18:37:00.000Z",
  problemHref: "/problems/erdos-problems/94",
  problemLabel: STATEMENT,
  collectionLabel: "Erdős Problems",
  objectHref: "/repositories/math/claims/claim-1",
  objectLabel: "For every finite planar point set P, the sum over its distinct determined distances of the unordered-pair distance multiplicities equals P.card.choose 2",
  state: "accepted",
  limitation: "Proved for the cubic case only.",
}];

const profile: PublicProfile = {
  id: "profile-1",
  handle: "ada",
  profileKind: "account",
  status: "active",
  displayName: "Ada Lovelace",
  bio: "Works on distance multiplicities.",
  affiliation: "Independent",
  visibility: "public",
  links: { github: "https://github.com/ada" },
  version: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
  handles: [],
  performers: [],
};

afterEach(cleanup);

describe("PublicPerformerProfile", () => {
  /* Every attributed identity in the record is a bare performer, and the page
     gave each one a 17rem rail built to hold a bio, an affiliation and links —
     none of which a performer has. The rail carried 172px of content in a
     272px column while the activity beside it clamped a five-line statement to
     two lines. The content is the page; the rail was furniture. */
  it("gives a performer with no profile a header, not an identity rail", () => {
    render(<PublicPerformerProfile profile={null} performer={{ id: "agent:submission-v3-cleanup", kind: "agent", name: "agent:submission-v3-cleanup" }} activity={activity} />);

    expect(screen.queryByRole("complementary", { name: "Contributor identity" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "agent:submission-v3-cleanup" })).toBeVisible();
    expect(screen.getByText("Agent or tool")).toBeVisible();
    expect(screen.getByText("Exact performer identity")).toBeVisible();
  });

  it("renders the whole statement and the whole Result rather than two lines of each", () => {
    render(<PublicPerformerProfile profile={null} performer={{ id: "agent:submission-v3-cleanup", kind: "agent", name: "agent:submission-v3-cleanup" }} activity={activity} />);

    const region = screen.getByRole("region", { name: "Public activity" });
    for (const node of region.querySelectorAll("*")) {
      expect(node.className.toString()).not.toMatch(/line-clamp/u);
    }
    expect(within(region).getByRole("link", { name: "Erdős Problems" })).toHaveAttribute("href", "/problems/erdos-problems/94");
    expect(within(region).getByText(/1 attributed role/u)).toBeVisible();
  });

  /* The rail is right when there is something to put in it. */
  it("keeps the identity rail for a hosted profile", () => {
    render(<PublicPerformerProfile profile={profile} performer={null} activity={[]} />);

    expect(screen.getByRole("complementary", { name: "Contributor identity" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText("Independent")).toBeVisible();
    expect(screen.getByText("Works on distance multiplicities.")).toBeVisible();
    expect(screen.getByRole("link", { name: /github/iu })).toHaveAttribute("href", "https://github.com/ada");
    /* No performer is linked, so there is no exact identity to disclose. */
    expect(screen.queryByText("Exact performer identity")).not.toBeInTheDocument();
    expect(screen.getByText("No linked public activity")).toBeVisible();
  });
});
