import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseChatFiles,
  replaceFileBlockContent,
  resolveFileType,
} from "../src/lib/chat-files.ts";

test("replace: aggiorna solo il blocco con lo slug dato", () => {
  const msg = 'Intro\n<agentcloud_file id="a" name="a.md" type="markdown">vecchio</agentcloud_file>\n<agentcloud_file id="b" name="b.md" type="markdown">altro</agentcloud_file>';
  const out = replaceFileBlockContent(msg, "a", "nuovo");
  assert.ok(out.includes("nuovo</agentcloud_file>"));
  assert.ok(out.includes(">altro</agentcloud_file>"));
  assert.ok(out.startsWith("Intro"));
});

test("replace: slug assente lascia tutto invariato", () => {
  const msg = "solo testo";
  assert.equal(replaceFileBlockContent(msg, "x", "nuovo"), msg);
});

test("replace+parse: il pannello vedrebbe la nuova versione", () => {
  const msg = '<agentcloud_file id="doc" name="doc.md" type="markdown">v1</agentcloud_file>';
  const out = replaceFileBlockContent(msg, "doc", "v2 con modifiche");
  const parsed = parseChatFiles(out);
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].content, "v2 con modifiche");
  assert.equal(parsed.text, "");
});

test("tipo mermaid da attributo ed estensione", () => {
  assert.equal(resolveFileType("mermaid", "diagram.mmd"), "mermaid");
  assert.equal(resolveFileType(undefined, "flow.mermaid"), "mermaid");
});
