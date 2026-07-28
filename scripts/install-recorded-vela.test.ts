import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.940.4");
    expect(release.tag).toBe("v0.940.4");
    expect(release.linux_archive_sha256).toBe("sha256:a7c5ab84556d5e12d8cc4250c3afd2c30c665d36a87d8a90a78d3d88df26eead");
    expect(release.generator_binary_sha256).toBe("sha256:26c72e02fce0107ebeb72a99aeb45a61992845354076217154ec34452392805d");
    expect(release.macos_generator_binary_sha256).toBe("sha256:aa07602e0d38e740545618ce5715af8483bab33b09499db524869337261db4a6");
    expect(release.macos_archive_sha256).toBe("sha256:fbbb8af469786f8dff65bc82e8ed869173647a7491c91d950b8d3b2dee0ea2ad");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.940.4/vela-linux-x86_64.tar.gz");
  });
});
