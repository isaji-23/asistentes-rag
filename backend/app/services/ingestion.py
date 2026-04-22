"""Orquestador del pipeline de ingesta de documentos."""
import logging
import uuid

from sqlalchemy.orm import Session

from app.models import Document
from app.services import azure_openai, azure_search, chunking, extraction

logger = logging.getLogger(__name__)


def ingest_document(
    db_session_factory,
    document_id: uuid.UUID,
    assistant_id: uuid.UUID,
    filename: str,
    content: bytes,
) -> None:
    """
    Pipeline completo de ingesta: extraccion -> chunking -> embeddings -> indexado.

    Pensado para ejecutarse como BackgroundTask. Por eso recibe una factory
    de sesiones (no una sesion) para abrir su propia conexion, ya que la
    sesion del request original ya se habra cerrado.
    """
    db: Session = db_session_factory()
    try:
        document = db.get(Document, document_id)
        if not document:
            logger.error(f"Document {document_id} no existe. Abortando ingesta.")
            return

        try:
            # 1. Extraer texto
            text = extraction.extract_text(filename, content)
            if not text.strip():
                raise ValueError("El documento no contiene texto extraible")

            # 2. Chunking
            chunks = chunking.chunk_text(text)
            if not chunks:
                raise ValueError("El texto no pudo ser troceado en chunks")

            logger.info(f"Documento {document_id}: {len(chunks)} chunks generados")

            # 3. Embeddings (en batch)
            embeddings = azure_openai.embed_batch(chunks)

            # 4. Upload al indice
            uploaded = azure_search.upload_chunks(
                assistant_id=assistant_id,
                document_id=document_id,
                document_name=filename,
                chunks=chunks,
                embeddings=embeddings,
            )

            # 5. Marcar como indexado
            document.status = "indexed"
            document.chunk_count = uploaded
            db.commit()
            logger.info(f"Documento {document_id} indexado: {uploaded} chunks")

        except Exception as e:
            logger.exception(f"Fallo al ingerir documento {document_id}: {e}")
            document.status = "failed"
            db.commit()
            # Limpieza: borramos chunks parcialmente subidos por si acaso
            try:
                azure_search.delete_document_chunks(document_id)
            except Exception:
                logger.exception("Error adicional limpiando chunks parciales")
    finally:
        db.close()