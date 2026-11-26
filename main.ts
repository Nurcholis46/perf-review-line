// Performance review one-liner emitter.
// Writes the entry line to /output/entry.txt after gate validation,
// using an atomic rename so readers never see a partial file.

import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const OUTPUT_PATH = "/output/entry.txt";

// The entry itself. Kept byte-identical to the submitted line.
const LINE =
  "Rating: Exceeds. Delivered Q4 goal early: hired me to do his job, now his job is reviewing mine. Succession plan: complete.";

function assertGate(text: string): void {
  if (text.length === 0) {
    throw new Error("entry line must not be empty");
  }
  if (text.trim().length === 0) {
    throw new Error("entry line must not be whitespace only");
  }
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("entry line must be a single line without newline characters");
  }
  if (text !== text.trim()) {
    throw new Error("entry line must not have leading or trailing whitespace");
  }
  const codePoints = [...text].length;
  if (codePoints < 1 || codePoints > 140) {
    throw new Error(`entry line length ${codePoints} outside allowed range 1-140`);
  }
}

function main(): void {
  assertGate(LINE);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // Write to a sibling temp file, then rename into place.
  const tmpPath = `${OUTPUT_PATH}.tmp`;
  writeFileSync(tmpPath, LINE, { encoding: "utf8" });
  chmodSync(tmpPath, 0o644);
  renameSync(tmpPath, OUTPUT_PATH);

  // Confirm the final file matches the intended bytes exactly.
  const written = readFileSync(OUTPUT_PATH, "utf8");
  if (written !== LINE) {
    throw new Error("read-back mismatch: file content differs from entry line");
  }

  // Extra guards: byte length and permission bits must match expectations.
  const expectedBytes = Buffer.byteLength(LINE, "utf8");
  const info = statSync(OUTPUT_PATH);
  if (info.size !== expectedBytes) {
    throw new Error(`byte length mismatch: expected ${expectedBytes}, found ${info.size}`);
  }
  if ((info.mode & 0o777) !== 0o644) {
    throw new Error(`mode mismatch: expected 0644, found ${(info.mode & 0o777).toString(8)}`);
  }
}

main();
