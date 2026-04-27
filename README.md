# Tokamak Design

Extract a `DESIGN.md` (colors, typography, spacing) from any URL.

Forked from [hyperbrowserai/hyperbrowser-app-examples · hyperdesign](https://github.com/hyperbrowserai/hyperbrowser-app-examples/tree/main/hyperdesign). Browser capture runs on local Playwright; the LLM call goes through Tokamak's LiteLLM proxy.

## Local

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill LITELLM_API_KEY
npm run dev
```

## Environment variables

| Name               | Default            | Description                                 |
| ------------------ | ------------------ | ------------------------------------------- |
| `LITELLM_BASE_URL` | —                  | LiteLLM proxy base URL (must include `/v1`) |
| `LITELLM_API_KEY`  | —                  | LiteLLM proxy key                           |
| `LITELLM_MODEL`    | `gemini-3.1-pro`   | Any model the proxy exposes                 |

## Deploy (Fly.io)

```bash
fly secrets set LITELLM_API_KEY=...
fly deploy
```

`fly.toml` and `Dockerfile` are checked in. The Playwright base image already includes Chromium. Vercel can't run Chromium in serverless functions, so we ship as a container.
