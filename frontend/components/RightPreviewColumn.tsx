"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, Code, ArrowDownRight, Download, Cpu } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface RightPreviewColumnProps {
  compiledMarkdown: string;
  reductionPercent: number;
  tokensBefore: number;
  tokensAfter: number;
  isCompiling: boolean;
}

export const RightPreviewColumn: React.FC<RightPreviewColumnProps> = ({
  compiledMarkdown,
  reductionPercent,
  tokensBefore,
  tokensAfter,
  isCompiling,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const handleCopy = () => {
    if (!compiledMarkdown) return;
    navigator.clipboard.writeText(compiledMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!compiledMarkdown) return;
    const blob = new Blob([compiledMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "aeroprompt_blueprint.md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              3
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Compiled Blueprint Live Preview</h2>
              <p className="text-xs text-slate-500">Deterministic model-aligned output</p>
            </div>
          </div>

          {/* Reduction Badge */}
          {tokensBefore > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 text-emerald-700" />
              {reductionPercent}% Token Reduction
            </span>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === "preview" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Rendered
            </button>

            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === "code" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Source (.md)
            </button>
          </div>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
            <Cpu className="w-3.5 h-3.5 mr-1 text-emerald-700" />
            {tokensAfter} tokens
          </span>
        </div>

        {/* Live Content Display */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 h-[350px] overflow-y-auto font-sans text-sm">
          {isCompiling ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="relative mb-3">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-emerald-200 border-t-emerald-600"></div>
                <div className="absolute inset-0 flex items-center justify-center text-xs">⚡</div>
              </div>
              <p className="text-xs font-bold text-slate-800">Compiling AeroPrompt Blueprint...</p>
              <p className="text-[11px] text-slate-500 mt-1">Executing SpaCy defluffing, Tiktoken BPE alignment & persona cross-compiler</p>
            </div>
          ) : !compiledMarkdown ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4">
              <Code className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-medium text-slate-500">No blueprint generated yet</p>
              <p className="text-[11px] text-slate-400 mt-1">Configure your persona & click "Compile Blueprint"</p>
            </div>
          ) : activeTab === "preview" ? (
            <div className="prose prose-slate prose-sm max-w-none text-slate-800">
              <ReactMarkdown>{compiledMarkdown}</ReactMarkdown>
            </div>
          ) : (
            <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap break-words">
              {compiledMarkdown}
            </pre>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!compiledMarkdown}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          title="Download compiled blueprint as .md file"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          Download .md
        </button>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!compiledMarkdown}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Prompt
            </>
          )}
        </button>
      </div>
    </div>
  );
};
