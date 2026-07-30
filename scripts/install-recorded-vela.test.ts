import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.950.1");
    expect(release.tag).toBe("v0.950.1");
    expect(release.linux_archive_sha256).toBe("sha256:a4d2e178cd20fc002a7755c7baa2b5c8bb9372bfea4a78e0ac695c5511895e12");
    expect(release.generator_binary_sha256).toBe("sha256:a837e9e1cbde77b3abf712a36ec84eed2aacfaaf543e3cb4e7fc900497343bc0");
    expect(release.macos_generator_binary_sha256).toBe("sha256:e9bc81e1bb735ade94a529253bec96ea6a8c5618a524c0e4b3e53c5846e8535e");
    expect(release.macos_archive_sha256).toBe("sha256:5af76d3a854ce3c3850115d883a29f4c25968e553cd71f83c15f374ffa4d6d70");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.950.1/vela-linux-x86_64.tar.gz");
  });
});
