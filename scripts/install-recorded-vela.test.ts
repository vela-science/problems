import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.950.0");
    expect(release.tag).toBe("v0.950.0");
    expect(release.linux_archive_sha256).toBe("sha256:cdabbdb929b9eec4890da534ba3020afd65111fa51e013de80e1c0a88f77c884");
    expect(release.generator_binary_sha256).toBe("sha256:434bfea54791ed3cf3bf37e732cafa2fb2cd14d546d9199a1f2b9e642f0343e0");
    expect(release.macos_generator_binary_sha256).toBe("sha256:8b317500e694168325975bc992d881240a3842d075e1d6a40f3c2043b80697fc");
    expect(release.macos_archive_sha256).toBe("sha256:ce628dbdef0875d6b4af0e5e09a96e7676be39558e400e20e1aee9f8c8008865");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.950.0/vela-linux-x86_64.tar.gz");
  });
});
