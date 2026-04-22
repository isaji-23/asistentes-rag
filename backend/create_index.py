"""
Crea el indice de Azure AI Search para el sistema RAG multi-asistente.
Ejecutar una sola vez: python create_index.py
"""
import os
from dotenv import load_dotenv

from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    VectorSearchAlgorithmKind,
    VectorSearchProfile,
    HnswAlgorithmConfiguration,
    HnswParameters,
    VectorSearchAlgorithmMetric,
    SemanticConfiguration,
    SemanticPrioritizedFields,
    SemanticField,
    SemanticSearch,
)

load_dotenv()

ENDPOINT = os.environ["AZURE_SEARCH_ENDPOINT"]
API_KEY = os.environ["AZURE_SEARCH_API_KEY"]
INDEX_NAME = os.environ["AZURE_SEARCH_INDEX_NAME"]

# Dimensiones del vector segun el modelo de embeddings
EMBEDDING_DIMENSIONS = 3072  # text-embedding-3-large


def build_index() -> SearchIndex:
    # 1. Campos del indice
    fields = [
        SimpleField(
            name="chunk_id",
            type=SearchFieldDataType.String,
            key=True,
            filterable=True,
        ),
        SimpleField(
            name="assistant_id",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        SimpleField(
            name="document_id",
            type=SearchFieldDataType.String,
            filterable=True,
        ),
        SimpleField(
            name="document_name",
            type=SearchFieldDataType.String,
            retrievable=True,
        ),
        SimpleField(
            name="chunk_index",
            type=SearchFieldDataType.Int32,
            retrievable=True,
        ),
        SearchableField(
            name="content",
            type=SearchFieldDataType.String,
            analyzer_name="standard.lucene",
        ),
        SearchField(
            name="content_vector",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=EMBEDDING_DIMENSIONS,
            vector_search_profile_name="hnsw-profile",
        ),
    ]

    # 2. Configuracion de busqueda vectorial (HNSW)
    vector_search = VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(
                name="hnsw-config",
                kind=VectorSearchAlgorithmKind.HNSW,
                parameters=HnswParameters(
                    m=4,
                    ef_construction=400,
                    ef_search=500,
                    metric=VectorSearchAlgorithmMetric.COSINE,
                ),
            )
        ],
        profiles=[
            VectorSearchProfile(
                name="hnsw-profile",
                algorithm_configuration_name="hnsw-config",
            )
        ],
    )

    # 3. Configuracion del semantic ranker
    semantic_config = SemanticConfiguration(
        name="semantic-config",
        prioritized_fields=SemanticPrioritizedFields(
            title_field=SemanticField(field_name="document_name"),
            content_fields=[SemanticField(field_name="content")],
        ),
    )
    semantic_search = SemanticSearch(configurations=[semantic_config])

    # 4. Montar el indice
    return SearchIndex(
        name=INDEX_NAME,
        fields=fields,
        vector_search=vector_search,
        semantic_search=semantic_search,
    )


def main():
    client = SearchIndexClient(
        endpoint=ENDPOINT,
        credential=AzureKeyCredential(API_KEY),
    )

    existing = [name for name in client.list_index_names()]
    if INDEX_NAME in existing:
        print(f"[INFO] El indice '{INDEX_NAME}' ya existe.")
        answer = input("Quieres borrarlo y recrearlo? (s/N): ").strip().lower()
        if answer == "s":
            client.delete_index(INDEX_NAME)
            print(f"[OK] Indice borrado.")
        else:
            print("[INFO] No se toca. Saliendo.")
            return

    index = build_index()
    result = client.create_index(index)
    print(f"[OK] Indice '{result.name}' creado con {len(result.fields)} campos.")
    print(f"     Dimensiones del vector: {EMBEDDING_DIMENSIONS}")
    print(f"     Semantic config: semantic-config")
    print(f"     Vector profile:  hnsw-profile")


if __name__ == "__main__":
    main()