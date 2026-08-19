import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/*
  Vendor the wire schemas this workspace reads, at the pinned release commit.

  Each schema is declared once, upstream, generated from the Rust type that
  emits it. A package then declares it a second time — projection-data holds
  `vela.status.v4` as a zod schema, activity-data validates submission drafts
  against `vela.submission.v3` — because a document arriving over the wire has
  to be parsed before anything reads it. Two declarations of one document is a
  drift hazard and there was nothing holding them together: upstream could
  rename a field and the only thing that would notice was a projection refresh
  failing in CI, after the release.

  So the upstream declarations are vendored here, and each package's tests hold
  its local declaration to its vendored copy — every field upstream requires
  must be one the package refuses to go without.

  The source of truth is one commit, the one in
  projection-data/config/vela-release.v1.json, and the working tree is never
  read. Run it when the pin moves:

    bun packages/projection-data/scripts/sync-vela-schemas.mjs

  Point it at a clone with VELA_SOURCE_ROOT if yours is not at ~/personal/vela.
*/

const packagesRoot = resolve(import.meta.dirname, "../..");
const source = process.env.VELA_SOURCE_ROOT ?? resolve(process.env.HOME ?? "", "personal/vela");

/* Only what each package parses. A schema vendored and never read is a file
   that rots quietly; these are the documents that cross this boundary today. */
const VENDORINGS = [
  {
    package: "projection-data",
    schemas: [{ upstream: "schemas/status.schema.json", file: "vela-status-v4.schema.json" }],
  },
  {
    package: "activity-data",
    schemas: [{ upstream: "schemas/submission.schema.json", file: "submission.schema.json" }],
  },
];

const release = JSON.parse(
  await readFile(resolve(packagesRoot, "projection-data/config/vela-release.v1.json"), "utf8"),
);
const pin = release.commit;

const git = (...args) => execFileSync("git", ["-C", source, ...args], { encoding: "utf8" });

if (!existsSync(resolve(source, ".git"))) {
  throw new Error(`no Vela checkout at ${source} (set VELA_SOURCE_ROOT)`);
}
try {
  git("cat-file", "-e", `${pin}^{commit}`);
} catch {
  throw new Error(`${source} does not contain the pinned commit ${pin}. Fetch it: git -C ${source} fetch origin`);
}

const manifests = [];
for (const vendoring of VENDORINGS) {
  const packageRoot = resolve(packagesRoot, vendoring.package);
  const written = [];
  for (const { upstream, file } of vendoring.schemas) {
    let body;
    try {
      body = git("show", `${pin}:${upstream}`);
    } catch {
      throw new Error(`${upstream} is not present at ${pin}; update VENDORINGS in this script`);
    }
    /* Re-serialised rather than copied, so the vendored file is the parsed
       document and a malformed one fails here instead of in a test. */
    const parsed = JSON.parse(body);
    const text = `${JSON.stringify(parsed, null, 2)}\n`;
    await writeFile(resolve(packageRoot, "config", file), text);
    written.push({
      file,
      upstream,
      id: parsed.$id ?? null,
      sha256: `sha256:${createHash("sha256").update(text).digest("hex")}`,
    });
  }

  /*
    A vendored file carries no stamp of its own, so the commit it came from
    lives beside it, in the vendoring package. Each package's tests hold their
    manifest to `vela-release.v1.json`: a pin that moves without a re-sync
    fails there rather than shipping a reader checked against a schema the
    advertised release no longer publishes. The docs vendoring next door has
    the same guard for the same reason.
  */
  const manifest = {
    schema: "site.vela-schemas.v1",
    vela_version: release.version,
    vela_tag: release.tag,
    vela_commit: pin,
    files: written,
  };
  await writeFile(
    resolve(packageRoot, "config/vela-schemas.v1.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  manifests.push({ package: vendoring.package, ...manifest });
}

console.log(JSON.stringify({ ok: true, schema: "vela.schema-sync.v1", from: source, manifests }));
