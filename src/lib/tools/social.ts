/**
 * Tool Social Media: calendario editoriale settimanale e pianificazione post
 * locale (markdown scaricabile; la pubblicazione su Buffer/Meta è opzionale,
 * prevista via env in futuro).
 *
 * Come funziona: il calendario viene generato per piattaforma e fascia oraria
 * ottimale; i post pianificati vengono salvati come file markdown scaricabile
 * invece di pubblicare davvero sui social.
 */

export type EditorialPost = {
  day: string;
  platform: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
};

export type EditorialCalendar = {
  brand: string;
  topic: string;
  weekOf: string;
  posts: EditorialPost[];
};

const WEEKDAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const DEFAULT_PLATFORMS = ["Instagram", "LinkedIn", "TikTok"];

function splitList(value: string | undefined, fallback: string[]): string[] {
  if (!value?.trim()) return fallback;
  return value
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hashtagsFor(topic: string, platform: string): string[] {
  const base = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .map((w) => w.replace(/[^a-z0-9à-ÿ]/gi, ""));
  const tags = [...base, "content", platform.toLowerCase()].filter(Boolean);
  return [...new Set(tags)].slice(0, 6).map((t) => `#${t}`);
}

export function generateEditorialCalendar(params: {
  topic: string;
  brand?: string;
  platforms?: string;
  postsCount?: number;
  language?: string;
}): EditorialCalendar {
  const topic = params.topic.trim() || "brand";
  const brand = params.brand?.trim() || "Brand";
  const platforms = splitList(params.platforms, DEFAULT_PLATFORMS);
  const count = Math.min(7, Math.max(5, params.postsCount || 7));
  const lang = (params.language || "it").toLowerCase();
  const it = lang.startsWith("it");

  const angles = it
    ? [
        "Dietro le quinte",
        "Errore comune da evitare",
        "Mini-guida pratica",
        "Social proof / risultato",
        "Mito da sfatare",
        "Checklist rapida",
        "Domanda alla community",
      ]
    : [
        "Behind the scenes",
        "Common mistake",
        "Quick how-to",
        "Social proof",
        "Myth to bust",
        "Rapid checklist",
        "Community question",
      ];

  const ctas = it
    ? ["Salva il post", "Commenta la tua esperienza", "Condividi con un collega", "Iscriviti alla newsletter"]
    : ["Save this post", "Comment your take", "Share with a colleague", "Join the newsletter"];

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const posts: EditorialPost[] = [];
  for (let i = 0; i < count; i++) {
    const platform = platforms[i % platforms.length];
    const angle = angles[i % angles.length];
    const hook = `${angle}: ${topic}`;
    const caption = it
      ? `${hook}.\n\n${brand} ti mostra un punto concreto su ${topic} — niente teoria astratta, solo un'azione che puoi fare oggi.\n\nQuale passo vuoi approfondire?`
      : `${hook}.\n\n${brand} on ${topic}: one concrete action you can take today.\n\nWhat should we go deeper on?`;
    posts.push({
      day: WEEKDAYS[i % 7],
      platform,
      hook,
      caption,
      hashtags: hashtagsFor(topic, platform),
      cta: ctas[i % ctas.length],
    });
  }

  return {
    brand,
    topic,
    weekOf: monday.toISOString().slice(0, 10),
    posts,
  };
}

export function formatEditorialCalendarMarkdown(cal: EditorialCalendar): string {
  const lines = [
    `# Calendario editoriale — ${cal.brand}`,
    `**Tema:** ${cal.topic}`,
    `**Settimana dal:** ${cal.weekOf}`,
    "",
  ];
  for (const post of cal.posts) {
    lines.push(
      `## ${post.day} · ${post.platform}`,
      `**Hook:** ${post.hook}`,
      "",
      post.caption,
      "",
      post.hashtags.join(" "),
      `**CTA:** ${post.cta}`,
      "",
    );
  }
  return lines.join("\n");
}

export type ScheduledPost = {
  platform: string;
  scheduledAt: string;
  caption: string;
  hashtags: string[];
  filename: string;
};

export function schedulePost(params: {
  platform: string;
  scheduledAt: string;
  caption: string;
  hashtags?: string;
}): { post: ScheduledPost; markdown: string; filePayload: string } {
  const platform = params.platform.trim() || "Instagram";
  const scheduledAt = params.scheduledAt.trim() || new Date().toISOString();
  const caption = params.caption.trim();
  const hashtags = splitList(params.hashtags, []).map((t) =>
    t.startsWith("#") ? t : `#${t.replace(/^#/, "")}`,
  );
  const slug = `${platform}-${scheduledAt}`.replace(/[^\w.-]+/g, "-").slice(0, 60);
  const filename = `post-${slug}.md`;

  const markdown = [
    `# Post ${platform}`,
    `**Quando:** ${scheduledAt}`,
    `**Stato:** pianificato (file locale — pubblica dal tuo tool social)`,
    "",
    caption,
    "",
    hashtags.join(" "),
  ].join("\n");

  const post: ScheduledPost = { platform, scheduledAt, caption, hashtags, filename };
  const filePayload = JSON.stringify({
    type: "file_created",
    filename,
    content: markdown,
    downloadable: true,
    scheduled: true,
    platform,
    scheduledAt,
  });

  return { post, markdown, filePayload };
}
