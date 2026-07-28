import { describe, expect, test } from "bun:test";
import { linuxReleaseAssetUrl, loadVelaReleaseRecord } from "./install-recorded-vela.mjs";

describe("recorded Vela installer", () => {
  test("derives the Linux asset and both integrity checks from one release record", () => {
    const release = loadVelaReleaseRecord();
    expect(release.version).toBe("0.940.5");
    expect(release.tag).toBe("v0.940.5");
    expect(release.linux_archive_sha256).toBe("sha256:80d80a7aaaefbf981158bf985b8840d81a98afa84e54f803c1a53ef6bd1ade80");
    expect(release.generator_binary_sha256).toBe("sha256:f607fda46e110935b753a4158fbea76e79cbb60286e15bc1cef3ca369e50ec20");
    expect(release.macos_generator_binary_sha256).toBe("sha256:e5d8dfaa2a9aa60060579115ebdf730f0297cd5b8059f08fc063f4fdfd10cb25");
    expect(release.macos_archive_sha256).toBe("sha256:882f93c788eb22b892d777613c3afd1890ade4862d47d802a7fa806e300d3d11");
    expect(linuxReleaseAssetUrl(release)).toBe("https://github.com/vela-science/vela/releases/download/v0.940.5/vela-linux-x86_64.tar.gz");
  });
});
