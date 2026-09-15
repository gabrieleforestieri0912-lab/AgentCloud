import { describe, expect, it } from "vitest";
import { getDictionary, t, type Dictionary } from "./dictionaries";
import { LOCALES } from "./constants";

function getLeafPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  let paths: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths = paths.concat(getLeafPaths(value as Record<string, unknown>, full));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

describe("dictionaries alignment", () => {
  const dictIt = getDictionary("it");
  const itPaths = getLeafPaths(dictIt as unknown as Record<string, unknown>).sort();

  for (const locale of LOCALES.filter((l) => l !== "it")) {
    it(`locale ${locale} ha esattamente le stesse chiavi di it`, () => {
      const locDict = getDictionary(locale);
      const locPaths = getLeafPaths(locDict as unknown as Record<string, unknown>).sort();

      const missing = itPaths.filter((p) => !locPaths.includes(p));
      const extra = locPaths.filter((p) => !itPaths.includes(p));

      expect(missing, `Chiavi mancanti in ${locale}`).toEqual([]);
      expect(extra, `Chiavi extra in ${locale}`).toEqual([]);
    });
  }

  it("non ci sono stringhe vuote nel dizionario italiano", () => {
    function checkEmpty(obj: Record<string, unknown>, path = "") {
      for (const [k, v] of Object.entries(obj)) {
        const full = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          expect(v.trim().length, `Stringa vuota in ${full}`).toBeGreaterThan(0);
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          checkEmpty(v as Record<string, unknown>, full);
        }
      }
    }
    checkEmpty(dictIt as unknown as Record<string, unknown>);
  });

  it("funzione t() interpola correttamente i token", () => {
    expect(t("Ciao {name}, hai {count} messaggi", { name: "Mario", count: 5 })).toBe(
      "Ciao Mario, hai 5 messaggi",
    );
    expect(t("Senza token", {})).toBe("Senza token");
    expect(t("Token {assente}", {})).toBe("Token {assente}");
  });
});
