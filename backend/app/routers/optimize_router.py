from fastapi import APIRouter
from app.models import OptimizeRequest, OptimizeResponse, CountTokensRequest, CountTokensResponse
from app.engines.defluff import compress_text_by_level
from app.engines.bpe_align import align_bpe_tokens, count_tokens
from app.engines.sustainability import compute_sustainability
from app.engines.ingestion import expand_oneliner

router = APIRouter(prefix="/api", tags=["optimize"])

@router.post("/optimize", response_model=OptimizeResponse)
async def optimize_endpoint(payload: OptimizeRequest):
    input_text = payload.raw_text
    level = payload.compression_level or 3
    
    # Optional Step 1: One-Line Expansion
    if payload.expand_oneliner:
        exp_res = expand_oneliner(input_text)
        if exp_res.expansion_applied:
            input_text = exp_res.expanded

    tokens_before = count_tokens(input_text, payload.encoding or "cl100k_base")

    # Step 2: Progressive Compression scaling with level (1 to 5)
    defluffed = compress_text_by_level(input_text, level)

    # Step 3: BPE Alignment
    if payload.bpe_optimization:
        optimized = align_bpe_tokens(defluffed, payload.encoding or "cl100k_base")
    else:
        optimized = defluffed

    tokens_after = count_tokens(optimized, payload.encoding or "cl100k_base")
    sustainability = compute_sustainability(tokens_before, tokens_after)

    return OptimizeResponse(
        raw_text=payload.raw_text,
        defluffed_text=defluffed,
        optimized_text=optimized,
        tokens_before=tokens_before,
        tokens_after=tokens_after,
        tokens_saved=sustainability.tokens_saved,
        reduction_percent=sustainability.reduction_percent,
        sustainability=sustainability
    )

@router.post("/count-tokens", response_model=CountTokensResponse)
async def count_tokens_endpoint(payload: CountTokensRequest):
    c = count_tokens(payload.text, payload.encoding or "cl100k_base")
    return CountTokensResponse(token_count=c)
