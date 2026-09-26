import { describe, expect, it } from "vitest";
import { highlightCode, loadHighlighter } from "./code-highlight";

describe("code-highlight", () => {
  it("carica l'highlighter lazy con il set common + linguaggi extra", async () => {
    const hljs = await loadHighlighter();
    expect(hljs).not.toBeNull();
    expect(hljs!.getLanguage("javascript")).toBeTruthy();
    expect(hljs!.getLanguage("tsx")).toBeTruthy();
    expect(hljs!.getLanguage("dockerfile")).toBeTruthy();
  });

  it("colora il codice con le classi hljs", async () => {
    const hljs = (await loadHighlighter())!;
    const html = highlightCode(hljs, "javascript", "const x = 1;");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("hljs-number");
  });

  it("escapa l'HTML: nessun tag grezzo nell'output", async () => {
    const hljs = (await loadHighlighter())!;
    const html = highlightCode(hljs, "html", '<b onclick="x">ciao</b>');
    expect(html).not.toContain("<b ");
    expect(html).toContain("&lt;");
  });

  it("lingua vuota, prompt o sconosciuta → null (testo grezzo)", async () => {
    const hljs = (await loadHighlighter())!;
    expect(highlightCode(hljs, "", "x")).toBeNull();
    expect(highlightCode(hljs, "prompt", "Sei un assistente...")).toBeNull();
    expect(highlightCode(hljs, "lingua-inventata", "x")).toBeNull();
  });

  it("accetta alias comuni e i linguaggi extra (js, tsx, dockerfile)", async () => {
    const hljs = (await loadHighlighter())!;
    expect(highlightCode(hljs, "js", "let a = 1")).not.toBeNull();
    expect(highlightCode(hljs, "TSX", "const A = () => <div />")).not.toBeNull();
    expect(highlightCode(hljs, "dockerfile", "FROM node:20\nRUN npm ci")).not.toBeNull();
  });
});
