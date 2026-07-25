import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.930.0-rc.6");
    expect(release.tag).toBe("v0.930.0-rc.6");
    expect(release.linux_archive_sha256).toBe("sha256:ea682460016cd414b7e9dbdde648bfb5ae6b2ab753d9572a938ccfd9150dd8fb");
    expect(release.generator_binary_sha256).toBe("sha256:8410c23a3487b4302ab9c0bf67c1228a39c05bacde188d3d6f66fab8bb055119");
    expect(release.macos_generator_binary_sha256).toBe("sha256:9268ffbb9acaca5705dbf9e1bd69740c6e0ac9af9bf05c307a51c74a2e5d02db");
    expect(release.macos_archive_sha256).toBe("sha256:0ff73a682d77175da0ba7879e6fd270b0753ff735d311d231cb49c0adc6f0758");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.930.0-rc.6/vela-linux-x86_64.tar.gz");
  });
});
