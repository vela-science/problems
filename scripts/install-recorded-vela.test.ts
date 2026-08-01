import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.tag).toBe(`v${release.version}`);
    for (const root of [
      release.linux_archive_sha256,
      release.generator_binary_sha256,
      release.macos_generator_binary_sha256,
      release.macos_archive_sha256,
    ]) {
      expect(root).toMatch(/^sha256:[0-9a-f]{64}$/u);
    }
    expect(linuxReleaseAssetUrl(release)).toBe(
      `https://github.com/vela-science/vela/releases/download/${release.tag}/vela-linux-x86_64.tar.gz`,
    );
  });
});
