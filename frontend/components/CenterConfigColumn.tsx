"use client";

import React from "react";
import { UserCheck, Sliders, Play, Code2, Terminal, Layers, Box } from "lucide-react";

interface CenterConfigColumnProps {
  persona: string;
  setPersona: (v: string) => void;
  targetModel: string;
  setTargetModel: (v: string) => void;
  compressionLevel: number;
  setCompressionLevel: (v: number) => void;
  onCompile: () => void;
  isCompiling: boolean;
  isDocMode?: boolean;
}

const PERSONAS = [
  { id: "SDET", name: "SDET / Automation Engineer", icon: Terminal, desc: "Test automation, coverage, edge cases" },
  { id: "QA", name: "QA Specialist", icon: UserCheck, desc: "Functional testing, bug triage, acceptance matrix" },
  { id: "Scrum", name: "Scrum Master", icon: Layers, desc: "User stories, Given/When/Then, sprint scope" },
  { id: "DevOps", name: "DevOps Engineer", icon: Box, desc: "CI/CD, Docker, IaC, infrastructure" },
  { id: "Data Engineer", name: "Data Engineer", icon: Code2, desc: "ETL pipelines, data schemas, validation" },
  { id: "Fullstack", name: "Fullstack Engineer", icon: Code2, desc: "End-to-end architecture, API, UI state" },
  { id: "Manager", name: "Engineering Manager", icon: UserCheck, desc: "Roadmap, milestones, risk mitigation" },
  { id: "Content Writer", name: "Content Writer", icon: UserCheck, desc: "Technical documentation & guides" },
];

const TARGET_MODELS = [
  { id: "Claude", name: "Claude", format: "XML Tags (<system>)", badge: "XML" },
  { id: "ChatGPT", name: "ChatGPT", format: "Markdown ([System:])", badge: "MD" },
  { id: "Gemini", name: "Gemini", format: "Tree Heading Hierarchy (#)", badge: "TREE" },
  { id: "Copilot", name: "Copilot", format: "Inline Code Comments (//)", badge: "COMMENT" },
];

const COMPRESSION_LABELS: Record<number, string> = {
  1: "Level 1: Light (Preserves phrasing)",
  2: "Level 2: Balanced (Removes filler)",
  3: "Level 3: Moderate (Concise directives)",
  4: "Level 4: High (Telegraphic bullet points)",
  5: "Level 5: Maximum (Ultra-dense compression)",
};

export const CenterConfigColumn: React.FC<CenterConfigColumnProps> = ({
  persona,
  setPersona,
  targetModel,
  setTargetModel,
  compressionLevel,
  setCompressionLevel,
  onCompile,
  isCompiling,
  isDocMode = false,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
            2
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Persona & Output Configuration</h2>
            <p className="text-xs text-slate-500">Select target role, format & compression level</p>
          </div>
        </div>

        {/* Persona Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Technical Persona</label>
          <div className="grid grid-cols-2 gap-1.5">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = persona === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30 font-bold"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  title={p.desc}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-700" : "text-slate-500"}`} />
                  <span className={`text-xs truncate ${isSelected ? "text-emerald-900 font-bold" : "text-slate-700 font-medium"}`}>
                    {p.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Model Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Target LLM Architecture</label>
          <div className="grid grid-cols-2 gap-2">
            {TARGET_MODELS.map((m) => {
              const isSelected = targetModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTargetModel(m.id)}
                  className={`flex flex-col p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? "text-emerald-900" : "text-slate-800"}`}>
                      {m.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-emerald-200/60 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">{m.format}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compression Level Slider */}
        <div className={`p-3.5 rounded-lg border transition-all ${
          isDocMode 
            ? "bg-slate-100/70 border-slate-200 opacity-60" 
            : "bg-slate-50 border-slate-200"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">Compression Aggressiveness</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              isDocMode 
                ? "bg-slate-200 text-slate-600" 
                : "bg-emerald-100 text-emerald-700"
            }`}>
              {isDocMode ? "Disabled in Doc Mode" : `Level ${compressionLevel} / 5`}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={5}
            step={1}
            disabled={isDocMode}
            value={compressionLevel}
            onChange={(e) => setCompressionLevel(Number(e.target.value))}
            className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none accent-emerald-600 ${
              isDocMode ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          />

          <div className="mt-2 text-[11px] text-slate-600 font-medium">
            {isDocMode 
              ? "Auto-Optimized for Document Summary mode" 
              : COMPRESSION_LABELS[compressionLevel]}
          </div>
        </div>
      </div>

      {/* Compile CTA */}
      <div className="pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCompile}
          disabled={isCompiling}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          {isCompiling ? "Compiling Deterministic Blueprint..." : "Compile Blueprint (.md)"}
        </button>
      </div>
    </div>
  );
};
