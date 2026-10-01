/**
 * Ridimensiona gli URL degli avatar remoti a una misura piccola.
 *
 * Gli avatar Google (`https://lh3.googleusercontent.com/...=s96-c`) servono
 * l'immagine alla dimensione richiesta nel suffisso: chiedere `=s200-c` per un
 * avatar mostrato a 28–36px scarica ~4× i pixel necessari. Questo helper
 * riscrive il suffisso alla dimensione voluta (default 64px, sufficiente per i
 * display 2x) senza toccare gli altri provider.
 *
 * Client-safe: nessuna dipendenza, solo stringhe.
 */
export function avatarThumbnail(url: string | null | undefined, size = 64): string | null {
  if (!url) return null;
  if (!url.includes("googleusercontent.com")) return url;
  // Varianti Google: `=s96-c`, `=s96`, `=w96-h96-c`.
  if (/=s\d+(-c)?$/.test(url)) return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
  if (/=w\d+-h\d+(-c)?$/.test(url)) return url.replace(/=w\d+-h\d+(-c)?$/, `=s${size}-c`);
  return url;
}
