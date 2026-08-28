import { describe, expect, it } from "vitest";
import { structuredDataScript } from "./structured-data";

describe("structuredDataScript", () => {
  /* A Problem's JSON-LD `name` is the statement exactly as the upstream
     repository retained it, so the closing sequence can arrive as data. */
  it("cannot end its own script element", () => {
    const output = structuredDataScript({ name: "If x </script><img src=x onerror=alert(1)> then y" });
    expect(output).not.toContain("</script>");
    expect(output).not.toContain("<img");
  });

  /* Escaping is an encoding change, not a sanitising one: the statement has to
     survive the round trip byte for byte, because this product publishes source
     text exactly. */
  it("preserves the value it escapes", () => {
    const statement = "For a < b and c > d, the set A & B is empty";
    const parsed = JSON.parse(structuredDataScript({ name: statement })) as { name: string };
    expect(parsed.name).toBe(statement);
  });

  it("stays valid JSON for ordinary documents", () => {
    const document = { "@context": "https://schema.org", "@type": "CollectionPage", numberOfItems: 1217 };
    expect(JSON.parse(structuredDataScript(document))).toEqual(document);
  });
});
