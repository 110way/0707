import React from "react";
import { Sparkles } from "lucide-react";

interface PresetPromptsProps {
  onSelectPreset: (text: string) => void;
}

const PRESETS = [
  {
    label: "Auth API Endpoint",
    text: "Hi! Could you please help me write a secure user authentication API microservice with JWT tokens, password hashing, and test cases? Thanks in advance!"
  },
  {
    label: "CI/CD Pipeline",
    text: "Hello team! Please kindly generate a Docker multi-stage build and GitHub Actions CI/CD deployment pipeline for a FastAPI python application. Thank you!"
  },
  {
    label: "ETL Data Pipeline",
    text: "Hi, I was wondering if you could basically write an ETL data pipeline in Python that extracts JSON from an API, validates schema, and loads it into SQL."
  },
  {
    label: "React Form Component",
    text: "Please generate a TypeScript React form component with Zod validation, Tailwind styling, and error handling. Best regards!"
  }
];

export const PresetPrompts: React.FC<PresetPromptsProps> = ({ onSelectPreset }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <div className="flex items-center text-xs font-semibold text-slate-500 mr-1">
        <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
        Presets:
      </div>
      {PRESETS.map((p, idx) => (
        <button
          key={idx}
          onClick={() => onSelectPreset(p.text)}
          className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium px-2.5 py-1 rounded-md border border-slate-200 transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};
