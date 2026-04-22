"""Schemas de request y response para documentos."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    """Respuesta con los datos de un documento."""
    id: uuid.UUID
    assistant_id: uuid.UUID
    filename: str
    status: str  # pending | indexed | failed
    chunk_count: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)