# Tokamak Design

Extract a **DESIGN.md** from any website — colors, typography, and spacing in one file. Following [Google's open DESIGN.md standard](https://github.com/google-labs-code/design.md).

Built for the Tokamak Network team. Forked from [hyperbrowserai/hyperbrowser-app-examples · hyperdesign](https://github.com/hyperbrowserai/hyperbrowser-app-examples/tree/main/hyperdesign).

## What changed from the upstream

- **No Hyperbrowser dependency** — uses local Playwright Chromium for screenshots and page text extraction. No remote browser quotas.
- **LiteLLM proxy instead of direct Anthropic SDK** — the LLM call goes through Tokamak's OpenAI-compatible LiteLLM proxy (`api.ai.tokamak.network`), so any model the proxy exposes can be used (e.g. `gemini-3.1-pro`, `gpt-5.2-pro`).
- **Rebranded UI** — Tokamak Network logo + Geist font, soft Vercel-style chrome.

## Quick start (local)

```bash
npm install
npx playwright install chromium
cp .env.example .env
# fill in LITELLM_API_KEY in .env
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

| Name                | Required | Default                                  | Description                                      |
| ------------------- | -------- | ---------------------------------------- | ------------------------------------------------ |
| `LITELLM_BASE_URL`  | yes      | —                                        | LiteLLM proxy base URL (must include `/v1`)      |
| `LITELLM_API_KEY`   | yes      | —                                        | LiteLLM proxy key                                |
| `LITELLM_MODEL`     | no       | `gemini-3.1-pro`                         | Model name as exposed by the proxy               |

For Vercel: register the same three variables under Project → Settings → Environment Variables.

## How it works

1. **Capture** — Local Playwright launches Chromium, navigates to the URL, takes viewport + full-page PNG, and pulls page text (title, meta, headings, paragraphs) in a single session.
2. **Analyze** — The screenshot + extracted text go to the LiteLLM proxy as a multimodal chat completion. The model emits a `DESIGN.md` only.
3. **Render** — The API parses YAML frontmatter into design tokens; raw markdown is shown with line numbers; copy/download buttons.

## Tech

- Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript
- `openai` SDK pointed at LiteLLM
- `playwright` (local Chromium)
- Geist font (Vercel)
- Spec: [google-labs-code/design.md](https://github.com/google-labs-code/design.md)

## Deploying to Fly.io

The app needs Chromium at runtime, so we ship as a Docker container instead of using Vercel/Edge. The provided `Dockerfile` is based on Microsoft's official Playwright image (Chromium + system deps preinstalled) and `fly.toml` configures a 1GB shared-cpu-1x VM with auto stop/start (idle → 0 cost).

```bash
# 1. install flyctl once (https://fly.io/docs/hands-on/install-flyctl/)
brew install flyctl
fly auth login

# 2. from the project root, create the app on Fly
#    (or rename the `app` field in fly.toml first)
fly launch --no-deploy --copy-config --name tokamak-design --region nrt

# 3. register secrets (do NOT commit these)
fly secrets set \
  LITELLM_BASE_URL=https://api.ai.tokamak.network/v1 \
  LITELLM_API_KEY=sk-... \
  LITELLM_MODEL=gemini-3.1-pro

# 4. deploy
fly deploy
```

After deploy, `fly status` shows the URL. The machine sleeps when idle and wakes on the next request (~1–2 s cold start).

### Why not Vercel?

Vercel Functions are short-lived serverless containers without a Chromium binary, so `chromium.launch()` from `lib/browser.ts` fails at runtime. Fly.io runs a full Linux container, which Playwright supports out of the box.

## License

MIT — same as the upstream Hyperbrowser examples.
