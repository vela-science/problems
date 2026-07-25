import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.915.1");
    expect(release.tag).toBe("v0.915.1");
    expect(release.linux_archive_sha256).toBe("sha256:6d78bf5f47b51baf3610cd40a33524ea36e3f5f231bf2616ef306dacb4a4edf3");
    expect(release.generator_binary_sha256).toBe("sha256:b9acf197e26a75decf37219ba681f78878dffe1c11d4e1351bba18246c77d8aa");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.915.1/vela-linux-x86_64.tar.gz");
  });
});
