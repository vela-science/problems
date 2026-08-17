import { describe, expect, it } from "vitest";
import { publicContact } from "./public-contact";

describe("publicContact", () => {
  it("returns a private mail channel only for a valid configured address", () => {
    expect(publicContact(" support@example.org ")).toEqual({
      configured: true,
      email: "support@example.org",
      href: "mailto:support@example.org",
    });
  });

  it.each([undefined, "", "support", "support@example.org?subject=secret", "a b@example.org"])(
    "fails closed for %s",
    (value) => expect(publicContact(value)).toEqual({ configured: false, email: null, href: null }),
  );
});
