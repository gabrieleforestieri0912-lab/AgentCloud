/**
 * HR Recruiter tools: structured CV parsing and candidate scoring.
 */

export type ParsedCv = {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  experience: string;
  education: string;
  summary: string;
};

export type CandidateScore = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  rationale: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+|00)?[\d][\d\s().-]{7,16}\d/;

function section(text: string, headings: string[]): string {
  const src = text.replace(/\r\n/g, "\n");
  const pattern = new RegExp(
    `(?:^|\\n)\\s*(?:${headings.join("|")})\\s*[:\\-]?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:esperienza|experience|istruzione|education|competenze|skills|lingue|languages|profilo|summary|contatti|contact)\\b|$)`,
    "i",
  );
  return src.match(pattern)?.[1]?.trim() || "";
}

function tokenizeSkills(block: string): string[] {
  return block
    .split(/[,;•|\n\/]/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 48)
    .slice(0, 40);
}

function guessName(text: string, email: string | null): string | null {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/curriculum|resume|cv\b/i.test(line)) continue;
    if (/^[A-Za-zÀ-ÿ'’. -]{3,60}$/.test(line) && line.split(/\s+/).length <= 5) {
      return line;
    }
  }
  if (email) {
    const local = email.split("@")[0].replace(/[._-]/g, " ");
    return local.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}

export function parseCv(cvText: string): ParsedCv {
  const text = (cvText || "").trim();
  const email = text.match(EMAIL_RE)?.[0] || null;
  const phone = text.match(PHONE_RE)?.[0]?.replace(/\s+/g, " ").trim() || null;

  const skillsBlock =
    section(text, ["competenze", "skills", "skill", "tecnologie", "technologies"]) ||
    "";
  const experience = section(text, ["esperienza", "esperienze", "experience", "work experience"]);
  const education = section(text, ["istruzione", "formazione", "education", "studies"]);

  let skills = tokenizeSkills(skillsBlock);
  if (skills.length === 0) {
    const common = [
      "javascript",
      "typescript",
      "python",
      "react",
      "node",
      "sql",
      "excel",
      "sales",
      "marketing",
      "hr",
      "recruiting",
      "english",
      "italiano",
      "project management",
      "shopify",
      "seo",
    ];
    const lower = text.toLowerCase();
    skills = common.filter((k) => lower.includes(k));
  }

  const summary = text.slice(0, 600).replace(/\s+/g, " ").trim();

  return {
    name: guessName(text, email),
    email,
    phone,
    skills,
    experience: experience.slice(0, 1500),
    education: education.slice(0, 800),
    summary,
  };
}

export function formatParsedCvMarkdown(cv: ParsedCv): string {
  return [
    `# CV analizzato`,
    `**Nome:** ${cv.name || "n/d"}`,
    `**Email:** ${cv.email || "n/d"}`,
    `**Telefono:** ${cv.phone || "n/d"}`,
    `**Competenze:** ${cv.skills.length ? cv.skills.join(", ") : "n/d"}`,
    "",
    `## Esperienza`,
    cv.experience || "_Non rilevata una sezione esperienza._",
    "",
    `## Istruzione`,
    cv.education || "_Non rilevata una sezione istruzione._",
  ].join("\n");
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9+#.]/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

export function scoreCandidate(params: {
  cvText?: string;
  skills?: string[];
  jobDescription: string;
}): CandidateScore {
  const parsed = params.cvText ? parseCv(params.cvText) : null;
  const candidateSkills = [
    ...(params.skills || []),
    ...(parsed?.skills || []),
  ].map((s) => s.toLowerCase());

  const jd = params.jobDescription || "";
  const jdTokens = new Set(normalizeTokens(jd));
  const skillNeedles = candidateSkills.length
    ? candidateSkills
    : normalizeTokens(parsed?.summary || params.cvText || "");

  const uniqueNeedles = [...new Set(skillNeedles)];
  const matchedSkills = uniqueNeedles.filter(
    (s) => jd.toLowerCase().includes(s) || [...jdTokens].some((t) => s.includes(t) || t.includes(s)),
  );
  const missingFromJd = [...jdTokens].filter((t) => t.length >= 5).slice(0, 12);
  const missingSkills = missingFromJd.filter(
    (t) => !uniqueNeedles.some((s) => s.includes(t) || t.includes(s)),
  );

  const overlap = matchedSkills.length;
  const denom = Math.max(uniqueNeedles.length, 8);
  const score = Math.max(0, Math.min(100, Math.round((overlap / denom) * 100)));

  const rationale =
    score >= 70
      ? `Buon allineamento: ${matchedSkills.slice(0, 8).join(", ") || "competenze rilevanti"} combaciano con la job description.`
      : score >= 40
        ? `Allineamento parziale. Punti di contatto: ${matchedSkills.slice(0, 6).join(", ") || "pochi"}. Gap: ${missingSkills.slice(0, 6).join(", ") || "da approfondire in colloquio"}.`
        : `Allineamento basso rispetto alla job description. Verificare in colloquio: ${missingSkills.slice(0, 8).join(", ") || "requisiti non esplicitati nel CV"}.`;

  return { score, matchedSkills: matchedSkills.slice(0, 15), missingSkills: missingSkills.slice(0, 10), rationale };
}

export function formatCandidateScoreMarkdown(score: CandidateScore): string {
  return [
    `# Punteggio candidato: ${score.score}/100`,
    `**Match:** ${score.matchedSkills.join(", ") || "nessuno"}`,
    `**Gap:** ${score.missingSkills.join(", ") || "nessuno evidente"}`,
    "",
    score.rationale,
  ].join("\n");
}
