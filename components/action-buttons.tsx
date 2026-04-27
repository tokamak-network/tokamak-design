"use client";

import { Copy, Download, Check } from "lucide-react";
import { useState } from "react";

interface ActionButtonsProps {
  content: string;
  filename?: string;
}

export default function ActionButtons({
  content,
  filename = "DESIGN.md",
}: ActionButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        onClick={handleCopy}
        className="px-3 py-1.5 bg-white text-gray-700 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 hover:text-black transition-colors flex items-center gap-1.5"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1.5"
      >
        <Download size={12} />
        Download
      </button>
    </div>
  );
}
