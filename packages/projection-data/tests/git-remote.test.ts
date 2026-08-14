import { describe, expect, test } from "bun:test";
import { canonicalGitHubRepository, sameRepositoryLocator } from "../src/git-remote";
import { repositoryCheckoutCommand, repositoryRegistry } from "../src/registry";

describe("canonical GitHub repository identity", () => {
  test("accepts equivalent HTTPS and SSH transports", () => {
    const expected = "vela-science/erdos-frontier";
    expect(
      canonicalGitHubRepository("https://github.com/vela-science/erdos-frontier.git"),
    ).toBe(expected);
    expect(
      canonicalGitHubRepository("https://github.com/vela-science/erdos-frontier"),
    ).toBe(expected);
    expect(canonicalGitHubRepository("git@github.com:vela-science/erdos-frontier.git")).toBe(
      expected,
    );
    expect(
      canonicalGitHubRepository("ssh://git@github.com/vela-science/erdos-frontier.git"),
    ).toBe(expected);
  });

  test("rejects credentials, lookalike hosts, and non-GitHub remotes", () => {
    expect(
      canonicalGitHubRepository(
        "https://token@github.com/vela-science/erdos-frontier.git",
      ),
    ).toBeNull();
    expect(
      canonicalGitHubRepository("https://github.example/vela-science/erdos-frontier.git"),
    ).toBeNull();
    expect(
      canonicalGitHubRepository("https://gitlab.com/vela-science/erdos-frontier.git"),
    ).toBeNull();
  });
});

describe("public canonical Repository access", () => {
  test("declares one public Math locator and anonymous checkout recipe", () => {
    const math = repositoryRegistry.repositories.find(({ slug }) => slug === "math");
    expect(math).toBeDefined();
    expect(math?.access).toBe("public");
    expect(math?.remotes).toEqual(["https://github.com/vela-science/math.git"]);
    expect(JSON.stringify(repositoryRegistry)).not.toContain("codeberg.org/vela-science/math");
    expect(repositoryCheckoutCommand(math!)).toBe(
      "git clone https://github.com/vela-science/math.git",
    );
  });
});

/* A declared alternate locator has to be usable, not merely declarable.
 *
 * `projection-builder.mjs` asserts a checkout's `origin` against the registry
 * before it will build from it. The schema still permits an operator to declare
 * several exact locators for an access-compatible source, and the builder must
 * accept any declared entry without treating all non-GitHub hosts as equal.
 *
 * This exercises the builder's generic predicate directly rather than adding a
 * live alternate to the canonical Math registry. */
describe("a checkout is accepted from any declared locator", () => {
  /* The builder's own predicate, imported rather than restated. Writing the
     comparison out here is what hid the defect this test found: composed from
     `canonicalGitHubRepository` alone it returns `null === null` for any two
     non-GitHub URLs, so it called every unknown host the same repository —
     wrong in exactly the case a mirror exists for. */
  const accepts = (origin: string, remotes: string[]) => remotes.some(
    (locator) => sameRepositoryLocator(origin, locator),
  );
  const declared = [
    "https://github.com/example/private-source.git",
    "https://mirror.example/example/private-source.git",
  ];

  test("takes the primary locator", () => {
    expect(accepts("https://github.com/example/private-source.git", declared)).toBe(true);
    expect(accepts("git@github.com:example/private-source.git", declared)).toBe(true);
  });

  test("takes a declared alternate on another host", () => {
    expect(accepts("https://mirror.example/example/private-source.git", declared)).toBe(true);
  });

  test("still refuses a repository nobody declared", () => {
    expect(accepts("https://github.com/example/different-source.git", declared)).toBe(false);
    /* Another host entirely. This is the case that failed while the comparison
       went through the GitHub canonicaliser alone. */
    expect(accepts("https://example.invalid/someone/private-source.git", declared)).toBe(false);
    expect(accepts("https://mirror.example/someone-else/private-source.git", declared)).toBe(false);
  });

  /* An alternate is reachable over either transport, like the primary. */
  test("takes a declared alternate over SSH", () => {
    expect(accepts("git@mirror.example:example/private-source.git", declared)).toBe(true);
  });

  /* The single-locator case is the one that shipped, and it must keep refusing
     everything it refused before. */
  test("refuses a mirror that was never declared", () => {
    const one = ["https://github.com/example/private-source.git"];
    expect(accepts("https://mirror.example/example/private-source.git", one)).toBe(false);
  });
});
