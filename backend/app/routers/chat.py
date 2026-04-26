import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.assistant import Assistant
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import (
    ChatResponse,
    ConversationCreate,
    ConversationDetail,
    ConversationRead,
    MessageRead,
    CitationRead,
)
from app.services.rag import run_rag_pipeline, stream_rag_pipeline
from app.schemas.chat import MessageCreate

router = APIRouter(tags=["chat"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_assistant_or_404(assistant_id: uuid.UUID, db: Session) -> Assistant:
    assistant = db.get(Assistant, assistant_id)
    if not assistant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Asistente no encontrado."
        )
    return assistant


def _get_conversation_or_404(conversation_id: uuid.UUID, db: Session) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversacion no encontrada."
        )
    return conv


def _message_to_schema(msg: Message) -> MessageRead:
    return MessageRead(
        id=msg.id,
        conversation_id=msg.conversation_id,
        role=msg.role,
        content=msg.content,
        created_at=msg.created_at,
        citations=[
            CitationRead(
                id=c.id,
                document_id=c.document_id,
                document_name=c.document_name,
                chunk_index=c.chunk_index,
                content_snippet=c.content_snippet,
                citation_number=c.citation_number,
            )
            for c in (msg.citations if hasattr(msg, "citations") else [])
        ],
    )


# ---------------------------------------------------------------------------
# Endpoints de conversaciones
# ---------------------------------------------------------------------------


@router.post(
    "/assistants/{assistant_id}/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    assistant_id: uuid.UUID,
    body: ConversationCreate,
    db: Session = Depends(get_db),
):
    _get_assistant_or_404(assistant_id, db)
    conv = Conversation(
        assistant_id=assistant_id,
        title=body.title,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get(
    "/assistants/{assistant_id}/conversations",
    response_model=list[ConversationRead],
)
def list_conversations(
    assistant_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    _get_assistant_or_404(assistant_id, db)
    return (
        db.query(Conversation)
        .filter(Conversation.assistant_id == assistant_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
)
def get_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    conv = _get_conversation_or_404(conversation_id, db)
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return ConversationDetail(
        id=conv.id,
        assistant_id=conv.assistant_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_message_to_schema(m) for m in messages],
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    conv = _get_conversation_or_404(conversation_id, db)
    db.delete(conv)
    db.commit()


# ---------------------------------------------------------------------------
# Endpoint principal: enviar mensaje
# ---------------------------------------------------------------------------


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
)
def send_message(
    conversation_id: uuid.UUID,
    body: MessageCreate,
    db: Session = Depends(get_db),
):
    """
    Envia un mensaje del usuario y devuelve la respuesta del asistente con citas.

    El pipeline completo es sincrono (no streaming). Puede tardar varios
    segundos segun el volumen de documentos y la latencia de Azure.
    """
    conv = _get_conversation_or_404(conversation_id, db)

    if not body.content or not body.content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El mensaje no puede estar vacio.",
        )

    try:
        user_msg, assistant_msg, citations = run_rag_pipeline(
            db=db,
            assistant_id=conv.assistant_id,
            conversation_id=conversation_id,
            user_content=body.content.strip(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en el pipeline RAG: {exc}",
        )

    # Adjuntamos las citas al mensaje del asistente para la serializacion
    assistant_msg.citations = citations

    return ChatResponse(
        user_message=_message_to_schema(user_msg),
        assistant_message=_message_to_schema(assistant_msg),
    )


@router.post("/conversations/{conversation_id}/messages/stream")
def send_message_stream(
    conversation_id: uuid.UUID,
    body: MessageCreate,
    db: Session = Depends(get_db),
):
    conv = _get_conversation_or_404(conversation_id, db)

    if not body.content or not body.content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El mensaje no puede estar vacio.",
        )

    return StreamingResponse(
        stream_rag_pipeline(
            db=db,
            assistant_id=conv.assistant_id,
            conversation_id=conversation_id,
            user_content=body.content.strip(),
        ),
        media_type="text/event-stream",
        headers={"X-Accel-Buffering": "no"},
    )
