import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Conversaciones
# ---------------------------------------------------------------------------

class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationRead(BaseModel):
    id: uuid.UUID
    assistant_id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Mensajes
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    content: str


class CitationRead(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    chunk_index: int
    content_snippet: str

    model_config = {"from_attributes": True}


class MessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime
    citations: list[CitationRead] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Respuesta del endpoint POST /conversations/{id}/messages
# ---------------------------------------------------------------------------

class ChatResponse(BaseModel):
    user_message: MessageRead
    assistant_message: MessageRead


# ---------------------------------------------------------------------------
# Detalle de conversacion con mensajes
# ---------------------------------------------------------------------------

class ConversationDetail(BaseModel):
    id: uuid.UUID
    assistant_id: uuid.UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    messages: list[MessageRead] = []

    model_config = {"from_attributes": True}