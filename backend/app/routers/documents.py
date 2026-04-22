"""Endpoints para gestionar documentos de un asistente."""
import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session
import mimetypes

from app.database import SessionLocal, get_db
from app.models import Assistant, Document
from app.schemas import DocumentResponse
from app.services import ingestion, supabase_storage
from app.services.azure_search import delete_document_chunks
from app.services.extraction import SUPPORTED_EXTENSIONS

router = APIRouter(
    prefix="/assistants/{assistant_id}/documents",
    tags=["documents"],
)

MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB

# Mapeo explicito de MIME types para los formatos que soportamos.
# Usamos este en lugar de depender de lo que manda el cliente, que es poco fiable.
EXTENSION_TO_MIME = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".md": "text/markdown",
}

def _get_assistant_or_404(assistant_id: uuid.UUID, db: Session) -> Assistant:
    assistant = db.get(Assistant, assistant_id)
    if not assistant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asistente no encontrado",
        )
    return assistant


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Subir un documento a un asistente",
)
async def upload_document(
    assistant_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    _get_assistant_or_404(assistant_id, db)

    # Validar extension
    filename = file.filename or "unnamed"
    extension = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Formato no soportado. Permitidos: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    # Leer contenido y validar tamaño
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El fichero excede el tamaño maximo de {MAX_UPLOAD_SIZE // (1024*1024)} MB",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El fichero esta vacio",
        )

    # Crear el registro del documento
    document = Document(
        assistant_id=assistant_id,
        filename=filename,
        storage_path="",  # lo rellenamos tras subir
        status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Subir a Supabase Storage
    storage_path = f"{assistant_id}/{document.id}/{filename}"
    content_type = EXTENSION_TO_MIME.get(extension) or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    try:
        supabase_storage.upload_file(
            path=storage_path,
            file_bytes=content,
            content_type=content_type,
        )
    except Exception as e:
        db.delete(document)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"No se pudo subir el fichero al storage: {e}",
        )

    document.storage_path = storage_path
    db.commit()
    db.refresh(document)

    # Lanzar la ingesta en segundo plano
    background_tasks.add_task(
        ingestion.ingest_document,
        db_session_factory=SessionLocal,
        document_id=document.id,
        assistant_id=assistant_id,
        filename=filename,
        content=content,
    )

    return document


@router.get(
    "",
    response_model=list[DocumentResponse],
    summary="Listar documentos de un asistente",
)
def list_documents(assistant_id: uuid.UUID, db: Session = Depends(get_db)):
    _get_assistant_or_404(assistant_id, db)
    stmt = (
        select(Document)
        .where(Document.assistant_id == assistant_id)
        .order_by(Document.uploaded_at.desc())
    )
    return db.scalars(stmt).all()


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un documento",
)
def delete_document(
    assistant_id: uuid.UUID,
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    _get_assistant_or_404(assistant_id, db)
    document = db.get(Document, document_id)
    if not document or document.assistant_id != assistant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento no encontrado",
        )

    # Borrar del indice vectorial
    try:
        delete_document_chunks(document_id)
    except Exception:
        # Si falla, seguimos igualmente con el borrado de BBDD y storage
        pass

    # Borrar del storage
    try:
        supabase_storage.delete_file(document.storage_path)
    except Exception:
        pass

    # Borrar de BBDD
    db.delete(document)
    db.commit()
    return None