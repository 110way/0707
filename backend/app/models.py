from pydantic import BaseModel, Field
from typing import List, Optional

class ExpandOneLinerRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text or short 1-line prompt to evaluate and expand")

class ExpandOneLinerResponse(BaseModel):
    expanded: str
    keywords_detected: List[str]
    expansion_applied: bool

class SummarizeDocResponse(BaseModel):
    summary: str
    sentence_count: int
    source_word_count: int

class OptimizeRequest(BaseModel):
    raw_text: str = Field(..., description="Raw prompt text to defluff and BPE optimize")
    bpe_optimization: bool = True
    expand_oneliner: bool = False
    compression_level: Optional[int] = Field(3, ge=1, le=5, description="1 (Light) to 5 (Maximum telegraphic)")
    encoding: Optional[str] = "cl100k_base"

class SustainabilityMetrics(BaseModel):
    tokens_before: int
    tokens_after: int
    tokens_saved: int
    reduction_percent: float
    energy_saved_wh: float
    co2_reduced_g: float
    water_saved_ml: float

class OptimizeResponse(BaseModel):
    raw_text: str
    defluffed_text: str
    optimized_text: str
    tokens_before: int
    tokens_after: int
    tokens_saved: int
    reduction_percent: float
    sustainability: SustainabilityMetrics

class CompileRequest(BaseModel):
    optimized_text: str
    persona: str = Field("SDET", description="SDET, QA, Scrum, DevOps, Data Engineer, Fullstack, Manager, Content Writer")
    target_model: str = Field("Claude", description="Claude, ChatGPT, Gemini, Copilot")
    compression_level: int = Field(3, ge=1, le=5, description="1 (Light) to 5 (Maximum telegraphic)")
    encoding: Optional[str] = "cl100k_base"

class CompileResponse(BaseModel):
    compiled_markdown: str
    persona: str
    target_model: str
    compression_level: int
    tokens_before: int
    tokens_after: int
    tokens_saved: int
    reduction_percent: float
    sustainability: SustainabilityMetrics

class CountTokensRequest(BaseModel):
    text: str
    encoding: Optional[str] = "cl100k_base"

class CountTokensResponse(BaseModel):
    token_count: int

class SustainabilityRequest(BaseModel):
    tokens_before: int
    tokens_after: int
