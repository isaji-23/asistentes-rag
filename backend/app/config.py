"""Lectura y validacion de variables de entorno."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno de la aplicacion."""

    # Supabase
    database_url: str
    supabase_url: str
    supabase_service_key: str
    supabase_bucket: str = "assistant-documents"

    # Azure OpenAI
    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_llm_deployment: str
    azure_openai_embedding_deployment: str

    # Azure AI Search
    azure_search_endpoint: str
    azure_search_api_key: str
    azure_search_index_name: str = "assistants-rag"

    # RAG tuning
    chunk_size: int = 800
    chunk_overlap: int = 150
    retrieval_top_k: int = 5
    reranker_min_score: float = 1.5

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Singleton de Settings. Cacheado para no releer el .env en cada request."""
    return Settings()