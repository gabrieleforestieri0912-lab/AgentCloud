import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_ROLE,
  isAdminEmail,
  isAdminRole,
  parseAdminEmails,
} from "./admin-access";

const ORIGINAL = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ORIGINAL;
});

describe("parseAdminEmails", () => {
  it("normalizza spazi, maiuscole e duplicati", () => {
    expect(parseAdminEmails(" A@X.com , b@x.com ,A@x.com ")).toEqual([
      "a@x.com",
      "b@x.com",
    ]);
  });

  it("scarta le voci vuote e i valori assenti", () => {
    expect(parseAdminEmails("a@x.com,,  ,")).toEqual(["a@x.com"]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });
});

describe("isAdminEmail", () => {
  it("confronta senza distinguere maiuscole e spazi", () => {
    process.env.ADMIN_EMAILS = "owner@vertex.dev,secondo@vertex.dev";
    expect(isAdminEmail("owner@vertex.dev")).toBe(true);
    expect(isAdminEmail("  OWNER@Vertex.DEV  ")).toBe(true);
    expect(isAdminEmail("secondo@vertex.dev")).toBe(true);
  });

  it("rifiuta email non in lista e valori vuoti", () => {
    process.env.ADMIN_EMAILS = "owner@vertex.dev";
    expect(isAdminEmail("estraneo@example.com")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("senza ADMIN_EMAILS nessuna email e' admin (nessun fallback hardcodato)", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("gabriele.forestieri0912@gmail.com")).toBe(false);
  });
});

describe("isAdminRole", () => {
  it("riconosce solo il ruolo admin, senza distinguere maiuscole", () => {
    expect(ADMIN_ROLE).toBe("admin");
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole(" ADMIN ")).toBe(true);
  });

  it("rifiuta gli altri ruoli e i valori vuoti", () => {
    expect(isAdminRole("member")).toBe(false);
    expect(isAdminRole("beta_tester")).toBe(false);
    expect(isAdminRole("internal_qa")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("")).toBe(false);
  });
});
