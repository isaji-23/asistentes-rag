"""Cliente de Azure OpenAI para embeddings y chat."""
from functools import lru_cache

from openai import AzureOpenAI

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_openai_client() -> AzureOpenAI:
    """Singleton del cliente Azure OpenAI."""
    return AzureOpenAI(
        api_key=settings.azure_openai_api_key,
        azure_endpoint=settings.azure_openai_endpoint,
        api_version=settings.azure_openai_api_version,
    )


def embed_text(text: str) -> list[float]:
    """Genera el embedding de un unico texto."""
    client = get_openai_client()
    response = client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=text,
    )
    return response.data[0].embedding


def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Genera embeddings para varios textos en una sola llamada.
    Azure OpenAI acepta batches, asi reducimos latencia y llamadas a la API.
    """
    if not texts:
        return []
    client = get_openai_client()
    response = client.embeddings.create(
        model=settings.azure_openai_embedding_deployment,
        input=texts,
    )
    return [item.embedding for item in response.data]