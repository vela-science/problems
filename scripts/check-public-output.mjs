#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { filesBelow } from "./fs.mjs";

const deliveredExtensions = /\.(?:body|html|js|json|meta|rsc|txt)$/u;
const commonRules = [
  ["PostgreSQL connection string", /postgres(?:ql)?:\/\/[^\s"'<>\\]+/giu],
  ["private key material", /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/gu],
  ["hosted API secret", /\bsk_(?:live|test)_[A-Za-z0-9_-]{12,}\b/gu],
  ["Neon endpoint", /\bep-[a-z0-9-]+\.[a-z0-9-]+\.aws\.neon\.tech\b/giu],
  ["server database environment name", /\bVELA_(?:ACTIVITY|PROJECTION)(?:_WRITER)?_DATABASE_URL\b/gu],
  ["repository authority key name", /\b(?:VELA_AUTHORITY_PRIVATE_KEY|VELA_SIGNING_PRIVATE_KEY|PRIVATE_KEY_HEX)\b/gu],
  ["private UI registry or component-lab metadata", /(?:vela\.ui-component-lab\.v1|private-source-only|approved-private-adaptation|shadcn\.io Pro private end-product adaptation|https:\/\/ui\.shadcn\.com\/schema\/registry-item\.json)/gu],
];
const activityPrivacyRules = [
  /* WorkOS user ids carry a `user_01…` ULID-like payload. Requiring that
     shape avoids treating scientific fields such as `user_verification` as
     private account data while still refusing real hosted identities. */
  ["hosted account identifier", /\buser_01[0-9A-HJKMNP-TV-Z]{12,}\b/gu],
  ["email address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu],
  ["live proof fixture", /\bliveproof\b/giu],
];

function deliveredFiles(repository) {
  const app = (name) => resolve(repository, "apps", name);
  const nextFiles = (name) => [
    ...filesBelow(resolve(app(name), ".next/static")),
    ...filesBelow(resolve(app(name), "public")),
    ...filesBelow(resolve(app(name), ".next/server/app")),
  ].filter((path) => deliveredExtensions.test(path) && !path.endsWith(".map"));

  return [
    ...filesBelow(resolve(app("www"), "out"))
      .filter((path) => deliveredExtensions.test(path) && !path.endsWith(".map"))
      .map((path) => ({ path, profile: "www" })),
    ...nextFiles("observatory").map((path) => ({ path, profile: "app" })),
  ];
}

export function scanPublicOutput(repository) {
  const findings = [];
  const files = deliveredFiles(repository);
  for (const file of files) {
    const content = readFileSync(file.path, "utf8");
    const rules = file.profile === "app"
      ? [...commonRules, ...activityPrivacyRules]
      : commonRules;
    for (const [rule, pattern] of rules) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        findings.push({ file: relative(repository, file.path), profile: file.profile, rule });
      }
    }
  }
  if (findings.length) {
    const detail = findings.map(({ file, rule }) => `- ${file}: ${rule}`).join("\n");
    throw new Error(`public output contains server secret, private-account material, or private registry metadata:\n${detail}`);
  }
  return {
    ok: true,
    schema: "vela.web-public-output-scan.v1",
    files: files.length,
    profiles: [...new Set(files.map(({ profile }) => profile))].sort(),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.stdout.write(`${JSON.stringify(scanPublicOutput(resolve(import.meta.dirname, "..")))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
