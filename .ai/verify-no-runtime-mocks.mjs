import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const srcDir = join(root, "src");

const ALLOWED_FILE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const EXCLUDED_DIR_SEGMENTS = new Set(["__tests__", "__mocks__"]);
const EXCLUDED_FILE_MARKERS = [".test.", ".spec.", ".ai-context.json"];

const RUNTIME_MOCK_PATTERNS = [
  /from\s+["']msw["']/i,
  /mockServiceWorker/i,
  /\bjest\.mock\s*\(/,
  /\bvi\.mock\s*\(/,
  /from\s+["']@faker-js\/faker["']/i,
  /from\s+["']faker["']/i,
];

const findings = [];

function isExcludedFile(path) {
  return EXCLUDED_FILE_MARKERS.some((marker) => path.includes(marker));
}

function isAllowedCodeFile(path) {
  return Array.from(ALLOWED_FILE_EXT).some((ext) => path.endsWith(ext));
}

function isExcludedDir(path) {
  return path
    .split("/")
    .some((segment) => EXCLUDED_DIR_SEGMENTS.has(segment));
}

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const relPath = fullPath.replace(`${root}/`, "").replaceAll("\\", "/");

    if (entry.isDirectory()) {
      if (isExcludedDir(relPath)) {
        continue;
      }
      await walk(fullPath);
      continue;
    }

    if (!isAllowedCodeFile(relPath) || isExcludedFile(relPath)) {
      continue;
    }

    const source = await readFile(fullPath, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, idx) => {
      const pattern = RUNTIME_MOCK_PATTERNS.find((p) => p.test(line));
      if (pattern) {
        findings.push(`${relPath}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }
}

await walk(srcDir);

if (findings.length > 0) {
  console.error("Runtime mock references are not allowed in src runtime code:");
  findings.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}

console.log("Runtime mock verification passed.");
