from typing import Dict, Any

def encode_claude_xml(persona_data: Dict[str, Any], compression_level: int) -> str:
    """Claude format: strict XML tag wrapping with progressive compression scaling."""
    title = persona_data["title"]
    role = persona_data["role_directive"]
    objective = persona_data["core_objective"]
    tone = persona_data["tone_instruction"]
    content = persona_data["core_content"]
    sections = persona_data["sections"]
    
    if compression_level >= 5:
        # Level 5: Max telegraphic XML
        sec_names = "|".join([s.lower().replace(" ", "_") for s in sections])
        return f"""<system role="{persona_data.get('title','Persona')}" lvl="5">
  <payload>{content}</payload>
  <schema>{sec_names}</schema>
</system>"""

    if compression_level >= 4:
        # Level 4: High telegraphic XML
        sections_xml = "\n".join([f"  <{s.lower().replace(' ', '_')}>Fill requirement</{s.lower().replace(' ', '_')}>" for s in sections])
        return f"""<system role="{role}">
  <objective>{objective}</objective>
  <context>{content}</context>
  <schema>
{sections_xml}
  </schema>
</system>"""

    if compression_level >= 3:
        # Level 3: Moderate compact XML
        sections_xml = "\n".join([f"    <{s.lower().replace(' ', '_')}>Execute requirement</{s.lower().replace(' ', '_')}>" for s in sections])
        return f"""<system>
  <role>{role}</role>
  <objective>{objective}</objective>
</system>
<context>{content}</context>
<schema>
{sections_xml}
</schema>"""

    # Levels 1 & 2: Full verbose XML
    sections_xml = "\n".join([f"    <{s.lower().replace(' ', '_')}>Fill requirement according to specification</{s.lower().replace(' ', '_')}>" for s in sections])
    return f"""<system>
  <role>{role}</role>
  <objective>{objective}</objective>
  <compression_level>{compression_level}/5</compression_level>
</system>

<directives>
  <tone>{tone}</tone>
  <enforced_schema>
{sections_xml}
  </enforced_schema>
</directives>

<context>
{content}
</context>

<constraints>
  <rule>Zero runtime LLM calls; execution must be deterministic.</rule>
  <rule>Adhere strictly to persona boundaries and expected output formats.</rule>
</constraints>"""

def encode_chatgpt_markdown(persona_data: Dict[str, Any], compression_level: int) -> str:
    """ChatGPT format: structural Markdown with progressive compression scaling."""
    title = persona_data["title"]
    role = persona_data["role_directive"]
    objective = persona_data["core_objective"]
    tone = persona_data["tone_instruction"]
    content = persona_data["core_content"]
    sections = persona_data["sections"]
    
    if compression_level >= 5:
        sec_str = ", ".join(sections)
        return f"""[System: {title} | L5]
* **Payload**: {content}
* **Schema**: {sec_str}"""

    if compression_level >= 4:
        sec_md = "\n".join([f"- **{s}**: [Execute per guidelines]" for s in sections])
        return f"""[System: {role}]
* **Objective**: {objective}

### Context
{content}

### Enforced Output Schema
{sec_md}"""

    if compression_level >= 3:
        sec_md = "\n".join([f"### {idx+1}. {s}\n- [Execute item]" for idx, s in enumerate(sections)])
        return f"""[System: {title}]
> **Role**: {role}
> **Objective**: {objective}

### [Prompt Context]
{content}

### [Required Architecture]
{sec_md}"""

    sec_md = "\n".join([f"### {idx+1}. {s}\n- [Execute item per guidelines]" for idx, s in enumerate(sections)])
    return f"""[System: Persona Initialized - {title}]
> **Role Directive**: {role}
> **Core Objective**: {objective}
> **Compression Index**: Level {compression_level} (Tone: {tone})

---

### [Prompt Payload Context]
{content}

---

### [Enforced Output Architecture]
{sec_md}

---
*End of Prompt Blueprint*"""

def encode_gemini_tree(persona_data: Dict[str, Any], compression_level: int) -> str:
    """Gemini format: deep nested Markdown tree (#, ##, ###) with progressive compression scaling."""
    title = persona_data["title"]
    role = persona_data["role_directive"]
    objective = persona_data["core_objective"]
    tone = persona_data["tone_instruction"]
    content = persona_data["core_content"]
    sections = persona_data["sections"]
    
    if compression_level >= 5:
        sec_tree = " | ".join(sections)
        return f"""# {title.upper()} (L5)
## CONTEXT: {content}
## SCHEMA: {sec_tree}"""

    if compression_level >= 4:
        sec_tree = "\n".join([f"## 2.{idx+1} {s}" for idx, s in enumerate(sections)])
        return f"""# BLUEPRINT: {title.upper()}
## 1. CONTEXT
{content}

## 2. EXECUTION TREE
{sec_tree}"""

    sec_tree = "\n".join([f"### 3.{idx+1} {s}\n* Requirement specification for {s.lower()}" for idx, s in enumerate(sections)])
    return f"""# SYSTEM BLUEPRINT: {title.upper()}
## 1. PERSONA DECLARATION & DIRECTIVES
### 1.1 System Role
{role}

### 1.2 Execution Objective
{objective}

## 2. INGESTED PROMPT CONTEXT
{content}

## 3. STRUCTURAL EXECUTION TREE
{sec_tree}"""

def encode_copilot_comments(persona_data: Dict[str, Any], compression_level: int) -> str:
    """Copilot format: ultra-compact inline comment format (//) with progressive compression scaling."""
    title = persona_data["title"]
    role = persona_data["role_directive"]
    content = persona_data["core_content"].replace("\n", "\n// ")
    sections = persona_data["sections"]
    
    if compression_level >= 5:
        sec_str = ", ".join(sections)
        return f"""// PERSONA: {title} (L5)
// PAYLOAD: {content}
// SCHEMA: {sec_str}"""

    if compression_level >= 4:
        sec_comments = "\n".join([f"// - {s}" for s in sections])
        return f"""// PERSONA: {role} (Level {compression_level}/5)
// PROMPT: {content}
// SCHEMA:
{sec_comments}"""

    sec_comments = "\n".join([f"// - [{idx+1}] {s}" for idx, s in enumerate(sections)])
    return f"""// ==========================================
// PERSONA: {title}
// DIRECTIVE: {role}
// COMPRESSION LEVEL: {compression_level}/5
// ==========================================
//
// PROMPT SPECIFICATION:
// {content}
//
// REQUIRED IMPLEMENTATION COMPONENTS:
{sec_comments}"""

def format_target_model(model_name: str, persona_data: Dict[str, Any], compression_level: int) -> str:
    model_lower = model_name.lower()
    if "claude" in model_lower:
        return encode_claude_xml(persona_data, compression_level)
    elif "chatgpt" in model_lower or "gpt" in model_lower or "openai" in model_lower:
        return encode_chatgpt_markdown(persona_data, compression_level)
    elif "gemini" in model_lower or "google" in model_lower:
        return encode_gemini_tree(persona_data, compression_level)
    elif "copilot" in model_lower or "inline" in model_lower or "comment" in model_lower:
        return encode_copilot_comments(persona_data, compression_level)
    else:
        return encode_chatgpt_markdown(persona_data, compression_level)
