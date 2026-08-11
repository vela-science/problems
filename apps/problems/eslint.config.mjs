import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { boundaryImportRules } from "../../eslint.bans.mjs";
import { PROBLEMS_IDENTITY_FILES } from "../../scripts/scientific-authority-boundary.mjs";

const identityFiles = PROBLEMS_IDENTITY_FILES.map((file) => (
  file.replace(/^apps\/problems\//u, "")
));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: identityFiles,
    rules: boundaryImportRules({ profile: "problems", designSystem: true }),
  },
  {
    files: identityFiles,
    rules: boundaryImportRules({
      profile: "problems",
      productIdentity: true,
      designSystem: true,
    }),
  },
]);

export default eslintConfig;
