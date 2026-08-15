import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
type Json = Record<string, unknown>;

function result(stdout: string, schema: string, label: string): Json {
  const value = JSON.parse(stdout) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} is not an object`);
  const record = value as Json;
  if (record.schema !== schema || record.ok !== true || record.authority_effect !== "none") {
    throw new Error(`${label} did not return the closed authority-neutral contract`);
  }
  return record;
}

export async function inspectCoreIntegration(vela: string, checkout: string): Promise<{
  inspected: Json; checked?: Json; checkError?: string;
}> {
  const execution = { maxBuffer: 4 * 1024 * 1024, timeout: 30_000, killSignal: "SIGKILL" as const };
  const inspected = result((await run(vela, ["integration", "inspect", checkout, "--json"], execution)).stdout,
    "vela.cli.integration-inspection.v1", "Core integration inspection");
  try {
    const checked = result((await run(vela, ["integration", "check", checkout, "--json"], execution)).stdout,
      "vela.cli.integration-check.v1", "Core integration check");
    return { inspected, checked };
  } catch (error) {
    return { inspected, checkError: error instanceof Error ? error.message : "check failed" };
  }
}
