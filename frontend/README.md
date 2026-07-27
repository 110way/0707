# ⚡ AeroPrompt Frontend — Next.js & Tailwind CSS Dashboard

This is the Next.js frontend user interface for **AeroPrompt**, an AI Prompt Token Optimizer, Compression Engine & Technical Persona Cross-Compiler.

---

## 🚀 How Optimization Works (Step-by-Step Architecture)

AeroPrompt processes raw text or uploaded documents (`.pdf`, `.docx`, `.txt`) through a **7-stage deterministic NLP pipeline** without making any external LLM API calls:

```
[Raw Prompt / Uploaded File]
           │
           ▼
Stage 1: Ingestion & LexRank Summarization (.pdf / .docx text extraction)
           │
           ▼
Stage 2: Deterministic Hybrid Spell Correction (Dictionary + Norvig Edit-Distance)
           │
           ▼
Stage 3: SpaCy NLP De-Fluffing & Corporate Jargon Pruning
           │
           ▼
Stage 4: Progressive Compression Slider (Levels 1 to 5)
           │
           ▼
Stage 5: Tiktoken BPE Sub-Word Token Alignment (cl100k_base)
           │
           ▼
Stage 6: Persona & LLM Model Cross-Compiler (Claude, ChatGPT, Gemini, Copilot)
           │
           ▼
Stage 7: Environmental & Ecological Savings Metrics (Water, Energy, CO₂e)
```

---

### Stage 1: Document Ingestion & Summarization
- **File Parsing**: Extracts plain text from `.pdf` using `pypdf` and `.docx` using `python-docx`.
- **LexRank Summarization**: Distills long multi-page documents into top 5 key sentences using graph-based sentence ranking.

---

### Stage 2: Hybrid Spell Correction Engine
Combines 3 layers of offline spell correction:
1. **Contextual Phrase Replacements**: Corrects multi-word contextual typos (e.g. `select different personal` → `select different persona`, `carbon emiison` → `carbon emission`).
2. **Software Engineering Typo Dictionary**: Maps domain-specific terms (e.g. `authenitcation` → `authentication`, `microservce` → `microservice`, `pasword` → `password`, `databse` → `database`, `reqest` → `request`).
3. **SpaCy Norvig Edit-Distance Matcher**: Generates 1-edit candidates against SpaCy's 48,000+ word vocabulary to fix unknown typos (e.g. `MESTAKE` → `MISTAKE`, `OPTMIZNG` → `OPTIMIZING`).

---

### Stage 3: SpaCy NLP De-Fluffing & Corporate Jargon Pruning
- **Polite Fluff Removal**: Strips greetings (`Hi`, `Dear`), sign-offs (`Thanks in advance`), and conversational padding using regex.
- **Corporate PDF Fluff Pruning**: Strips document boilerplate (e.g. *"This document details..."*, *"The purpose of this specification is to..."*).
- **POS Tagging Adverb Filtering**: Uses SpaCy Part-of-Speech (POS) tagging to filter low-semantic filler adverbs (`basically`, `actually`, `literally`, `really`, `very`, `extremely`, `definitely`).

---

### Stage 4: Progressive Compression Slider (Levels 1 to 5)
Scales compression aggressiveness dynamically:
- **Level 1 (Light)**: De-fluffs greetings & politeness (~10% token reduction).
- **Level 2 (Balanced)**: Contracts wordy prepositions (`in order to` → `to`, `due to the fact that` → `because`).
- **Level 3 (Moderate)**: Prunes filler words & auxiliary adverbs (~35% token reduction).
- **Level 4 (High - Telegraphic)**: Strips non-essential articles (`a`, `an`, `the`) (~50% token reduction).
- **Level 5 (Maximum - Ultra-Dense)**: Strips auxiliary verbs (`is`, `are`, `was`, `were`, `should`, `would`) (~70%+ token reduction).

---

### Stage 5: Tiktoken BPE Sub-Word Token Alignment
- Calculates exact sub-word BPE token counts using OpenAI's `tiktoken` encoder (`cl100k_base`).
- Computes exact token reduction count and percentage savings.

---

### Stage 6: Technical Persona & Model Cross-Compiler
Cross-compiles the optimized payload into 8 technical personas:
1. **SDET**: Test automation, edge-case matrices, explicit assertions.
2. **QA Specialist**: Functional testing, defect triage, acceptance checklists.
3. **Scrum Master**: User stories, Given/When/Then criteria, sprint DoD.
4. **DevOps Engineer**: CI/CD pipelines, Docker, IaC, infrastructure.
5. **Data Engineer**: ETL pipelines, data schemas, validation logic.
6. **Fullstack Engineer**: End-to-end architecture, API contracts, state management.
7. **Engineering Manager**: Roadmaps, milestones, risk mitigation.
8. **Content Writer**: Technical documentation & user guides.

Formats output for 4 target LLM architectures:
- **Claude**: Strict XML Tag wrapping (`<system>`, `<context>`, `<schema>`).
- **ChatGPT**: Structural Markdown (`[System:]`, `### Context`, `### Schema`).
- **Gemini**: Deep Tree Heading Hierarchy (`#`, `##`, `###`).
- **Copilot**: Ultra-compact inline code comments (`//`).

---

### Stage 7: Environmental Impact Computation
Estimates real-time ecological savings per token saved:
- **Water Saved**: ~0.0005 mL per saved token (GPU datacenter cooling).
- **Carbon Reduced (CO₂e)**: ~0.000003 g per saved token.
- **Energy Saved**: ~0.000006 Wh per saved token.

---

## 🏃 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.
