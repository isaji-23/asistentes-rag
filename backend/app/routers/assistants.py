"""Endpoints CRUD para asistentes."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Assistant, Document
from app.schemas import (
    AssistantCreate,
    AssistantListItem,
    AssistantResponse,
    AssistantUpdate,
)

router = APIRouter(prefix="/assistants", tags=["assistants"])


@router.post(
    "",
    response_model=AssistantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un asistente",
)
def create_assistant(payload: AssistantCreate, db: Session = Depends(get_db)):
    assistant = Assistant(
        name=payload.name,
        description=payload.description,
        instructions=payload.instructions,
    )
    db.add(assistant)
    db.commit()
    db.refresh(assistant)
    return assistant


@router.get(
    "",
    response_model=list[AssistantListItem],
    summary="Listar asistentes",
)
def list_assistants(db: Session = Depends(get_db)):
    stmt = select(Assistant).order_by(Assistant.created_at.desc())
    return db.scalars(stmt).all()


@router.get(
    "/{assistant_id}",
    response_model=AssistantResponse,
    summary="Obtener un asistente por id",
)
def get_assistant(assistant_id: uuid.UUID, db: Session = Depends(get_db)):
    assistant = db.get(Assistant, assistant_id)
    if not assistant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asistente no encontrado",
        )
    return assistant


@router.patch(
    "/{assistant_id}",
    response_model=AssistantResponse,
    summary="Actualizar un asistente",
)
def update_assistant(
    assistant_id: uuid.UUID,
    payload: AssistantUpdate,
    db: Session = Depends(get_db),
):
    assistant = db.get(Assistant, assistant_id)
    if not assistant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asistente no encontrado",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(assistant, field, value)

    db.commit()
    db.refresh(assistant)
    return assistant


@router.delete(
    "/{assistant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un asistente y todos sus documentos",
)
def delete_assistant(assistant_id: uuid.UUID, db: Session = Depends(get_db)):
    assistant = db.get(Assistant, assistant_id)
    if not assistant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asistente no encontrado",
        )

    from app.services.azure_search import delete_assistant_chunks
    from app.services import supabase_storage

    # Borrar chunks del índice vectorial
    try:
        delete_assistant_chunks(assistant_id)
    except Exception:
        pass

    # Borrar ficheros del storage usando los paths exactos de cada documento
    documents = db.query(Document).filter(Document.assistant_id == assistant_id).all()
    for doc in documents:
        if doc.storage_path:
            try:
                supabase_storage.delete_file(doc.storage_path)
            except Exception:
                pass

    # Borrar de BBDD (cascade elimina documentos, conversaciones y mensajes)
    db.delete(assistant)
    db.commit()
    return None