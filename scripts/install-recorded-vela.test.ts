import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.913.0");
    expect(release.tag).toBe("v0.913.0");
    expect(release.linux_archive_sha256).toBe("sha256:aef343dc85e1cbd1ca62bb10364b8581caafaa323a6cb525b55088ab0bf9be45");
    expect(release.generator_binary_sha256).toBe("sha256:a957959654b461fd3ccd3b35b6aa0a5ce7077f6e90017097c1b961ef06878fdf");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.913.0/vela-linux-x86_64.tar.gz");
  });
});
