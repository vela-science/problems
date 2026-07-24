import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.914.1");
    expect(release.tag).toBe("v0.914.1");
    expect(release.linux_archive_sha256).toBe("sha256:b0886a25ea22eb0bd1be957e3a997a527ff21b265dc4dbdb3a948f9432dc2d52");
    expect(release.generator_binary_sha256).toBe("sha256:d8bf9c6e708cff8837601b4cd675085dcaedc08d37368eeb4077d0219462d754");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.914.1/vela-linux-x86_64.tar.gz");
  });
});
