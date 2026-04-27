import { chromium, type BrowserContext, type Page } from "playwright";

export interface Screenshots {
  /** Viewport-only — sent to the AI for analysis (better token efficiency). */
  viewport: string;
  /** Capped full page — shown in the lightbox. */
  fullPage: string;
}

export interface PageCapture {
  screenshots: Screenshots;
  markdown: string;
}

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 800;
const FULL_PAGE_MAX_HEIGHT = 4000;

/**
 * Third-party hosts whose responses don't influence rendering but routinely
 * keep the network "busy" past `networkidle`. Aborting them lets us finish
 * waiting sooner and shaves seconds off heavy SaaS landing pages.
 */
const BLOCKED_HOST_FRAGMENTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "facebook.net",
  "connect.facebook.net",
  "hotjar.com",
  "static.hotjar.com",
  "intercom.io",
  "intercomcdn.com",
  "segment.com",
  "segment.io",
  "amplitude.com",
  "mixpanel.com",
  "fullstory.com",
  "clarity.ms",
  "hs-scripts.com",
  "hubspot.com",
  "pardot.com",
  "marketo.net",
  "linkedin.com/li/track",
  "tiktok.com/i18n/pixel",
  "snap.licdn.com",
];

async function blockTrackers(context: BrowserContext): Promise<void> {
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (BLOCKED_HOST_FRAGMENTS.some((frag) => url.includes(frag))) {
      route.abort().catch(() => undefined);
      return;
    }
    route.continue().catch(() => undefined);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capture viewport + capped full-page screenshots and page text using a
 * locally launched Chromium. No remote service, no quotas.
 */
export async function capturePage(
  url: string,
  options: {
    timeoutMs?: number;
    retries?: number;
    onProgress?: (text: string) => void;
  } = {}
): Promise<PageCapture> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const retries = options.retries ?? 2;
  const progress = options.onProgress ?? (() => {});

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      progress("Launching browser");
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      });
      await blockTrackers(context);
      const page = await context.newPage();

      progress("Navigating to URL");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

      progress("Waiting for content to settle");
      await page
        .waitForLoadState("networkidle", { timeout: 8_000 })
        .catch(() => undefined);
      await page.waitForTimeout(1_200);

      progress("Capturing viewport + extracting text");
      const [viewportBuf, extracted] = await Promise.all([
        page.screenshot({ type: "png" }),
        extractPageText(page),
      ]);

      progress("Capturing full page");
      const fullPageHeight = Math.min(
        await page
          .evaluate(() => document.documentElement.scrollHeight || 0)
          .catch(() => VIEWPORT_HEIGHT),
        FULL_PAGE_MAX_HEIGHT
      );
      await page.setViewportSize({
        width: VIEWPORT_WIDTH,
        height: Math.max(fullPageHeight, VIEWPORT_HEIGHT),
      });
      const fullPageBuf = await page.screenshot({ type: "png" });

      progress("Done");
      return {
        screenshots: {
          viewport: viewportBuf.toString("base64"),
          fullPage: fullPageBuf.toString("base64"),
        },
        markdown: extracted,
      };
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(500 * 2 ** attempt);
      attempt += 1;
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }

  throw new Error(
    `Failed to capture page: ${
      lastError instanceof Error ? lastError.message : "Unknown error"
    }`
  );
}

async function extractPageText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const title = document.title || "";
    const meta = (name: string) =>
      document
        .querySelector(`meta[name="${name}"], meta[property="${name}"]`)
        ?.getAttribute("content") || "";
    const description = meta("description") || meta("og:description");

    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
      .map((el) => {
        const tag = el.tagName.toLowerCase();
        const level = Number(tag[1]);
        const text = (el.textContent || "").trim();
        return text ? `${"#".repeat(level)} ${text}` : "";
      })
      .filter(Boolean)
      .slice(0, 80);

    const paragraphs = Array.from(document.querySelectorAll("p, li"))
      .map((el) => (el.textContent || "").trim())
      .filter((t) => t.length > 30)
      .slice(0, 60);

    return [
      `# ${title}`,
      description ? `> ${description}` : "",
      "",
      ...headings,
      "",
      ...paragraphs,
    ]
      .filter(Boolean)
      .join("\n");
  });
}
