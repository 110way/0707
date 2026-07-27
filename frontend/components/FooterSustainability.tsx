"use client";

import React from "react";
import { Droplet, Leaf, Zap, ShieldCheck, Award } from "lucide-react";
import { SustainabilityMetrics } from "../app/api";

interface FooterSustainabilityProps {
  metrics: SustainabilityMetrics | null;
}

export const FooterSustainability: React.FC<FooterSustainabilityProps> = ({ metrics }) => {
  const water = metrics?.water_saved_ml ?? 0;
  const co2 = metrics?.co2_reduced_g ?? 0;
  const energy = metrics?.energy_saved_wh ?? 0;
  const tokensSaved = metrics?.tokens_saved ?? 0;
  const percent = metrics?.reduction_percent ?? 0;
  const formatNum = (val: number, maxDecimals: number) => {
    if (val === 0) return "0";
    if (val > 0 && val < 0.0001) return val.toExponential(2);
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
    });
  };

  return (
    <footer className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title / Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">AeroPrompt Environmental Impact</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                AeroPrompt Verified
              </span>
            </div>
            <p className="text-xs text-slate-500">Real-time ecological savings computed by AeroPrompt token compression engine</p>
          </div>
        </div>

        {/* Emerald Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          {/* Water Saved */}
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
              <Droplet className="w-4 h-4 fill-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-medium text-emerald-800 uppercase tracking-wide">Water Saved</div>
              <div className="text-sm font-extrabold text-emerald-900">{formatNum(water, 4)} mL</div>
            </div>
          </div>

          {/* Carbon Reduced */}
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-medium text-emerald-800 uppercase tracking-wide">Carbon Reduced</div>
              <div className="text-sm font-extrabold text-emerald-900">{formatNum(co2, 6)} g CO₂e</div>
            </div>
          </div>

          {/* Energy Saved */}
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-medium text-emerald-800 uppercase tracking-wide">Energy Saved</div>
              <div className="text-sm font-extrabold text-emerald-900">{formatNum(energy, 4)} Wh</div>
            </div>
          </div>

          {/* Tokens Saved */}
          <div className="bg-emerald-600 text-white rounded-lg p-2.5 flex items-center gap-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-medium text-emerald-100 uppercase tracking-wide">Tokens Reduced</div>
              <div className="text-sm font-extrabold text-white">{tokensSaved} ({percent}%)</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
