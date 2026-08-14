import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { boundaryImportRules } from "../../eslint.bans.mjs";
import { PRODUCT_IDENTITY_FILES } from "../../scripts/scientific-authority-boundary.mjs";

/* The account boundary, read from the scanner that still owns the non-import
   half of it, and rebased onto this app's config directory. */
const productIdentityFiles = PRODUCT_IDENTITY_FILES.map((file) =>
  file.replace(/^apps\/problems\//u, ""),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: productIdentityFiles,
    rules: boundaryImportRules({ profile: "problems", designSystem: true }),
  },
  {
    // The same list minus the identity provider, rather than the rules switched
    // off: a flat-config block that redefines a rule replaces its options
    // wholesale, so an `off` here would also unban the database.
    files: productIdentityFiles,
    rules: boundaryImportRules({
      profile: "problems",
      productIdentity: true,
      designSystem: true,
    }),
  },
]);

export default eslintConfig;
