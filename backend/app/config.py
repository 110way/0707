import os

class Settings:
    PROJECT_NAME: str = "AeroPrompt API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    TIKTOKEN_DEFAULT_ENCODING: str = os.getenv("TIKTOKEN_DEFAULT_ENCODING", "cl100k_base")
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

settings = Settings()
