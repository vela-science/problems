import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(root, "marks/source");
const exportRoot = resolve(root, "marks/exports");
const approvalRoot = resolve(root, "marks/approval");

const masters = [
  { name: "vela-symbol-full", width: 1000 },
  { name: "vela-symbol-compact", width: 512 },
  { name: "vela-symbol-micro", width: 256 },
  { name: "vela-symbol-favicon-16", width: 16 },
  { name: "vela-wordmark", width: 1360 },
  { name: "vela-lockup-horizontal", width: 1480 },
  { name: "vela-lockup-stacked", width: 900 },
];

const variants = {
  color: (svg) => svg,
  monochrome: (svg) => svg.replaceAll("#C9A664", "#081224"),
  reversed: (svg) => svg.replaceAll("#081224", "#F7F6F2"),
};

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function toolVersion(command, args = ["--version"]) {
  return execFileSync(command, args, { encoding: "utf8" }).trim().split("\n")[0];
}

function render(input, format, output, width) {
  execFileSync("rsvg-convert", ["--format", format, "--width", String(width), "--output", output, input], {
    stdio: "pipe",
  });
  if (format === "eps") {
    const normalized = readFileSync(output, "utf8").replace(/[\t ]+(?=\r?\n|$)/gu, "");
    writeFileSync(output, normalized);
  }
}

function svgBody(svg) {
  return svg.replace(/^<svg[^>]*>/u, "").replace(/<\/svg>\s*$/u, "");
}

