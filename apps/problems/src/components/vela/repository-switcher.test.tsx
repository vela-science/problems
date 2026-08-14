import { describe, expect, it } from "vitest";

import { switchDestination, type SwitchableRepository } from "@/components/vela/repository-switcher";

const erdos: SwitchableRepository = { slug: "erdos", name: "Erdős" };
const quantumCodes: SwitchableRepository = { slug: "quantum-codes", name: "Quantum Codes" };

describe("switchDestination", () => {
  it("carries a section the destination Repository serves", () => {
    expect(switchDestination(quantumCodes, "claims")).toBe("/repositories/quantum-codes/claims");
    expect(switchDestination(quantumCodes, "proposals")).toBe("/repositories/quantum-codes/proposals");
    expect(switchDestination(quantumCodes, "contribute")).toBe("/repositories/quantum-codes/contribute");
  });

  it("falls back to the Overview with no section", () => {
    expect(switchDestination(erdos, null)).toBe("/repositories/erdos");
  });
});
