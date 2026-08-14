import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "ar-EG" });
const results = [];

for (const path of ["/", "/pricing", "/login", "/signup"]) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  results.push({ path, status: response?.status() ?? null, title: await page.title() });
}

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
const homeText = await page.locator("body").innerText();
const homeChecks = {
  hero: homeText.includes("إدارة أكاديميتك أصبحت أوضح وأسهل"),
  features: homeText.includes("ركّز على التعليم، واترك التنظيم لنا"),
  cta: homeText.includes("جاهز لترتيب أكاديميتك؟"),
  mobileOverflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
};

await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
await page.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
const pricingChecks = {
  headline: (await page.locator("body").innerText()).includes("ابدأ مجانًا، وتوسّع بثقة"),
  plans: await page.locator("article").count(),
  mobileOverflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
};

console.log(JSON.stringify({ results, homeChecks, pricingChecks }, null, 2));
await browser.close();
