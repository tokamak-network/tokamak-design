"use client";

import { useState } from "react";
import Image from "next/image";
import UrlInput from "@/components/url-input";
import CodeOutput from "@/components/code-output";
import DesignPreview from "@/components/design-preview";
import type { DesignTokens, PageCopy } from "@/types";
import { Camera, Check, Loader2, Circle } from "lucide-react";

const buildLoadingSteps = (model: string) => [
  "Capturing viewport & scraping styles...",
  `Analyzing visual design with ${model}...`,
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [designMd, setDesignMd] = useState("");
  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [pageCopy, setPageCopy] = useState<PageCopy | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState("");
  const [fullPageDataUrl, setFullPageDataUrl] = useState("");
  const [error, setError] = useState("");
  const [modelName, setModelName] = useState("...");

  const loadingLabel = buildLoadingSteps(modelName)[stepIdx];

  const handleGenerate = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setStepIdx(0);
    setError("");
    setDesignMd("");
    setTokens(null);
    setPageCopy(null);
    setScreenshotDataUrl("");
    setFullPageDataUrl("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "step") {
            setStepIdx(event.step);
          } else if (event.type === "model") {
            setModelName(event.name);
          } else if (event.type === "screenshot") {
            setScreenshotDataUrl(`data:image/png;base64,${event.data}`);
          } else if (event.type === "fullpage") {
            setFullPageDataUrl(`data:image/png;base64,${event.data}`);
          } else if (event.type === "result") {
            setDesignMd(event.designMd);
            setTokens(event.tokens);
            if (event.pageCopy) setPageCopy(event.pageCopy);
          } else if (event.type === "error") {
            throw new Error(event.error);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white relative">
      <div
        className={
          designMd
            ? "max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-24"
            : "min-h-screen flex flex-col items-center justify-center max-w-5xl mx-auto px-4 sm:px-6 pb-24"
        }
      >
        <header className="flex flex-col items-center mb-12 relative w-full">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 text-center leading-[1.1] text-black flex items-center gap-3.5">
            <Image
              src="/logo.svg"
              alt="Tokamak Network"
              width={72}
              height={48}
              className="w-12 md:w-14 h-auto"
              priority
            />
            <span>Tokamak Design</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-md md:max-w-lg text-center leading-relaxed text-balance">
            Extract a{" "}
            <code className="text-black bg-gray-100 px-1.5 py-0.5 rounded text-[0.95em] font-mono">
              DESIGN.md
            </code>{" "}
            from any website — colors, typography, and spacing in one file.
          </p>

          <div className="mt-7 flex flex-col items-center gap-1">
            <span className="text-sm text-gray-500">
              Built for{" "}
              <a
                href="https://tokamak.network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 font-medium hover:underline underline-offset-4"
              >
                Tokamak Network
              </a>
            </span>
            <span className="text-xs text-gray-400">
              Forked from{" "}
              <a
                href="https://github.com/hyperbrowserai/hyperbrowser-app-examples/tree/main/hyperdesign"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 hover:underline underline-offset-4"
              >
                Hyperbrowser / hyperdesign
              </a>
            </span>
          </div>
        </header>

        <div className="mb-6 w-full">
          <UrlInput
            value={url}
            onChange={setUrl}
            onGenerate={handleGenerate}
            loading={loading}
            loadingLabel={loadingLabel}
          />
        </div>

        {!designMd && !loading && (
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
            <span className="text-gray-400">Try</span>
            {[
              "https://tokamak.network",
              "https://vercel.com",
              "https://linear.app",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setUrl(example)}
                className="px-2.5 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:text-black hover:border-gray-300 transition-colors"
              >
                {example.replace(/^https?:\/\//, "")}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="max-w-4xl mx-auto mt-2 mb-10 animate-in fade-in slide-in-from-bottom-2">
            <div className="border border-gray-200 bg-white rounded-xl p-5 shadow-sm">
              <ol className="space-y-2.5">
                {buildLoadingSteps(modelName).map((label, i) => {
                  const state =
                    i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                  return (
                    <li
                      key={label}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                        {state === "done" && (
                          <Check size={14} className="text-gray-900" strokeWidth={2.5} />
                        )}
                        {state === "active" && (
                          <Loader2 size={14} className="text-gray-900 animate-spin" />
                        )}
                        {state === "pending" && (
                          <Circle size={8} className="text-gray-300" fill="currentColor" />
                        )}
                      </span>
                      <span
                        className={
                          state === "done"
                            ? "text-gray-500"
                            : state === "active"
                            ? "text-gray-900 font-medium"
                            : "text-gray-400"
                        }
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {screenshotDataUrl && !designMd && (
                <div className="mt-5 border-t border-gray-200 pt-5 animate-in fade-in">
                  <h3 className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                    <Camera size={12} />
                    Captured viewport
                  </h3>
                  <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/40 animate-pulse z-10 flex items-center justify-center">
                       <span className="bg-black/90 text-white px-3 py-1.5 text-xs font-medium rounded-full">Analyzing visuals…</span>
                    </div>
                    <Image
                      src={screenshotDataUrl}
                      alt="Captured viewport"
                      width={960}
                      height={540}
                      unoptimized
                      className="w-full h-auto block opacity-60"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-start gap-3">
              <div className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium text-xs shrink-0 mt-0.5">
                Error
              </div>
              <p className="text-sm leading-relaxed text-red-900">
                {error}
              </p>
            </div>
          </div>
        )}

        {designMd && screenshotDataUrl && (
          <div
            className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-8 duration-700"
            data-output
          >
            <DesignPreview tokens={tokens} screenshotDataUrl={screenshotDataUrl} fullPageDataUrl={fullPageDataUrl} pageCopy={pageCopy} />
            <CodeOutput content={designMd} />
          </div>
        )}
      </div>
    </main>
  );
}
