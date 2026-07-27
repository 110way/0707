"use client";

import React, { useState, useEffect } from "react";
import { Cpu, ShieldCheck, RefreshCw } from "lucide-react";
import { LeftInputColumn } from "../components/LeftInputColumn";
import { CenterConfigColumn } from "../components/CenterConfigColumn";
import { RightPreviewColumn } from "../components/RightPreviewColumn";
import { FooterSustainability } from "../components/FooterSustainability";
import {
  countTokens,
  summarizeDoc,
  optimizePrompt,
  compilePrompt,
  SustainabilityMetrics,
} from "./api";

export default function PromptCompilerDashboard() {
  const [rawText, setRawText] = useState("");
  const [expandOneLiner, setExpandOneLiner] = useState(false);
  const [bpeOptimization, setBpeOptimization] = useState(false);
  const [rawTokenCount, setRawTokenCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Config State
  const [persona, setPersona] = useState("SDET");
  const [targetModel, setTargetModel] = useState("Claude");
  const [compressionLevel, setCompressionLevel] = useState(3);

  // Output State
  const [compiledMarkdown, setCompiledMarkdown] = useState("");
  const [tokensBefore, setTokensBefore] = useState(0);
  const [tokensAfter, setTokensAfter] = useState(0);
  const [reductionPercent, setReductionPercent] = useState(0);
  const [sustainability, setSustainability] = useState<SustainabilityMetrics | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);

  // Live Token Counting Effect (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!rawText.trim()) {
        setRawTokenCount(0);
        return;
      }
      const count = await countTokens(rawText);
      setRawTokenCount(count);
    }, 250);
    return () => clearTimeout(timer);
  }, [rawText]);

  // File Upload Handler
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadedFileName(file.name);
    try {
      const res = await summarizeDoc(file);
      setRawText(res.summary);
    } catch (err) {
      alert("Failed to summarize uploaded document. Please check file format.");
      setUploadedFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearDoc = () => {
    setUploadedFileName(null);
    setRawText("");
  };

  // Compile Handler
  const handleCompile = async () => {
    if (!rawText.trim()) return;
    setIsCompiling(true);
    try {
      // 1. Optimize raw text via SpaCy defluffing & BPE alignment
      const optRes = await optimizePrompt({
        raw_text: rawText,
        bpe_optimization: bpeOptimization,
        expand_oneliner: expandOneLiner,
        compression_level: compressionLevel,
      });

      // 2. Compile into persona template & target model format
      const compRes = await compilePrompt({
        optimized_text: optRes.optimized_text,
        persona: persona,
        target_model: targetModel,
        compression_level: compressionLevel,
      });

      // 2-second loading delay for smooth compilation feedback
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (optRes.defluffed_text) {
        setRawText(optRes.defluffed_text);
      }
      setCompiledMarkdown(compRes.compiled_markdown);
      setTokensBefore(optRes.tokens_before);
      setTokensAfter(optRes.tokens_after);
      setReductionPercent(optRes.reduction_percent);
      setSustainability(optRes.sustainability);
    } catch (err) {
      console.error(err);
      alert("Failed to compile prompt blueprint. Ensure backend server is running on http://localhost:8000.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 md:p-6 font-sans">
      {/* Top Header */}
      <header className="mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 font-black text-xl">
            ⚡
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              AeroPrompt
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              AI Prompt Token Optimization & Blueprint Cross-Compiler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRawText("");
              setCompiledMarkdown("");
              setSustainability(null);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Reset All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Environmental Impact Panel (Moved after Header) */}
      <div className="mb-6">
        <FooterSustainability metrics={sustainability} />
      </div>

      {/* Main 3-Column Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 items-stretch">
        {/* Left Column: Input */}
        <LeftInputColumn
          rawText={rawText}
          setRawText={setRawText}
          expandOneLiner={expandOneLiner}
          setExpandOneLiner={setExpandOneLiner}
          bpeOptimization={bpeOptimization}
          setBpeOptimization={setBpeOptimization}
          tokenCount={rawTokenCount}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          uploadedFileName={uploadedFileName}
          onClearDoc={handleClearDoc}
        />

        {/* Center Column: Configuration */}
        <CenterConfigColumn
          persona={persona}
          setPersona={setPersona}
          targetModel={targetModel}
          setTargetModel={setTargetModel}
          compressionLevel={compressionLevel}
          setCompressionLevel={setCompressionLevel}
          onCompile={handleCompile}
          isCompiling={isCompiling}
          isDocMode={!!uploadedFileName}
        />

        {/* Right Column: Live Output Preview */}
        <RightPreviewColumn
          compiledMarkdown={compiledMarkdown}
          reductionPercent={reductionPercent}
          tokensBefore={tokensBefore}
          tokensAfter={tokensAfter}
          isCompiling={isCompiling}
        />
      </main>
    </div>
  );
}
