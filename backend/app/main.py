from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import (
    ingestion_router,
    optimize_router,
    compile_router,
    sustainability_router,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Deterministic BPE-Aware Prompt Optimization & Cross-Compiler API"
)

# CORS setup locked to internal frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(ingestion_router.router)
app.include_router(optimize_router.router)
app.include_router(compile_router.router)
app.include_router(sustainability_router.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "deterministic_offline"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
