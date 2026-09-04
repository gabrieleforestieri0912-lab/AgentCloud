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

  it("stops permanently when the consumer closes the stream (onWord throws)", async () => {
    const words: string[] = [];
    const emitter = createWordEmitter((word) => {
      words.push(word);
      // Mimics controller.enqueue() after the client disconnected from the
      // SSE response: previously this escaped the timer callback as an
      // uncaughtException.
      throw new Error("Invalid state: Controller is already closed");
    });

    emitter.push("primo secondo terzo");
    await emitter.flush(); // must resolve, never reject or hang

    expect(words.join("")).toBe("primo");

    // Pushes after the stream died are ignored (no new timers scheduled).
    emitter.push("quarto");
    await emitter.flush();
    expect(words.join("")).toBe("primo");
  });
});
