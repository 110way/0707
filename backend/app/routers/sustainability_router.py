from fastapi import APIRouter
from app.models import SustainabilityRequest, SustainabilityMetrics
from app.engines.sustainability import compute_sustainability

router = APIRouter(prefix="/api", tags=["sustainability"])

@router.post("/sustainability", response_model=SustainabilityMetrics)
async def sustainability_endpoint(payload: SustainabilityRequest):
    return compute_sustainability(payload.tokens_before, payload.tokens_after)
