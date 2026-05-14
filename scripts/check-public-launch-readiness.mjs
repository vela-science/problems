import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function tableRows(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return [];
  const rest = markdown.slice(start);
  const next = rest.slice(3).search(/\n## /);
  const section = next === -1 ? rest : rest.slice(0, next + 3);
  return section
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

function requireMatch(label, text, regex) {
  if (!regex.test(text)) failures.push(label);
}

const feedbackLog = read("docs/review-feedback-log.md");
const outreach = read("docs/external-review-outreach.md");
const readiness = read("docs/public-launch-readiness.md");
const versionLog = read("docs/version-log.md");

const openFeedback = tableRows(feedbackLog, "Open Feedback");
const closedFeedback = tableRows(feedbackLog, "Closed Feedback");
const readerSessions = tableRows(feedbackLog, "Reader Session Summaries");
const closeoutScores = tableRows(feedbackLog, "Final 95+ Closeout Scores");
const outreachRows = tableRows(outreach, "Outreach Queue");

const expertReviews = outreachRows.filter((row) => {
  const id = row[0] || "";
  const lane = row[1] || "";
  const status = row[4] || "";
  const isExpertLane = !/^Technical Outsider$/i.test(lane);
  return /^R-\d+/.test(id) && isExpertLane && status === "complete";
});

const firstTimeReviews = outreachRows.filter((row) => {
  const id = row[0] || "";
  const lane = row[1] || "";
  const status = row[4] || "";
  return /^R-\d+/.test(id) && /^Technical Outsider$/i.test(lane) && status === "complete";
});

const openLaunchBlockers = openFeedback.filter((row) => {
  const severity = row[3] || "";
  const status = row[4] || "";
  return (severity.startsWith("P0") || severity.startsWith("P1")) && status !== "fixed";
});

if (expertReviews.length < 8) {
  failures.push(`expert reviews incomplete: ${expertReviews.length}/8 complete outreach rows`);
}

if (firstTimeReviews.length < 3 || readerSessions.length < 3) {
  failures.push(
    `first-time reader sessions incomplete: ${firstTimeReviews.length}/3 complete outreach rows and ${readerSessions.length}/3 session-summary rows`,
  );
}

if (openLaunchBlockers.length > 0) {
  failures.push(`open P0/P1 feedback remains: ${openLaunchBlockers.length} rows`);
}

closedFeedback.forEach((row) => {
  const id = row[0] || "unknown feedback row";
  const verification = row[8] || "";
  if (/rescore/i.test(verification)) {
    failures.push(`stale sub-closeout rescore remains in ${id}`);
  }
});

if (closeoutScores.length < 5) {
  failures.push(`final 95+ closeout scores incomplete: ${closeoutScores.length}/5 rows`);
}

closeoutScores.forEach((row) => {
  const board = row[0] || "unknown board";
  const numericCells = row.slice(1, 5);
  numericCells.forEach((cell) => {
    const match = cell.match(/\d+/);
    if (!match) {
      failures.push(`final closeout score missing numeric value for ${board}`);
      return;
    }
    const score = Number(match[0]);
    if (score < 95) {
      failures.push(`final closeout score below 95 for ${board}: ${score}`);
    }
  });
  const result = row[5] || "";
  if (!/^pass$/i.test(result)) {
    failures.push(`final closeout result is not pass for ${board}`);
  }
});

requireMatch(
  "readiness dashboard must say simulated-review launch candidate is ready",
  readiness,
  /Status:\s*ready for simulated-review launch candidate\./i,
);

requireMatch(
  "version log must include v1.0 simulated-review launch candidate",
  versionLog,
  /### v1\.0 simulated-review launch candidate/i,
);

if (failures.length) {
  console.error("Public launch readiness check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public launch readiness check passed.");
