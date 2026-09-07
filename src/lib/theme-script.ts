export const THEME_STORAGE_KEY = "agentcloud_theme";

export function themeInitScript(): string {
  return `(() => {
  try {
    const t = localStorage.getItem('${THEME_STORAGE_KEY}') || 'dark';
    const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const r = t === 'system' ? sys : (t === 'light' || t === 'dark' ? t : 'dark');
    document.documentElement.classList.remove('light','dark');
    document.documentElement.classList.add(r);
    document.documentElement.setAttribute('data-theme', r);
  } catch {}
})();`;
}
