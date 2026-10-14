import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyStrEdits,
  applyStrReplace,
  defaultFileName,
  isValidArtifactType,
  normalizeArtifactId,
  truncateForContext,
  ARTIFACT_CONTEXT_CHARS,
} from "../src/lib/artifact-edits.ts";

test("str_replace applica una sostituzione unica", () => {
  const r = applyStrReplace("ciao mondo", { old_str: "mondo", new_str: "luna" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.content, "ciao luna");
});

test("str_replace: zero match con errore guidato", () => {
  const r = applyStrReplace("ciao mondo", { old_str: "sole", new_str: "luna" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /not found verbatim/);
});

test("str_replace: match multipli rifiutati", () => {
  const r = applyStrReplace("a X b X c", { old_str: "X", new_str: "Y" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /more than once/);
});

test("str_replace: old_str vuota rifiutata", () => {
  const r = applyStrReplace("abc", { old_str: "", new_str: "z" });
  assert.equal(r.ok, false);
});

test("edits multipli in ordine, stop al primo errore", () => {
  const ok = applyStrEdits("uno due tre", [
    { old_str: "uno", new_str: "1" },
    { old_str: "due", new_str: "2" },
  ]);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.content, "1 2 tre");
    assert.equal(ok.applied, 2);
  }
  const bad = applyStrEdits("uno due", [
    { old_str: "uno", new_str: "1" },
    { old_str: "manca", new_str: "x" },
  ]);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.applied, 1);
});

test("tipi validi e nomi file", () => {
  assert.equal(isValidArtifactType("mermaid"), true);
  assert.equal(isValidArtifactType("react"), false);
  assert.equal(defaultFileName("report", "markdown"), "report.md");
  assert.equal(defaultFileName("app", "html"), "app.html");
  assert.equal(defaultFileName("main", "code"), "main.txt");
});

test("id normalizzati", () => {
  assert.equal(normalizeArtifactId("Report Q1 2026!"), "report-q1-2026");
  assert.equal(normalizeArtifactId(""), "artifact");
});

test("troncamento contesto segnalato", () => {
  const short = truncateForContext("abc");
  assert.equal(short.truncated, false);
  const long = truncateForContext("x".repeat(ARTIFACT_CONTEXT_CHARS + 1));
  assert.equal(long.truncated, true);
  assert.equal(long.text.length, ARTIFACT_CONTEXT_CHARS);
});
