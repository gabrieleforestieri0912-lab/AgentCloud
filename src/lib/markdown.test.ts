import { describe, expect, it } from "vitest";
import { insertSentenceBreaks, parseMarkdown } from "./markdown";

describe("parseMarkdown — blocchi di codice fenced", () => {
  it("estrae un blocco con lingua e codice grezzo", () => {
    const blocks = parseMarkdown(
      "Prima del codice.\n\n```javascript\nconst x = 1;\nconsole.log(x);\n```\n\nDopo il codice.",
    );
    expect(blocks).toEqual([
      { type: "paragraph", segments: [{ type: "text", value: "Prima del codice." }] },
      { type: "code", lang: "javascript", value: "const x = 1;\nconsole.log(x);" },
      { type: "paragraph", segments: [{ type: "text", value: "Dopo il codice." }] },
    ]);
  });

  it("gestisce il fence senza lingua", () => {
    const blocks = parseMarkdown("```\necho hello\n```");
    expect(blocks).toEqual([{ type: "code", lang: "", value: "echo hello" }]);
  });

  it("non interpreta markdown dentro il fence", () => {
    const blocks = parseMarkdown("```python\n# non è un titolo\n- non è un elenco\n**non grassetto**\n```");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "code",
      lang: "python",
      value: "# non è un titolo\n- non è un elenco\n**non grassetto**",
    });
  });

  it("accetta un fence non ancora chiuso (risposta in streaming)", () => {
    const blocks = parseMarkdown("Ecco il codice:\n\n```js\nconst a = 1;\nconst b = ");
    expect(blocks[blocks.length - 1]).toEqual({
      type: "code",
      lang: "js",
      value: "const a = 1;\nconst b = ",
    });
  });

  it("fa ripartire il testo normale dopo la chiusura del fence", () => {
    const blocks = parseMarkdown("```bash\nls\n```\n\n• punto elenco");
    expect(blocks.map((b) => b.type)).toEqual(["code", "list"]);
  });

  it("preserva le righe vuote dentro il blocco", () => {
    const blocks = parseMarkdown("```text\nriga1\n\nriga3\n```");
    expect(blocks[0]).toEqual({ type: "code", lang: "text", value: "riga1\n\nriga3" });
  });
});

describe("insertSentenceBreaks", () => {
  it("inserisce un a capo dopo ogni frase fuori dai fence", () => {
    expect(insertSentenceBreaks("Ciao. Questo è un test. Altro test.")).toBe(
      "Ciao.\n\nQuesto è un test.\n\nAltro test.",
    );
  });

  it("non tocca il contenuto dei blocchi fenced", () => {
    const text = "Prima.\n```js\nconsole.log(\"Hi. Ok\");\n```\nDopo.";
    expect(insertSentenceBreaks(text)).toBe(text);
  });
});
