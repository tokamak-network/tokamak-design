"use client";

import { ArrowRight, Terminal } from "lucide-react";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  loading: boolean;
  loadingLabel: string;
}

export default function UrlInput({
  value,
  onChange,
  onGenerate,
  loading,
  loadingLabel,
}: UrlInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto relative group"
    >
      <div className="relative flex items-center bg-white border border-gray-200 rounded-xl shadow-sm transition-all group-focus-within:border-gray-400 group-focus-within:shadow-md">
        <div className="pl-5 text-gray-400 hidden sm:block">
          <Terminal size={18} strokeWidth={2} />
        </div>

        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="vercel.com or https://example.com"
          className="w-full px-4 py-4 text-base sm:text-lg bg-transparent border-none outline-none placeholder:text-gray-400 text-black"
          disabled={loading}
          required
          autoFocus
        />

        <div className="pr-2">
          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="h-10 px-4 rounded-lg bg-black text-white text-sm font-medium flex items-center gap-2 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Generating</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Generate</span>
                <ArrowRight size={16} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </div>

      {!loading && (
        <div className="mt-2.5 flex justify-between px-1 text-[11px] text-gray-400">
          <span>Powered by Tokamak AI</span>
          <span>Enter ↵</span>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {loadingLabel}
      </span>
    </form>
  );
}