function approvalSheet(source) {
  const full = svgBody(source.get("vela-symbol-full"));
  const compact = svgBody(source.get("vela-symbol-compact"));
  const micro = svgBody(source.get("vela-symbol-micro"));
  const favicon = svgBody(source.get("vela-symbol-favicon-16"));
  const horizontal = svgBody(source.get("vela-lockup-horizontal"));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200">
  <rect width="1600" height="1200" fill="#F7F6F2"/>
  <rect x="800" width="800" height="1200" fill="#081224"/>
  <defs>
    <clipPath id="compact-tile"><rect width="176" height="176" rx="12"/></clipPath>
    <clipPath id="micro-tile"><rect width="176" height="176" rx="12"/></clipPath>
    <clipPath id="hinted-tile"><rect width="176" height="176" rx="12"/></clipPath>
  </defs>
  <g font-family="Inter,Arial,sans-serif">
    <text x="72" y="82" fill="#081224" font-size="20" font-weight="600" letter-spacing="3">VELA IDENTITY APPROVAL / 2026-07</text>
    <text x="1528" y="82" fill="#F7F6F2" font-size="15" text-anchor="end" letter-spacing="2">STATE → DIRECTION</text>
    <g transform="translate(55 120) scale(.64)">${full}</g>
    <g transform="translate(895 132) scale(.64)">${variants.reversed(full)}</g>
    <text x="72" y="690" fill="#334155" font-size="16">Full sail / lineage field / 32 px and above</text>
    <text x="1528" y="690" fill="#A1A7B0" font-size="16" text-anchor="end">Reversed / Midnight application</text>
    <line x1="72" y1="728" x2="1528" y2="728" stroke="#C9A664" stroke-width="2"/>
    <g transform="translate(72 770)">
      <rect width="176" height="176" rx="12" fill="#E9EBEF"/>
      <g clip-path="url(#compact-tile)">
        <g transform="translate(24 24) scale(.5)">${compact}</g>
        <g transform="translate(136 136) scale(.125)">${compact}</g>
      </g>
      <text x="0" y="208" fill="#334155" font-size="15">Compact / 20–31 px</text>
    </g>
    <g transform="translate(320 770)">
      <rect width="176" height="176" rx="12" fill="#E9EBEF"/>
      <g clip-path="url(#micro-tile)">
        <g transform="translate(24 24) scale(.5)">${micro}</g>
        <g transform="translate(144 144) scale(.0625)">${micro}</g>
      </g>
      <text x="0" y="208" fill="#334155" font-size="15">Micro / 12–19 px</text>
    </g>
    <g transform="translate(570 770)">
      <rect width="176" height="176" rx="12" fill="#E9EBEF"/>
      <g clip-path="url(#hinted-tile)">
        <g transform="translate(16 16) scale(9)">${favicon}</g>
        <g transform="translate(144 144)">${favicon}</g>
      </g>
      <text x="0" y="208" fill="#334155" font-size="15">Hand-hinted / 16 px</text>
    </g>
    <g transform="translate(850 790) scale(.46)">${variants.reversed(horizontal)}</g>
    <text x="850" y="1038" fill="#A1A7B0" font-size="15">Horizontal lockup / one-color capable</text>
    <text x="72" y="1038" fill="#64748B" font-size="13">Actual-size masters appear in each tile's lower-right corner.</text>
    <g transform="translate(72 1080)">
      <circle cx="8" cy="-5" r="7" fill="#4F8F8B"/><text x="28" fill="#334155" font-size="15">Evidence</text>
      <circle cx="154" cy="-5" r="7" fill="#6E9F77"/><text x="174" fill="#334155" font-size="15">Progress</text>
      <circle cx="306" cy="-5" r="7" fill="#B7832F"/><text x="326" fill="#334155" font-size="15">Caution</text>
      <circle cx="450" cy="-5" r="7" fill="#9C3F4A"/><text x="470" fill="#334155" font-size="15">Conflict</text>
    </g>
    <text x="1528" y="1120" fill="#A1A7B0" font-size="14" text-anchor="end">Non-legal visual review / human approval required</text>
  </g>
</svg>`;
}

rmSync(exportRoot, { recursive: true, force: true });
rmSync(approvalRoot, { recursive: true, force: true });
for (const directory of ["svg", "png", "print"].map((name) => resolve(exportRoot, name))) mkdirSync(directory, { recursive: true });
mkdirSync(approvalRoot, { recursive: true });

const source = new Map();
for (const master of masters) source.set(master.name, readFileSync(resolve(sourceRoot, `${master.name}.svg`), "utf8"));

for (const master of masters) {
  for (const [variant, transform] of Object.entries(variants)) {
    const svgPath = resolve(exportRoot, "svg", `${master.name}-${variant}.svg`);
    writeFileSync(svgPath, transform(source.get(master.name)));
    render(svgPath, "png", resolve(exportRoot, "png", `${master.name}-${variant}.png`), master.width);
    render(svgPath, "pdf", resolve(exportRoot, "print", `${master.name}-${variant}.pdf`), master.width);
    render(svgPath, "eps", resolve(exportRoot, "print", `${master.name}-${variant}.eps`), master.width);
  }
}

for (const size of [16, 20, 32, 48]) {
  render(
    resolve(exportRoot, "svg/vela-symbol-favicon-16-color.svg"),
    "png",
    resolve(exportRoot, "png", `favicon-${size}.png`),
    size,
  );
}
render(resolve(exportRoot, "svg/vela-symbol-micro-color.svg"), "png", resolve(exportRoot, "png/apple-touch-icon.png"), 180);
execFileSync("magick", [
  resolve(exportRoot, "png/favicon-16.png"),
  resolve(exportRoot, "png/favicon-32.png"),
  resolve(exportRoot, "png/favicon-48.png"),
  resolve(exportRoot, "vela.ico"),
]);

const sheetSvg = approvalSheet(source);
writeFileSync(resolve(approvalRoot, "vela-identity-approval.svg"), sheetSvg);
render(resolve(approvalRoot, "vela-identity-approval.svg"), "png", resolve(approvalRoot, "vela-identity-approval.png"), 1600);
render(resolve(approvalRoot, "vela-identity-approval.svg"), "pdf", resolve(approvalRoot, "vela-identity-approval.pdf"), 1600);

const exportFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? exportFiles(path) : [path];
});
const files = [...exportFiles(exportRoot), ...exportFiles(approvalRoot)]
  .filter((path) => basename(path) !== "MANIFEST.json" && basename(path) !== "MANIFEST.sha256")
  .sort();
const manifest = {
  schema: "vela.brand-export-manifest.v1",
  version: "0.330.0",
  generators: {
    rsvg_convert: toolVersion("rsvg-convert"),
    imagemagick: toolVersion("magick", ["--version"]),
  },
  sources: masters.map(({ name }) => {
    const bytes = readFileSync(resolve(sourceRoot, `${name}.svg`));
    return { path: `source/${name}.svg`, sha256: sha256(bytes), bytes: bytes.byteLength };
  }),
  exports: files.map((path) => {
    const bytes = readFileSync(path);
    return { path: relative(resolve(root, "marks"), path), sha256: sha256(bytes), bytes: bytes.byteLength };
  }),
};
const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(resolve(exportRoot, "MANIFEST.json"), manifestBytes);
writeFileSync(resolve(exportRoot, "MANIFEST.sha256"), `${sha256(manifestBytes)}  MANIFEST.json\n`);

console.log(JSON.stringify({
  ok: true,
  schema: manifest.schema,
  sources: manifest.sources.length,
  exports: manifest.exports.length,
  manifest_sha256: sha256(manifestBytes),
}));
