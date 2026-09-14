import { describe, expect, it } from "vitest";
import { accountIdentityFromUser } from "./account-identity";

/**
 * L'identità dell'account alimenta le sidebar di chat e dashboard: deve
 * funzionare sia per gli utenti Google (`full_name` + `avatar_url`/`picture`)
 * sia per quelli creati con email e password (solo email).
 */
describe("accountIdentityFromUser", () => {
  it("legge email e nome/avatar di un account Google", () => {
    const identity = accountIdentityFromUser({
      email: "gabriele.forestieri0912@gmail.com",
      user_metadata: {
        full_name: "Gabriele Forestieri",
        avatar_url: "https://lh3.googleusercontent.com/a/photo=s96-c",
      },
    } as never);

    expect(identity).toEqual({
      email: "gabriele.forestieri0912@gmail.com",
      name: "Gabriele Forestieri",
      avatarUrl: "https://lh3.googleusercontent.com/a/photo=s96-c",
    });
  });

  it("accetta le varianti `name` e `picture` dei metadata", () => {
    const identity = accountIdentityFromUser({
      email: "admin@agentcloud.agency",
      user_metadata: { name: "Admin", picture: "https://example.com/p.png" },
    } as never);

    expect(identity?.name).toBe("Admin");
    expect(identity?.avatarUrl).toBe("https://example.com/p.png");
  });

  it("funziona con il solo indirizzo email (login con password)", () => {
    const identity = accountIdentityFromUser({
      email: "utente@example.com",
      user_metadata: {},
    } as never);

    expect(identity).toEqual({
      email: "utente@example.com",
      name: null,
      avatarUrl: null,
    });
  });

  it("restituisce null quando non c'è niente da mostrare", () => {
    expect(accountIdentityFromUser(null)).toBeNull();
    expect(accountIdentityFromUser(undefined)).toBeNull();
    expect(
      accountIdentityFromUser({ email: "", user_metadata: {} } as never),
    ).toBeNull();
  });
});
