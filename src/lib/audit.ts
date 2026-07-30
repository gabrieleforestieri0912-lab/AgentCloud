export function logAudit(action: string, payload: Record<string, any>) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      action,
      payload,
    };
    // Persist to console and to a rotating file (basic implementation)
    console.info("AUDIT", JSON.stringify(entry));
    try {
      const fs = require("fs");
      const path = require("path");
      const logDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const file = path.join(
        logDir,
        `audit-${new Date().toISOString().slice(0, 10)}.log`,
      );
      fs.appendFileSync(file, JSON.stringify(entry) + "\n");
    } catch (e) {
      // ignore file errors in non-server environments
    }
  } catch (e) {
    // avoid throwing in audit
    console.error("AUDIT ERROR", e);
  }
}
