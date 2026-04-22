"""Cliente de Azure AI Search para indexar y buscar chunks."""
import uuid
from functools import lru_cache

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_search_client() -> SearchClient:
    """Singleton del cliente de Azure AI Search."""
    return SearchClient(
        endpoint=settings.azure_search_endpoint,
        index_name=settings.azure_search_index_name,
        credential=AzureKeyCredential(settings.azure_search_api_key),
    )


def upload_chunks(
    assistant_id: uuid.UUID,
    document_id: uuid.UUID,
    document_name: str,
    chunks: list[str],
    embeddings: list[list[float]],
) -> int:
    """
    Sube al indice todos los chunks de un documento.

    Returns:
        Numero de chunks subidos con exito.
    """
    if len(chunks) != len(embeddings):
        raise ValueError("chunks y embeddings deben tener la misma longitud")

    documents = [
        {
            "chunk_id": str(uuid.uuid4()),
            "assistant_id": str(assistant_id),
            "document_id": str(document_id),
            "document_name": document_name,
            "chunk_index": i,
            "content": chunk,
            "content_vector": embedding,
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    client = get_search_client()
    result = client.upload_documents(documents=documents)
    return sum(1 for r in result if r.succeeded)


def delete_document_chunks(document_id: uuid.UUID) -> int:
    """Borra del indice todos los chunks de un documento."""
    client = get_search_client()
    results = client.search(
        search_text="*",
        filter=f"document_id eq '{document_id}'",
        select=["chunk_id"],
        top=1000,
    )
    chunk_ids = [{"chunk_id": r["chunk_id"]} for r in results]
    if not chunk_ids:
        return 0
    result = client.delete_documents(documents=chunk_ids)
    return sum(1 for r in result if r.succeeded)


def delete_assistant_chunks(assistant_id: uuid.UUID) -> int:
    """Borra del indice todos los chunks de un asistente (todos sus documentos)."""
    client = get_search_client()
    results = client.search(
        search_text="*",
        filter=f"assistant_id eq '{assistant_id}'",
        select=["chunk_id"],
        top=1000,
    )
    chunk_ids = [{"chunk_id": r["chunk_id"]} for r in results]
    if not chunk_ids:
        return 0
    result = client.delete_documents(documents=chunk_ids)
    return sum(1 for r in result if r.succeeded)

def hybrid_search(
    query_text: str,
    query_vector: list[float],
    assistant_id: str,
    top: int = 5,
) -> list[dict]:
    """
    Busqueda hibrida (BM25 + vector) con semantic ranker, filtrada por assistant_id.

    Devuelve una lista de dicts con las claves:
        - document_id   (str, UUID)
        - document_name (str)
        - chunk_index   (int)
        - content       (str)
        - reranker_score (float | None)
    """
    client = get_search_client()

    vector_query = VectorizedQuery(
        vector=query_vector,
        k_nearest_neighbors=top,
        fields="content_vector",
    )

    results = client.search(
        search_text=query_text,
        vector_queries=[vector_query],
        filter=f"assistant_id eq '{assistant_id}'",
        query_type="semantic",
        semantic_configuration_name="semantic-config",
        select=["document_id", "document_name", "chunk_index", "content"],
        top=top,
    )

    chunks = []
    for r in results:
        chunks.append(
            {
                "document_id": r["document_id"],
                "document_name": r["document_name"],
                "chunk_index": r["chunk_index"],
                "content": r["content"],
                # @search.reranker_score solo existe con semantic ranker activo
                "reranker_score": r.get("@search.reranker_score"),
            }
        )
    return chunks