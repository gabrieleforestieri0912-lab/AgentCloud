import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing RESEND_API_KEY environment variable. Set it in .env.local or your hosting provider.",
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}
