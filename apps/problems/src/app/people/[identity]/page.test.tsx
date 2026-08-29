import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { performerProfileSegment } from "@/lib/performer-route";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  account: null as null | { activity: { id: string } },
  profileByHandle: vi.fn(),
  profileForPerformer: vi.fn(),
  activity: vi.fn(),
  redirect: vi.fn((href: string) => { throw new Error(`REDIRECT ${href}`); }),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: mocks.redirect,
  notFound: mocks.notFound,
}));
vi.mock("@/lib/hosted-account", () => ({
  currentActivityAccount: () => Promise.resolve(mocks.account),
  profileByHandle: mocks.profileByHandle,
  profileForPerformer: mocks.profileForPerformer,
}));
vi.mock("@/lib/performer-activity", () => ({ performerActivity: mocks.activity }));

import ContributorProfilePage, { generateMetadata } from "./page";

const profile = {
  id: "profile-1",
  handle: "ada-lovelace",
  requestedHandle: "ada-lovelace",
  redirect: false,
  ownerPreview: false,
  profileKind: "account" as const,
  status: "active" as const,
  displayName: "Ada Lovelace",
  bio: "Works on exact scientific computation.",
  affiliation: "Analytical Engine Institute",
  visibility: "public" as const,
  links: {},
  version: 1,
  createdAt: "2026-08-17T00:00:00Z",
  updatedAt: "2026-08-17T00:00:00Z",
  handles: [],
  performers: [],
};

beforeEach(() => {
  mocks.account = null;
  mocks.profileByHandle.mockReset().mockResolvedValue(null);
  mocks.profileForPerformer.mockReset().mockResolvedValue(null);
  mocks.activity.mockReset().mockResolvedValue([]);
  mocks.redirect.mockClear();
  mocks.notFound.mockClear();
});

describe("Contributor profile route", () => {
  it("renders a public account profile without exposing account data", async () => {
    mocks.profileByHandle.mockResolvedValue({
      ...profile,
      performers: [{ performerId: "agent:linked", performerKind: "agent", verificationKind: "signed_record", evidenceLocator: "https://example.test/evidence", createdAt: "2026-08-17T00:00:00Z" }],
    });
    render(await ContributorProfilePage({ params: Promise.resolve({ identity: profile.handle }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeVisible();
    expect(screen.getByText("Contributor profile")).toBeVisible();
    expect(screen.queryByText("Agent or tool")).toBeNull();
    expect(screen.queryByText(/WorkOS|email|session/iu)).toBeNull();
    await expect(generateMetadata({ params: Promise.resolve({ identity: profile.handle }) })).resolves.toMatchObject({ robots: { index: true, follow: true } });
  });

  it("allows only the owner to preview a private profile", async () => {
    mocks.account = { activity: { id: "account-1" } };
    mocks.profileByHandle.mockResolvedValue({ ...profile, visibility: "private", ownerPreview: true });
    render(await ContributorProfilePage({ params: Promise.resolve({ identity: profile.handle }) }));
    expect(screen.getByText("Private preview")).toBeVisible();
    await expect(generateMetadata({ params: Promise.resolve({ identity: profile.handle }) })).resolves.toMatchObject({ robots: { index: false, follow: false } });
  });

  it("keeps a hidden or unknown handle unavailable", async () => {
    await expect(ContributorProfilePage({ params: Promise.resolve({ identity: "hidden-person" }) })).rejects.toThrow("NOT_FOUND");
  });

  it("permanently redirects rename history and exact performer links", async () => {
    mocks.profileByHandle.mockResolvedValue({ ...profile, requestedHandle: "ada-old", redirect: true });
    await expect(ContributorProfilePage({ params: Promise.resolve({ identity: "ada-old" }) })).rejects.toThrow("REDIRECT /people/ada-lovelace");

    mocks.profileByHandle.mockResolvedValue(null);
    mocks.profileForPerformer.mockResolvedValue(profile);
    const identity = performerProfileSegment("agent:reviewer");
    await expect(ContributorProfilePage({ params: Promise.resolve({ identity }) })).rejects.toThrow("REDIRECT /people/ada-lovelace");
  });

  it("keeps exact performer attribution readable when profile storage is unavailable", async () => {
    const identity = performerProfileSegment("agent:reviewer");
    mocks.profileForPerformer.mockRejectedValue(new Error("activity unavailable"));
    mocks.activity.mockResolvedValue([{
      id: "proposal-1:check:1",
      role: "Advisory check",
      performerId: "agent:reviewer",
      performerKind: "agent",
      performerDisplayName: "Review model",
      occurredAt: "2026-08-17T10:30:00Z",
      problemHref: "/problems/erdos-problems/321",
      problemLabel: "How large can the reciprocal-sum-free set be?",
      collectionLabel: "Erdős Problems",
      objectHref: "/repositories/math/proposals/proposal-1",
      objectLabel: "claim chain fidelity",
      state: "pass",
      limitation: "Mathematical truth.",
    }]);
    render(await ContributorProfilePage({ params: Promise.resolve({ identity }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Review model" })).toBeVisible();
    /* The role used to be an outline badge above the row. It is now the row's
       own headline, because a profile's rows differ by what the performer did
       and every one of them opened with the same Problem statement instead. */
    expect(screen.getByText("Ran an advisory check")).toBeVisible();
    expect(screen.getByText("Checks")).toBeVisible();
    expect(screen.getByText("Role scope")).toBeVisible();
    expect(screen.getByText("Mathematical truth.")).toBeInTheDocument();
  });
});
