"""Schemas de request y response para asistentes."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AssistantBase(BaseModel):
    """Campos comunes entre create y update."""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    instructions: str = Field("Eres un asistente útil", max_length=10000)


class AssistantCreate(AssistantBase):
    """Payload para crear un asistente."""
    pass


class AssistantUpdate(BaseModel):
    """Payload para actualizar un asistente. Todos los campos son opcionales."""
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    instructions: str | None = Field(None, max_length=10000)


class AssistantResponse(AssistantBase):
    """Respuesta completa de un asistente."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssistantListItem(BaseModel):
    """Version resumida para el listado (sin instrucciones completas)."""
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)