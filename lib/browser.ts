import { chromium, type Page } from "playwright";

export interface Screenshots {
  /** Viewport-only — sent to the AI for analysis (better token efficiency). */
  viewport: string;
  /** Full scrollable page — shown in the lightbox. */
  fullPage: string;
}

export interface PageCapture {
  screenshots: Screenshots;
  markdown: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Capture viewport + full-page screenshots and page text using a locally
 * launched Chromium. No remote service, no quotas.
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
        viewport: { width: 1920, height: 1080 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();

      progress("Navigating to URL");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

      progress("Waiting for content to settle");
      await page
        .waitForLoadState("networkidle", { timeout: 8_000 })
        .catch(() => undefined);
      await page.waitForTimeout(1_200);

      progress("Capturing screenshots");
      const [viewportBuf, fullPageBuf, extracted] = await Promise.all([
        page.screenshot({ type: "png" }),
        page.screenshot({ type: "png", fullPage: true }),
        extractPageText(page),
      ]);

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
