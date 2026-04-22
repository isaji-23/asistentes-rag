"""
Orquestador del pipeline RAG clasico.

Flujo:
  1. Carga asistente e historial de la conversacion.
  2. Genera embedding de la pregunta del usuario.
  3. Busqueda hibrida en Azure AI Search filtrada por assistant_id.
  4. Filtra chunks por reranker_score minimo.
  5. Construye el prompt (system + historial + contexto + pregunta).
  6. Llama al LLM.
  7. Persiste mensajes y citas en Postgres.
  8. Devuelve respuesta y citas estructuradas.
"""

import logging
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.assistant import Assistant
from app.models.conversation import Conversation
from app.models.message import Message, MessageCitation
from app.services.azure_openai import embed_text, get_openai_client
from app.services.azure_search import hybrid_search

logger = logging.getLogger(__name__)

settings = get_settings()

HISTORY_WINDOW = 10

NO_CONTEXT_REPLY = (
    "No dispongo de informacion suficiente en los documentos de este asistente "
    "para responder a tu pregunta."
)

SYSTEM_TEMPLATE = """\
Eres un asistente especializado. Responde UNICAMENTE basandote en el contexto \
proporcionado entre las etiquetas <context> y </context>.

Reglas:
- Si el contexto no contiene informacion suficiente para responder, di \
exactamente: "{no_context_reply}"
- No inventes datos ni uses conocimiento externo al contexto.
- Responde en el mismo idioma en que te hagan la pregunta.
- Se conciso y directo.

Instrucciones especificas del asistente:
{instructions}
"""


def _build_system_prompt(instructions: str) -> str:
    return SYSTEM_TEMPLATE.format(
        no_context_reply=NO_CONTEXT_REPLY,
        instructions=instructions or "Ninguna instruccion adicional.",
    )


def _build_context_block(chunks: list[dict]) -> str:
    parts = []
    for chunk in chunks:
        parts.append(
            f"[Fuente: {chunk['document_name']}, fragmento {chunk['chunk_index']}]\n"
            f"{chunk['content']}"
        )
    return "\n\n---\n\n".join(parts)


def _chat_completion(messages: list[dict], temperature: float = 0.2) -> str:
    client = get_openai_client()
    response = client.chat.completions.create(
        model=settings.azure_openai_llm_deployment,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content


def run_rag_pipeline(
    db: Session,
    assistant_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_content: str,
) -> tuple[Message, Message, list[MessageCitation]]:
    """
    Ejecuta el pipeline RAG completo y persiste los resultados.

    Devuelve: (user_message, assistant_message, citations)
    """

    # 1. Carga del asistente
    assistant: Assistant = db.get(Assistant, assistant_id)
    if assistant is None:
        raise ValueError(f"Asistente {assistant_id} no encontrado.")

    # 2. Historial reciente
    history_rows: list[Message] = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_WINDOW)
        .all()
    )
    history_rows = list(reversed(history_rows))

    # 3. Embedding de la pregunta
    query_vector = embed_text(user_content)

    # 4. Busqueda hibrida
    raw_chunks = hybrid_search(
        query_text=user_content,
        query_vector=query_vector,
        assistant_id=str(assistant_id),
        top=settings.retrieval_top_k,
    )

    # 5. Filtrado por reranker_score
    chunks = [
        c for c in raw_chunks
        if (c.get("reranker_score") or 0) >= settings.reranker_min_score
    ]

    logger.info(
        "RAG: %d chunks recuperados, %d superan el umbral de score.",
        len(raw_chunks),
        len(chunks),
    )

    # 6. Persiste el mensaje del usuario
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=user_content,
    )
    db.add(user_msg)
    db.flush()

    # 7. Sin contexto suficiente: respuesta hardcoded, sin llamar al LLM
    if not chunks:
        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=NO_CONTEXT_REPLY,
        )
        db.add(assistant_msg)
        _update_conversation_timestamp(db, conversation_id)
        db.commit()
        db.refresh(user_msg)
        db.refresh(assistant_msg)
        return user_msg, assistant_msg, []

    # 8. Construccion del prompt
    system_prompt = _build_system_prompt(assistant.instructions)
    context_block = _build_context_block(chunks)

    messages_for_llm = [{"role": "system", "content": system_prompt}]

    for msg in history_rows:
        messages_for_llm.append({"role": msg.role, "content": msg.content})

    user_turn = (
        f"{user_content}\n\n"
        f"<context>\n{context_block}\n</context>"
    )
    messages_for_llm.append({"role": "user", "content": user_turn})

    # 9. Llamada al LLM
    llm_response = _chat_completion(messages=messages_for_llm, temperature=0.2)

    # 10. Persistencia del mensaje del asistente y las citas
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=llm_response,
    )
    db.add(assistant_msg)
    db.flush()

    citations: list[MessageCitation] = []
    for chunk in chunks:
        citation = MessageCitation(
            message_id=assistant_msg.id,
            document_id=uuid.UUID(chunk["document_id"]),
            document_name=chunk["document_name"],
            chunk_index=chunk["chunk_index"],
            content_snippet=chunk["content"][:500],
        )
        db.add(citation)
        citations.append(citation)

    _update_conversation_timestamp(db, conversation_id)
    db.commit()

    db.refresh(user_msg)
    db.refresh(assistant_msg)
    for c in citations:
        db.refresh(c)

    return user_msg, assistant_msg, citations


def _update_conversation_timestamp(db: Session, conversation_id: uuid.UUID) -> None:
    db.query(Conversation).filter(Conversation.id == conversation_id).update(
        {"updated_at": func.now()}, synchronize_session=False
    )