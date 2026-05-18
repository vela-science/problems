import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const host = "127.0.0.1";
const port = 4321;
const baseUrl = `http://${host}:${port}`;
const routes = ["/", "/discovery-engine", "/terafactories"];
const viewport = { width: 390, height: 844 };

async function loadPlaywright() {
  const envModule = process.env.PLAYWRIGHT_MODULE_DIR
    ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, "playwright/index.mjs")
    : null;
  const candidates = [
    path.join(root, "node_modules/playwright/index.mjs"),
    envModule,
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs",
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      return await import(pathToFileURL(candidate).href);
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(
    "Playwright is not available. Install it in this repo or set PLAYWRIGHT_MODULE_DIR to a Node module directory.",
  );
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(800) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function startServerIfNeeded() {
  if (await isServerReady()) return null;
  const child = spawn("bun", ["run", "dev", "--host", host], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let recentOutput = "";
  const collect = (chunk) => {
    recentOutput = `${recentOutput}${chunk.toString()}`.slice(-4000);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);

  try {
    await waitForServer();
    return child;
  } catch (error) {
    child.kill("SIGINT");
    throw new Error(`${error.message}\n${recentOutput}`);
  }
}

async function stopServer(child) {
  if (!child) return;
  child.kill("SIGINT");
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 2000);
    child.on("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function routeUrl(route) {
  return `${baseUrl}${route}`;
}

const { chromium } = await loadPlaywright();
const server = await startServerIfNeeded();
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const route of routes) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 2,
      isMobile: true,
    });

    await page.goto(routeUrl(route), { waitUntil: "networkidle" });

    const result = await page.evaluate(() => {
      const interactive = [...document.querySelectorAll("a[href], button:not([disabled])")]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const text = (el.textContent || el.getAttribute("aria-label") || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
          const isInlineTextLink =
            el.tagName === "A" && Boolean(el.closest(".prose p, .prose li, .margin-note"));
          return {
            tag: el.tagName,
            text,
            width: rect.width,
            height: rect.height,
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== "hidden" &&
              style.display !== "none",
            isInlineTextLink,
          };
        })
        .filter((item) => item.visible && !item.isInlineTextLink && (item.width < 44 || item.height < 44));

      const surfaces = [
        ...document.querySelectorAll("figure, .essay-hero, .closing-page, .image-plate, .figure-plate"),
      ].map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          className: el.className?.toString?.() || el.tagName,
          width: rect.width,
          height: rect.height,
          x: rect.x,
        };
      });

      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyHeight: document.documentElement.scrollHeight,
        smallInteractive: interactive,
        invisibleSurfaces: surfaces.filter((item) => item.width <= 0 || item.height <= 0),
        overflowSurfaces: surfaces.filter((item) => item.x < -1 || item.x + item.width > window.innerWidth + 1),
        surfaceCount: surfaces.length,
      };
    });

    if (result.scrollWidth > result.clientWidth + 1) {
      failures.push({ route, type: "page-overflow", result });
    }
    if (result.smallInteractive.length) {
      failures.push({ route, type: "small-interactive", details: result.smallInteractive.slice(0, 8) });
    }
    if (result.invisibleSurfaces.length) {
      failures.push({ route, type: "invisible-surfaces", details: result.invisibleSurfaces });
    }
    if (result.overflowSurfaces.length) {
      failures.push({ route, type: "surface-overflow", details: result.overflowSurfaces });
    }

    console.log(
      `${route} surfaces=${result.surfaceCount} height=${result.bodyHeight} overflow=${
        result.scrollWidth - result.clientWidth
      } smallInteractive=${result.smallInteractive.length}`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await stopServer(server);
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log("Rendered surface check passed.");
