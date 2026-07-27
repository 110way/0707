import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engines.defluff import defluff_text, correct_spelling
from app.engines.bpe_align import count_tokens, align_bpe_tokens
from app.engines.sustainability import compute_sustainability
from app.engines.personas import apply_persona_template
from app.engines.model_encoders import format_target_model

client = TestClient(app)

def test_health_and_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["mode"] == "deterministic_offline"
    
    h_res = client.get("/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "healthy"

def test_spelling_correction():
    typo_text = "Please write a microservce with authenitcation, pasword hashing, and databse reqest handling."
    corrected = correct_spelling(typo_text)
    assert "microservice" in corrected
    assert "authentication" in corrected
    assert "password" in corrected
    assert "database" in corrected
    assert "request" in corrected

def test_count_tokens():
    text = "Hello world! This is a test for token counting."
    res = client.post("/api/count-tokens", json={"text": text, "encoding": "cl100k_base"})
    assert res.status_code == 200
    count = res.json()["token_count"]
    assert count > 0

def test_defluff_and_bpe():
    raw = "Hello! Please kindly send me the API schema documentation thanks in advance!"
    defluffed = defluff_text(raw)
    assert "please" not in defluffed.lower()
    assert "kindly" not in defluffed.lower()
    assert "thanks" not in defluffed.lower()
    
    aligned = align_bpe_tokens(defluffed)
    assert len(aligned) <= len(raw)

def test_optimize_endpoint():
    payload = {
        "raw_text": "Hi there! Could you please optimize this authenitcation API microservce scheam for me? Thanks!",
        "bpe_optimization": True,
        "expand_oneliner": True
    }
    res = client.post("/api/optimize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "optimized_text" in data
    assert "authentication" in data["optimized_text"]
    assert "microservice" in data["optimized_text"]
    assert data["tokens_before"] >= data["tokens_after"]
    assert "sustainability" in data

def test_compile_endpoint_all_models_and_personas():
    personas = ["SDET", "DevOps", "Fullstack", "QA", "Scrum", "Data Engineer", "Manager", "Content Writer"]
    models = ["Claude", "ChatGPT", "Gemini", "Copilot"]
    
    for p in personas:
        for m in models:
            payload = {
                "optimized_text": "Create an authentication endpoint for user login with JWT.",
                "persona": p,
                "target_model": m,
                "compression_level": 3
            }
            res = client.post("/api/compile", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["persona"] == p
            assert data["target_model"] == m
            assert len(data["compiled_markdown"]) > 0

def test_sustainability():
    metrics = compute_sustainability(100, 40)
    assert metrics.tokens_saved == 60
    assert metrics.reduction_percent == 60.0
    assert metrics.energy_saved_wh > 0
    assert metrics.co2_reduced_g > 0
    assert metrics.water_saved_ml > 0

def test_expand_oneliner_endpoint():
    res = client.post("/api/expand-oneliner", json={"raw_text": "Build auth API"})
    assert res.status_code == 200
    data = res.json()
    assert data["expansion_applied"] is True
    assert "auth" in data["keywords_detected"]
