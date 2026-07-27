from fastapi import APIRouter
from app.models import CompileRequest, CompileResponse
from app.engines.bpe_align import count_tokens, align_bpe_tokens
from app.engines.defluff import compress_text_by_level
from app.engines.personas import apply_persona_template
from app.engines.model_encoders import format_target_model
from app.engines.sustainability import compute_sustainability

router = APIRouter(prefix="/api", tags=["compile"])

@router.post("/compile", response_model=CompileResponse)
async def compile_endpoint(payload: CompileRequest):
    encoding = payload.encoding or "cl100k_base"
    tokens_before = count_tokens(payload.optimized_text, encoding)

    # Apply progressive compression level logic to optimized text (Levels 1 through 5)
    core_text = compress_text_by_level(payload.optimized_text, payload.compression_level)
    if payload.compression_level >= 4:
        core_text = align_bpe_tokens(core_text, encoding)

    # 1. Apply Persona Template
    persona_data = apply_persona_template(
        persona_name=payload.persona,
        core_content=core_text,
        compression_level=payload.compression_level
    )

    # 2. Encode for Target Model
    compiled_markdown = format_target_model(
        model_name=payload.target_model,
        persona_data=persona_data,
        compression_level=payload.compression_level
    )

    tokens_after = count_tokens(compiled_markdown, encoding)
    sustainability = compute_sustainability(tokens_before, tokens_after)

    return CompileResponse(
        compiled_markdown=compiled_markdown,
        persona=payload.persona,
        target_model=payload.target_model,
        compression_level=payload.compression_level,
        tokens_before=tokens_before,
        tokens_after=tokens_after,
        tokens_saved=sustainability.tokens_saved,
        reduction_percent=sustainability.reduction_percent,
        sustainability=sustainability
    )
