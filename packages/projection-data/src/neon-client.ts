import { neon, neonConfig } from "@neondatabase/serverless";

type Environment = Record<string, string | undefined>;

export function localNeonFetchEndpoint(environment: Environment): string | undefined {
  const value = environment.VELA_NEON_FETCH_ENDPOINT;
  if (!value) return undefined;
  if (environment.VERCEL_ENV === "production") {
    throw new Error("VELA_NEON_FETCH_ENDPOINT is forbidden in production");
  }
  const endpoint = new URL(value);
  if (
    endpoint.protocol !== "http:"
    || !["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)
    || endpoint.pathname !== "/sql"
    || endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
  ) {
    throw new Error("VELA_NEON_FETCH_ENDPOINT must be an uncredentialed loopback HTTP /sql endpoint");
  }
  return endpoint.toString();
}

const endpoint = localNeonFetchEndpoint(process.env);
if (endpoint) neonConfig.fetchEndpoint = endpoint;

export { neon };
