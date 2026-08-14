import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repository = join(import.meta.dir, "../../..");
const releaseNotes = join(repository, "docs/releases");

/* The version this repository publishes, from the one file that decides it.
   `docs/releases/README.md` names the same field, so the note's filename and
   the version are one fact rather than two that agree by habit. */
function publishedVersion(): string {
  const manifest = JSON.parse(readFileSync(join(repository, "package.json"), "utf8"));
  return manifest.version as string;
}

describe("release notes", () => {
  /* Thirty-six notes existed with no document describing the practice and no
     gate maintaining it. They were current, which is exactly why it was worth
     catching: nothing here was broken, and nothing would have said so the first
     time a version bump shipped without one. The requirement is cheap at
     exactly one moment — the person bumping the version is the person who knows
     what changed — and free to forget at every other. */
  test("the published version has a note", () => {
    const version = publishedVersion();
    const notes = readdirSync(releaseNotes).filter((name) => name.startsWith("v"));
    expect(
      notes,
      `package.json is ${version}; write docs/releases/v${version}.md before bumping it`,
    ).toContain(`v${version}.md`);
  });

  /* A note whose name is not a version is a note nothing can find. */
  test("every note is named for a version", () => {
    const misnamed = readdirSync(releaseNotes)
      .filter((name) => name.endsWith(".md") && name !== "README.md")
      .filter((name) => !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.md$/u.test(name));
    expect(misnamed).toEqual([]);
  });

  /* The page that says what these are. Without it the directory is what it was:
     a practice carried entirely in whoever remembered it. */
  test("the practice is written down beside the notes", () => {
    const readme = readFileSync(join(releaseNotes, "README.md"), "utf8");
    expect(readme).toContain("package.json");
  });
});
