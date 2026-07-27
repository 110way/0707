import io
import re
from typing import List, Tuple
from pypdf import PdfReader
import docx

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lex_rank import LexRankSummarizer

from app.models import SummarizeDocResponse, ExpandOneLinerResponse
from app.engines.defluff import compress_text_by_level, correct_spelling

TECH_KEYWORDS = {
    "api", "auth", "authentication", "ci/cd", "pipeline", "microservice",
    "schema", "database", "sql", "nosql", "test", "sdet", "qa", "docker",
    "kubernetes", "k8s", "frontend", "backend", "etl", "deploy", "security",
    "react", "fastapi", "python", "typescript", "architecture", "rest", "graphql"
}

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    text = ""
    
    if ext == "pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages_text)
    elif ext in ["docx", "doc"]:
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text]
        text = "\n".join(paragraphs)
    else:
        # Fallback to UTF-8 plain text decoding
        text = file_bytes.decode('utf-8', errors='ignore')
        
    return text.strip()

def summarize_document(file_bytes: bytes, filename: str) -> SummarizeDocResponse:
    raw_text = extract_text_from_file(file_bytes, filename)
    if not raw_text:
        return SummarizeDocResponse(summary="[Empty document content]", sentence_count=0, source_word_count=0)
    
    words = raw_text.split()
    word_count = len(words)
    
    try:
        parser = PlaintextParser.from_string(raw_text, Tokenizer("english"))
        summarizer = LexRankSummarizer()
        summary_sentences = summarizer(parser.document, 5) # extract top 5 sentences
        
        summary_text = " ".join([str(sentence) for sentence in summary_sentences])
        if not summary_text:
            summary_text = " ".join(words[:100]) + "..."
            
        sentence_cnt = len(summary_sentences) if summary_sentences else 1
    except Exception:
        # Fallback summary if LexRank encounters tokenizer issues
        summary_sentences = [s.strip() for s in raw_text.split('.') if len(s.strip()) > 10][:5]
        summary_text = ". ".join(summary_sentences) + "."
        sentence_cnt = len(summary_sentences)

    # Step: Automatically apply Spell Correction & Defluffing to PDF extracted summary
    optimized_summary = compress_text_by_level(summary_text, level=3)
    if not optimized_summary:
        optimized_summary = summary_text

    return SummarizeDocResponse(
        summary=optimized_summary,
        sentence_count=sentence_cnt,
        source_word_count=word_count
    )

def expand_oneliner(raw_text: str) -> ExpandOneLinerResponse:
    if not raw_text:
        return ExpandOneLinerResponse(expanded="", keywords_detected=[], expansion_applied=False)
    
    words = raw_text.split()
    word_count = len(words)
    
    # Detect tech terms in raw text
    cleaned_words = [re.sub(r'[^a-zA-Z0-9/]', '', w).lower() for w in words]
    detected = [w for w in cleaned_words if w in TECH_KEYWORDS]
    unique_detected = list(dict.fromkeys(detected))
    
    if word_count <= 15:
        # Structured templated expansion (deterministic)
        domain_tag = ", ".join(unique_detected).upper() if unique_detected else "GENERAL SOFTWARE ARCHITECTURE"
        scaffold = (
            f"\n\n### [AUTOMATED EXPANSION SCHEMA - DOMAIN: {domain_tag}]\n"
            f"- **Context & Goal**: Expand raw intent ({raw_text.strip()}) into robust implementation.\n"
            f"- **Input Contracts**: Define validated data payloads, strict typing, and schema interfaces.\n"
            f"- **Expected Deliverables**: Clean modular code, edge-case assertions, and documentation.\n"
            f"- **Operational Constraints**: Maximum performance, non-blocking execution, zero telemetry."
        )
        expanded_text = raw_text.strip() + scaffold
        return ExpandOneLinerResponse(
            expanded=expanded_text,
            keywords_detected=unique_detected,
            expansion_applied=True
        )
    
    return ExpandOneLinerResponse(
        expanded=raw_text,
        keywords_detected=unique_detected,
        expansion_applied=False
    )
