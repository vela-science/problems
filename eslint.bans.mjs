/*
  AST-level import half of the scientific-authority boundary. Static imports,
  re-exports, TypeScript require imports, and dynamic import() expressions are
  all generated from the same module lists so spelling cannot bypass a profile.
*/

/* Applications reach Postgres through their declared data package. */
const DATABASE = [
  "next-auth",
  "@auth/**",
  "firebase",
  "@supabase/**",
  "@prisma/**",
  "prisma",
  "pg",
  "postgres",
  "mysql",
  "mysql2",
  "mongoose",
];

/* The local helper is a user-run handoff, never hosted application code. */
const SIGNING_AUTHORITY = [
  "@noble/ed25519",
  "tweetnacl",
  "libsodium",
  "sodium-native",
  "node:child_process",
  "@vela/activity-data/local-signing",
];

const REQUEST_STATE = ["next/headers"];
const PRODUCT_IDENTITY = ["@workos-inc/**"];
const RETIRED_ICONS = ["lucide-react"];
const RETIRED_COMPONENTS = [
  "command-step",
  "frontier-nav",
  "global-review-ledger",
  "object-header",
  "provenance-trail",
  "review-ledger",
  "root-disclosure",
  "status-distribution",
  "summary-card",
  "work-ledger",
].map((name) => `**/components/vela/${name}`);

const withSubpaths = (specifiers) => specifiers.flatMap((specifier) => (
  specifier.endsWith("/**") ? [specifier] : [specifier, `${specifier}/**`]
));

/* Convert the same glob set to the regular expression used by esquery for
   dynamic imports. The sentinel is ordinary text so this source stays UTF-8. */
const asSelector = (specifiers) => {
  const sentinel = "__VELA_DOUBLE_STAR__";
  const alternatives = withSubpaths(specifiers).map((glob) => glob
    .replace(/[.+^${}()|[\]\\]/gu, "\\$&")
    .replace(/\*\*/gu, sentinel)
    .replace(/\*/gu, "[^/]*")
    .replaceAll(sentinel, ".*")
    .replaceAll("/", "\\/"));
  return `ImportExpression[source.value=/^(?:${alternatives.join("|")})$/]`;
};

const group = (specifiers, message) => ({ group: withSubpaths(specifiers), message });
const dynamic = (specifiers, message) => ({ selector: asSelector(specifiers), message });

const DATABASE_MESSAGE =
  "applications reach Postgres only through their declared data package";
const SIGNING_AUTHORITY_MESSAGE =
  "hosted applications may export an unsigned handoff but may not import signing or authority machinery";
const REQUEST_STATE_MESSAGE =
  "request-scoped headers, cookies, and server helpers are not allowed";
const PRODUCT_IDENTITY_MESSAGE =
  "the maintained identity provider is confined to the declared account boundary";
const RETIRED_ICONS_MESSAGE =
  "the retired Lucide icon family; the installed registry family is Hugeicons";
const RETIRED_COMPONENTS_MESSAGE = "a retired presentation component";

const RAW_TYPE_SIZE = String.raw`(?:^|\s)text-(?:xs|sm|base|lg|xl|2xl)(?:$|\s)`;
const RAW_TYPE_SIZE_MESSAGE =
  "a raw Tailwind size utility; use a generated type role (display, title, subtitle, body, compact, label, meta, micro, eyebrow)";
const rawTypeSizeSelectors = [
  `Literal[value=/${RAW_TYPE_SIZE}/]`,
  `TemplateElement[value.raw=/${RAW_TYPE_SIZE}/]`,
].map((selector) => ({ selector, message: RAW_TYPE_SIZE_MESSAGE }));

/**
 * Return both static and dynamic import rules for one application profile.
 *
 * @param {{ productIdentity?: boolean, designSystem?: boolean, profile?: "static" | "problems" | "problems" }} options
 */
export function boundaryImportRules({
  productIdentity = false,
  designSystem = false,
  profile = "problems",
} = {}) {
  if (!["static", "problems", "problems"].includes(profile)) {
    throw new Error(`unknown scientific-authority ESLint profile: ${profile}`);
  }
  const bans = [
    [DATABASE, DATABASE_MESSAGE],
    [SIGNING_AUTHORITY, SIGNING_AUTHORITY_MESSAGE],
    [REQUEST_STATE, REQUEST_STATE_MESSAGE],
    ...(productIdentity ? [] : [[PRODUCT_IDENTITY, PRODUCT_IDENTITY_MESSAGE]]),
    ...(designSystem ? [
      [RETIRED_ICONS, RETIRED_ICONS_MESSAGE],
      [RETIRED_COMPONENTS, RETIRED_COMPONENTS_MESSAGE],
    ] : []),
  ];
  return {
    "no-restricted-imports": [
      "error",
      { patterns: bans.map(([specifiers, message]) => group(specifiers, message)) },
    ],
    "no-restricted-syntax": [
      "error",
      ...bans.map(([specifiers, message]) => dynamic(specifiers, message)),
      ...(designSystem ? rawTypeSizeSelectors : []),
    ],
  };
}
