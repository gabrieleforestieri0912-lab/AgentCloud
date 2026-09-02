import { describe, expect, it } from "vitest";
import { createWordEmitter } from "./stream";

describe("createWordEmitter", () => {
  it("emits the text one word at a time, in order", async () => {
    const words: string[] = [];
    const emitter = createWordEmitter((word) => words.push(word));

    emitter.push("Ciao **mondo**!");
    emitter.push(" Come va?");
    await emitter.flush();

    expect(words).toEqual(["Ciao", " ", "**mondo**!", " ", "Come", " ", "va?"]);
    expect(words.join("")).toBe("Ciao **mondo**! Come va?");
  });

  it("keeps markdown tokens and newlines intact", async () => {
    const words: string[] = [];
    const emitter = createWordEmitter((word) => words.push(word));

    emitter.push("- **Punto** uno\n- Due");
    await emitter.flush();

    expect(words.join("")).toBe("- **Punto** uno\n- Due");
    expect(words).toContain("**Punto**");
    expect(words).toContain("\n");
  });

  it("drops pending words on stop()", async () => {
    const words: string[] = [];
    const emitter = createWordEmitter((word) => words.push(word));

    emitter.push("primo secondo terzo");
    emitter.stop();
    await emitter.flush();

    expect(words.join("")).not.toContain("secondo");
  });
});
