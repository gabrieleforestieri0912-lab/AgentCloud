/* eslint-disable */
const puppeteer = require("puppeteer-core");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ORIGIN = "http://localhost:3000";

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.setExtraHTTPHeaders({ "Accept-Language": "it-IT,it;q=0.9" });

  await page.goto(ORIGIN + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Trova il bottone hamburger (classe lg:hidden nel MobileNav).
  const btn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    return btns.find((b) => b.className.includes("lg:hidden") && b.getAttribute("aria-label")) || null;
  });
  const hasBtn = await page.evaluate((el) => !!el, btn);
  console.log("hamburger trovato:", hasBtn);

  let openState = null;
  if (hasBtn) {
    await page.evaluate((el) => el.click(), btn);
    await new Promise((r) => setTimeout(r, 700));
    openState = await page.evaluate(() => ({
      bodyOverflow: document.body.style.overflow,
      panelWidths: Array.from(document.querySelectorAll("div")).filter((d) => {
        const cs = getComputedStyle(d);
        return cs.position === "fixed" && d.className.includes("right-0");
      }).map((d) => Math.round(d.getBoundingClientRect().width)),
      innerWidth: window.innerWidth,
    }));
    console.log("menu aperto:", JSON.stringify(openState));

    // Chiudi con il bottone X e verifica il rilascio dello scroll lock.
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const close = btns.find((b) => b.className.includes("lg:hidden") && b.getAttribute("aria-label") && /chiudi|close/i.test(b.getAttribute("aria-label")));
      (close || btns.find((b) => /chiudi|close/i.test(b.getAttribute("aria-label") || "")))?.click();
    });
    await new Promise((r) => setTimeout(r, 700));
    const closed = await page.evaluate(() => document.body.style.overflow);
    console.log("scroll lock dopo chiusura:", JSON.stringify(closed));
  }

  // Footer: altezza dei link di contatto/social (target touch).
  const footer = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("footer a")).map((a) => ({
      text: (a.textContent || "").trim().slice(0, 20),
      h: Math.round(a.getBoundingClientRect().height),
    }));
    return links.filter((l) => l.text);
  });
  console.log("footer link heights:", JSON.stringify(footer.slice(0, 12)));

  // Overflow residuo su / con safety net disattivata.
  const of = await page.evaluate(() => {
    const s = document.createElement("style");
    s.textContent = "html,body{overflow-x:visible !important}";
    document.head.appendChild(s);
    return { doc: document.documentElement.scrollWidth, win: window.innerWidth };
  });
  console.log("overflow /:", JSON.stringify(of), of.doc > of.win + 1 ? "OVERFLOW" : "ok");

  await browser.close();
}

main().catch((e) => {
  console.error("FAIL:", e.message || e);
  process.exit(1);
});
