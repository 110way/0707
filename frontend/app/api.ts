const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export interface SustainabilityMetrics {
  tokens_before: number;
  tokens_after: number;
  tokens_saved: number;
  reduction_percent: number;
  energy_saved_wh: number;
  co2_reduced_g: number;
  water_saved_ml: number;
}

export interface OptimizeResponse {
  raw_text: string;
  defluffed_text: string;
  optimized_text: string;
  tokens_before: number;
  tokens_after: number;
  tokens_saved: number;
  reduction_percent: number;
  sustainability: SustainabilityMetrics;
}

export interface CompileResponse {
  compiled_markdown: string;
  persona: string;
  target_model: string;
  compression_level: number;
  tokens_before: number;
  tokens_after: number;
  tokens_saved: number;
  reduction_percent: number;
  sustainability: SustainabilityMetrics;
}

export async function countTokens(text: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/count-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.token_count;
  } catch {
    return text.split(/\s+/).filter(Boolean).length;
  }
}

export async function summarizeDoc(file: File): Promise<{ summary: string; sentence_count: number; source_word_count: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/summarize-doc`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to summarize document");
  return res.json();
}

export async function expandOneLiner(raw_text: string): Promise<{ expanded: string; keywords_detected: string[]; expansion_applied: boolean }> {
  const res = await fetch(`${API_BASE_URL}/expand-oneliner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text }),
  });
  if (!res.ok) throw new Error("Failed to expand one-liner");
  return res.json();
}

export async function optimizePrompt(payload: {
  raw_text: string;
  bpe_optimization: boolean;
  expand_oneliner: boolean;
  compression_level?: number;
}): Promise<OptimizeResponse> {
  const res = await fetch(`${API_BASE_URL}/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Optimization failed");
  return res.json();
}

export async function compilePrompt(payload: {
  optimized_text: string;
  persona: string;
  target_model: string;
  compression_level: number;
}): Promise<CompileResponse> {
  const res = await fetch(`${API_BASE_URL}/compile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Compilation failed");
  return res.json();
}
