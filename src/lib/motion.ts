/**
 * Le animazioni della piattaforma: quattro categorie, e non una di più.
 *
 * Prima esistevano rivelamenti orizzontali (`x: 50`, `x: -8`) mescolati a
 * rivelamenti verticali (`y: 20`, `y: 30`): la stessa piattaforma si muoveva
 * in due direzioni diverse a seconda della sezione. Le categorie qui sotto
 * sono le uniche ammesse, e i preset le applicano: la coerenza è nel codice,
 * non nella buona volontà di chi scrive la prossima animazione.
 *
 *   1. `reveal`  — comparsa allo scroll: sale dal basso (verticale).
 *   2. `enter`   — entrata in sequenza (badge, voci di una lista): sale
 *                  dal basso, mai di lato.
 *   3. `overlay` — modali e pannelli sovrapposti: compaiono dal centro
 *                  (scala), senza traslazione.
 *   4. `panel`   — pannello laterale (menu mobile): scorre sul suo asse, è
 *                  un movimento funzionale, non un rivelamento.
 *
 * Regola: se un'animazione non sta in nessuna di queste categorie, non la si
 * scrive: si sceglie la categoria più vicina.
 */

/** Comparsa allo scroll: sale dal basso. */
export function reveal(distance = 16, duration = 0.5) {
  return {
    initial: { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration },
  } as const;
}

/** Entrata in sequenza: sale dal basso, con un ritardo per l'ordine. */
export function enter(distance = 10, duration = 0.35, delay = 0) {
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance },
    transition: { duration, delay },
  } as const;
}

/** Modale: compare dal centro, ingrandendosi. */
export function overlay(scale = 0.98, duration = 0.25) {
  return {
    initial: { opacity: 0, scale },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale },
    transition: { duration },
  } as const;
}

/** Pannello laterale: scorre sul suo asse. */
export function panel(offset = "100%", duration = 0.3) {
  return {
    initial: { x: offset },
    animate: { x: 0 },
    exit: { x: offset },
    transition: { duration },
  } as const;
}
