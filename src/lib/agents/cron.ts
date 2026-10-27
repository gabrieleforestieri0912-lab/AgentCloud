/**
 * Cron per gli `agent_schedules` (Fase 3).
 *
 * Sintassi: 5 campi `minuto ora giorno-mese mese giorno-settimana`
 * (standard crontab: stella, passo-n, intervalli a-b, liste a,b,c). La
 * validazione e il calcolo delle prossime occorrenze vivono qui; l'esito è
 * un codice stabile che l'API restituisce all'utente.
 *
 * D10/D8: il calcolo è per-timezone (DST corretto: `cron-parser` ragiona in
 * ora locale dello schedule e proietta su UTC) e la frequenza minima (1h
 * nella beta) è verificata per differenza tra le prime due occorrenze.
 */

import { CronExpressionParser } from "cron-parser";

export type CronValidation =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type ScheduleFrequencyPreset =
  | "hourly"
  | "daily"
  | "weekly"
  | "weekdays"
  | "custom";

export const SCHEDULE_PRESETS: ScheduleFrequencyPreset[] = [
  "hourly",
  "daily",
  "weekdays",
  "weekly",
];

export const SCHEDULE_TIMEZONES = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "UTC",
] as const;

function validateField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;
  for (const part of field.split(",")) {
    if (part === "") return false;
    // Forme ammesse: n · a-b · n/m · a-b/m
    const range = part.split("/");
    const bounds = range[0].split("-");
    for (const bound of bounds) {
      if (bound === "") return false;
      const value = Number(bound);
      if (!Number.isInteger(value) || value < min || value > max) return false;
    }
    if (bounds.length > 2) return false;
    // Intervalli "avvolti" (es. 5-3) non supportati: ambiguità inutile.
    if (
      bounds.length === 2 &&
      Number(bounds[0]) > Number(bounds[1])
    ) {
      return false;
    }
    if (range[1] !== undefined && !/^\d+$/.test(range[1])) return false;
  }
  return true;
}

export function validateCron(cron: string): CronValidation {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      return {
        ok: false,
        code: "cron_fields",
        message: "La cron deve avere 5 campi (minuti ore giorno mese settimana).",
      };
    }
    const [minute, hour, dom, month, dow] = parts;
    if (!validateField(minute, 0, 59) || !validateField(hour, 0, 23)) {
      return {
        ok: false,
        code: "cron_time_fields",
        message: "I campi di minuti o ore non sono validi.",
      };
    }
    if (
      !validateField(dom, 1, 31) ||
      !validateField(month, 1, 12) ||
      !validateField(dow, 0, 6)
    ) {
      return {
        ok: false,
        code: "cron_date_fields",
        message:
          "I campi di giorno-mese, mese o giorno-settimana non sono validi.",
      };
    }
    // Il parser conferma che esistono occorrenze reali (es. 31 2 30 è
    // sintatticamente valido ma senza date possibili).
    const parsed = CronExpressionParser.parse(cron.trim());
    if (!parsed.next()) throw new Error("no occurrence");
    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "cron_invalid",
      message: "La cron non può essere interpretata.",
    };
  }
}

/** Verifica che `tz` sia un fuso orario IANA riconosciuto. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Prossime occorrenze (ISO UTC) di uno schedule, nel suo timezone.
 * `count` default 6: la prima è `next_run_at`, le altre servono
 * all'anteprima della UI.
 */
export function nextRuns(
  cron: string,
  timezone: string,
  count: number = 6,
  fromDate?: Date,
): string[] {
  const parsed = CronExpressionParser.parse(cron.trim(), {
    tz: timezone,
    currentDate: fromDate,
  });
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    const iso = parsed.next().toISOString();
    if (!iso) throw new Error("no occurrence");
    results.push(iso);
  }
  return results;
}

/**
 * D8 (beta): frequenza minima di uno schedule = 1 ora. Verificata sulla
 * differenza tra le prime due occorrenze consecutive: "30 minuti" viene
 * respinta, "0 * * * *" passa.
 */
export function isHourlyAtMost(cron: string): boolean {
  try {
    const runs = nextRuns(cron, "UTC", 2);
    const second = new Date(runs[1]).getTime();
    const first = new Date(runs[0]).getTime();
    return second - first >= 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Valida tutto ciò che serve alla API POST/PATCH: cron, timezone, D8.
 * Restituisce la stessa struttura di `validateCron` per un esito uniforme.
 */
export function validateScheduleInput(
  cron: string,
  timezone: string,
): CronValidation {
  const cronCheck = validateCron(cron);
  if (!cronCheck.ok) return cronCheck;
  if (!isValidTimezone(timezone)) {
    return {
      ok: false,
      code: "timezone_invalid",
      message: "Il fuso orario non è valido.",
    };
  }
  if (!isHourlyAtMost(cron)) {
    return {
      ok: false,
      code: "cron_too_frequent",
      message: "La frequenza minima è 1 ora.",
    };
  }
  return { ok: true };
}

/** Dalla selezione della UI (preset + opzioni) all'espressione cron. */
export function buildCronFromPreset(
  preset: ScheduleFrequencyPreset,
  opts: { minute?: number; hour?: number; weekday?: number },
): string {
  const minute = String(opts.minute ?? 0);
  const hour = String(opts.hour ?? 8);
  const weekday = String(opts.weekday ?? 1);
  switch (preset) {
    case "hourly":
      return `${minute} * * * *`;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly":
      return `${minute} ${hour} * * ${weekday}`;
    case "weekdays":
      return `${minute} ${hour} * * 1-5`;
    default:
      return `${minute} ${hour} * * 1`;
  }
}
