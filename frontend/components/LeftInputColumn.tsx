"use client";

import React, { useRef } from "react";
import { Upload, FileText, Zap, Cpu, Trash2, X } from "lucide-react";

interface LeftInputColumnProps {
  rawText: string;
  setRawText: (v: string) => void;
  expandOneLiner: boolean;
  setExpandOneLiner: (v: boolean) => void;
  bpeOptimization: boolean;
  setBpeOptimization: (v: boolean) => void;
  tokenCount: number;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  uploadedFileName: string | null;
  onClearDoc: () => void;
}

export const LeftInputColumn: React.FC<LeftInputColumnProps> = ({
  rawText,
  setRawText,
  expandOneLiner,
  setExpandOneLiner,
  bpeOptimization,
  setBpeOptimization,
  tokenCount,
  onFileUpload,
  isUploading,
  uploadedFileName,
  onClearDoc,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              1
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">Raw Prompt & Document Input</h2>
              <p className="text-xs text-slate-500">Paste text or upload file to optimize</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Token Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs ring-1 ring-emerald-500/20">
              <Cpu className="w-3.5 h-3.5 mr-1.5 text-emerald-600 animate-pulse" />
              {tokenCount} tokens
            </span>

            {rawText && (
              <button
                onClick={() => setRawText("")}
                className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                title="Clear input"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="relative mb-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Type or paste your raw prompt here..."
            rows={14}
            className="w-full h-[330px] p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400 font-mono resize-none"
          />
        </div>
      </div>

      {/* Control Actions & Toggles */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        {/* Upload File button / Active Document Pill */}
        <div className="flex items-center justify-between">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />

          {uploadedFileName ? (
            <div className="w-full flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold shadow-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="truncate">{uploadedFileName}</span>
              </div>
              <button
                type="button"
                onClick={onClearDoc}
                className="p-1 text-emerald-700 hover:text-red-600 hover:bg-emerald-100 rounded-md transition-colors shrink-0 cursor-pointer"
                title="Remove document"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent"></div>
                  Extracting & Summarizing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-500" />
                  Upload Document (.pdf, .docx)
                </>
              )}
            </button>
          )}
        </div>

        {/* Toggle 1: One-Line Expand */}
        <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-xs font-medium text-slate-700">One-Line Expand</div>
              <div className="text-[10px] text-slate-500">Appends schema scaffold if prompt ≤ 15 words</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={expandOneLiner}
            onChange={(e) => setExpandOneLiner(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 accent-emerald-600 cursor-pointer"
          />
        </label>

        {/* Toggle 2: BPE Optimization */}
        <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-xs font-medium text-slate-700">BPE Optimization</div>
              <div className="text-[10px] text-slate-500">Sub-word merge alignment & token reduction</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={bpeOptimization}
            onChange={(e) => setBpeOptimization(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300 accent-emerald-600 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
