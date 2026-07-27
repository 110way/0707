# MASTER BLUEPRINT: BPE-AWARE DETERMINISTIC PROMPT COMPILER

## OBJECTIVE
Build a high-performance FastAPI backend and Next.js clean light-theme frontend that optimizes raw prompts into persona-driven Markdown blueprints WITHOUT calling external LLMs. Includes BPE (Byte-Pair Encoding) sub-word optimization.

---

## TECH STACK
- Backend: Python 3.11+ (FastAPI, Uvicorn)
- NLP & Summarization: SpaCy (`en_core_web_sm`), Sumy (LexRank summarizer)
- Tokenizers & BPE Engine: Tiktoken (`cl100k_base` / `o200k_base`)
- Document Ingestion: PyPDF, Python-Docx
- Frontend: Next.js (React), Tailwind CSS (Light Theme / Slate & Emerald colors)

---

## SYSTEM PIPELINE & ENGINE REQUIREMENTS

1. INGESTION & ONE-LINE ENGINE
   - Endpoint `/api/summarize-doc`: Uploads .pdf/.docx, uses Sumy LexRank to return a 5-sentence summary.
   - Endpoint `/api/expand-oneliner`: If input word count <= 15, detects tech keywords and appends schema context.

2. NLP DE-FLUFFING & BPE OPTIMIZATION ENGINE
   - Use SpaCy POS tagging & regex to prune greetings, polite fluff ("please", "kindly"), and empty adverbs.
   - Apply BPE-Aware token alignment: Normalize whitespace, collapse repeated syntax, and align sub-word merges to minimize BPE token fragmentation.

3. PERSONA & CROSS-COMPILER ENGINE
   - Support Personas: SDET, QA, Scrum, DevOps, Data Engineer, Fullstack, Manager, Content Writer.
   - Target Agent Encoding:
     * Claude: Uses strict XML tags (`<system>`, `<directives>`, `<constraints>`).
     * ChatGPT: Uses structural Markdown with `[System:]` headers and strict schema rules.
     * Gemini: Uses deep Markdown trees (`#`, `##`).
     * Copilot: Formats output as ultra-compact inline comments (`//`).

4. SUSTAINABILITY ENGINE
   - Calculate saved tokens using Tiktoken (BPE-aware).
   - Energy Saved (Wh) = Tokens Saved * 0.0003
   - CO2 Reduced (g) = (Energy Saved in kWh) * 0.385
   - Water Saved (mL) = Energy Saved in Wh * 0.25

---

## FRONTEND UI DESIGN (CLEAN LIGHT THEME)
- Background: Slate Light (`#F8FAFC`), Cards: White (`#FFFFFF`), Borders: Slate Light (`#E2E8F0`).
- Left Column: Raw Text Input, Upload File button, "One-Line Expand" toggle, "BPE Optimization" toggle switch, Raw Token Counter badge.
- Center Column: Persona Dropdown (SDET, DevOps, Fullstack, etc.), Model Selector (Claude, ChatGPT, Gemini, Copilot), Compression Level Slider.
- Right Column: Compiled Blueprint (`.md`) Live Preview window with "Copy Prompt" button and Token Reduction % indicator.
- Bottom Footer Bar: Environmental Impact Panel displaying Water Saved (mL) and Carbon Reduced (g CO2e) with emerald green badges.

---

## EXECUTION INSTRUCTION
Generate clean, production-ready Python FastAPI code and Next.js frontend components following this specification strictly.