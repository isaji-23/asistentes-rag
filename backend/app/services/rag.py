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
import re
import uuid
from collections.abc import AsyncGenerator, Generator

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

# El LLM antepone este marcador cuando no puede responder con el contexto dado.
# Se elimina antes de almacenar/mostrar la respuesta.
NO_CONTEXT_MARKER = "<|NC|>"

SYSTEM_TEMPLATE = """\
Eres un asistente especializado. Para preguntas que requieran conocimiento especifico, \
basate UNICAMENTE en el contexto proporcionado entre las etiquetas <context> y </context>.

Reglas:
- Para saludos, despedidas o conversacion general que no requieran informacion de \
documentos, responde de forma natural y cordial sin usar el contexto.
- Si el usuario hace una pregunta que SI requiere informacion de los documentos pero \
el contexto no contiene informacion relevante para responderla, comunica de forma \
natural que no dispones de informacion suficiente (en el idioma apropiado segun tus \
instrucciones). OBLIGATORIO en ese caso: tu respuesta DEBE comenzar con exactamente \
`<|NC|>` (este marcador se eliminara antes de mostrarse al usuario).
- Ejemplo de respuesta sin contexto relevante: "<|NC|>No dispongo de informacion \
suficiente en los documentos para responder a esta pregunta."
- Para preguntas sobre los documentos, no inventes datos ni uses conocimiento externo.
- Cuando uses informacion de una o varias fuentes del contexto, cita TODOS los numeros \
de fuente que hayas consultado, incluyendo los inline en el texto (ej: "Segun [1]..." \
o "...como indican [1] y [2].") y al final de la respuesta lista todos los numeros \
usados entre corchetes (ej: [1][2]). No omitas ninguna fuente que haya contribuido \
a tu respuesta.
- Se conciso y directo.

Instrucciones especificas del asistente:
{instructions}
"""


def _build_system_prompt(instructions: str) -> str:
    return SYSTEM_TEMPLATE.format(
        instructions=instructions or "Ninguna instruccion adicional.",
    )


def _build_context_block(chunks: list[dict]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        parts.append(
            f"[{i}] [Fuente: {chunk['document_name']}, fragmento {chunk['chunk_index']}]\n"
            f"{chunk['content']}"
        )
    return "\n\n---\n\n".join(parts)


def _parse_cited_indices(response: str, num_chunks: int) -> set[int]:
    """Returns the 1-based chunk indices explicitly cited in the LLM response."""
    return {
        int(m.group(1))
        for m in re.finditer(r"\[(\d+)\]", response)
        if 1 <= int(m.group(1)) <= num_chunks
    }


def _renumber_response(response: str, cited: set[int]) -> tuple[str, dict[int, int]]:
    """
    Replaces [N] markers with sequential [1][2][3]… by order of first appearance.
    Returns (renumbered_text, {original_index: sequential_number}).
    """
    order: list[int] = []
    seen: set[int] = set()
    for m in re.finditer(r"\[(\d+)\]", response):
        idx = int(m.group(1))
        if idx in cited and idx not in seen:
            order.append(idx)
            seen.add(idx)
    mapping = {orig: seq for seq, orig in enumerate(order, start=1)}

    def replace(m: re.Match) -> str:
        idx = int(m.group(1))
        return f"[{mapping[idx]}]" if idx in mapping else m.group(0)

    return re.sub(r"\[(\d+)\]", replace, response), mapping


def _strip_marker(text: str) -> tuple[str, bool]:
    """Devuelve (texto_limpio, no_context). Elimina NO_CONTEXT_MARKER si esta presente."""
    if text.startswith(NO_CONTEXT_MARKER):
        return text[len(NO_CONTEXT_MARKER):].lstrip(), True
    return text, False


def _chat_completion(messages: list[dict], temperature: float = 0.2) -> str:
    client = get_openai_client()
    response = client.chat.completions.create(
        model=settings.azure_openai_llm_deployment,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content


def _build_messages_for_llm(
    assistant: Assistant,
    history_rows: list[Message],
    user_content: str,
    chunks: list[dict],
) -> list[dict]:
    system_prompt = _build_system_prompt(assistant.instructions)
    context_block = _build_context_block(chunks) if chunks else ""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history_rows:
        messages.append({"role": msg.role, "content": msg.content})
    if context_block:
        user_text = f"{user_content}\n\n<context>\n{context_block}\n</context>"
    else:
        user_text = user_content
    messages.append({"role": "user", "content": user_text})
    return messages


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
    history_rows: list[Message] = list(reversed(
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_WINDOW)
        .all()
    ))

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

    # 7. Llamada al LLM (siempre, incluso sin contexto)
    messages_for_llm = _build_messages_for_llm(assistant, history_rows, user_content, chunks)
    logger.debug(
        "LLM payload: %d messages (%d history turns, %d chunks)",
        len(messages_for_llm),
        len(history_rows),
        len(chunks),
    )
    llm_response = _chat_completion(messages=messages_for_llm, temperature=0.2)

    # 8. Detectar y eliminar marcador de no-contexto; renumerar [N] secuencialmente
    clean_response, no_context = _strip_marker(llm_response)
    cited = _parse_cited_indices(clean_response, len(chunks))
    clean_response, renumber_map = _renumber_response(clean_response, cited)

    # 9. Persistencia del mensaje del asistente
    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=clean_response,
    )
    db.add(assistant_msg)
    db.flush()

    # 10. Citas solo de los chunks que el LLM citó explícitamente
    citations: list[MessageCitation] = []
    if not no_context:
        for i, chunk in enumerate(chunks, start=1):
            if i not in cited:
                continue
            citation = MessageCitation(
                message_id=assistant_msg.id,
                document_id=uuid.UUID(chunk["document_id"]),
                document_name=chunk["document_name"],
                chunk_index=chunk["chunk_index"],
                content_snippet=chunk["content"][:500],
                citation_number=renumber_map.get(i),
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


async def stream_rag_pipeline(
    db: Session,
    assistant_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_content: str,
):
    """
    Igual que run_rag_pipeline pero yields eventos SSE en lugar de devolver
    la respuesta completa. Persiste mensajes y citas al finalizar el stream.
    """
    import asyncio
    import json

    assistant = db.get(Assistant, assistant_id)
    if assistant is None:
        yield "event: error\ndata: Asistente no encontrado\n\n"
        return

    history_rows = list(reversed(
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_WINDOW)
        .all()
    ))

    query_vector = embed_text(user_content)
    raw_chunks = hybrid_search(
        query_text=user_content,
        query_vector=query_vector,
        assistant_id=str(assistant_id),
        top=settings.retrieval_top_k,
    )
    chunks = [
        c for c in raw_chunks
        if (c.get("reranker_score") or 0) >= settings.reranker_min_score
    ]

    user_msg = Message(conversation_id=conversation_id, role="user", content=user_content)
    db.add(user_msg)
    db.flush()

    messages_for_llm = _build_messages_for_llm(assistant, history_rows, user_content, chunks)
    logger.debug(
        "LLM payload: %d messages (%d history turns, %d chunks)",
        len(messages_for_llm),
        len(history_rows),
        len(chunks),
    )

    client = get_openai_client()
    stream = client.chat.completions.create(
        model=settings.azure_openai_llm_deployment,
        messages=messages_for_llm,
        temperature=0.2,
        stream=True,
    )

    # Buffer initial tokens to detect NO_CONTEXT_MARKER before yielding to client
    MARKER_LEN = len(NO_CONTEXT_MARKER)
    full_response = ""
    no_context = False
    initial_buffer = ""
    marker_checked = False

    for chunk_event in stream:
        delta = chunk_event.choices[0].delta.content if chunk_event.choices else None
        if not delta:
            continue

        if not marker_checked:
            initial_buffer += delta
            if len(initial_buffer) >= MARKER_LEN:
                marker_checked = True
                if initial_buffer.startswith(NO_CONTEXT_MARKER):
                    no_context = True
                    to_yield = initial_buffer[MARKER_LEN:].lstrip()
                else:
                    to_yield = initial_buffer
                full_response += to_yield
                if to_yield:
                    escaped = to_yield.replace("\n", "\\n")
                    yield f"event: token\ndata: {escaped}\n\n"
                    await asyncio.sleep(0)
        else:
            full_response += delta
            escaped = delta.replace("\n", "\\n")
            yield f"event: token\ndata: {escaped}\n\n"
            await asyncio.sleep(0)

    # Flush remaining buffer if stream ended before reaching MARKER_LEN
    if not marker_checked and initial_buffer:
        if initial_buffer.startswith(NO_CONTEXT_MARKER):
            no_context = True
            to_yield = initial_buffer[MARKER_LEN:].lstrip()
        else:
            to_yield = initial_buffer
        full_response += to_yield
        if to_yield:
            escaped = to_yield.replace("\n", "\\n")
            yield f"event: token\ndata: {escaped}\n\n"
            await asyncio.sleep(0)

    # Renumerar [N] secuencialmente antes de persistir
    cited = _parse_cited_indices(full_response, len(chunks))
    full_response, renumber_map = _renumber_response(full_response, cited)

    assistant_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=full_response,
    )
    db.add(assistant_msg)
    db.flush()

    # Citas solo de los chunks que el LLM citó explícitamente
    citations = []
    if not no_context:
        for i, c in enumerate(chunks, start=1):
            if i not in cited:
                continue
            citation = MessageCitation(
                message_id=assistant_msg.id,
                document_id=uuid.UUID(c["document_id"]),
                document_name=c["document_name"],
                chunk_index=c["chunk_index"],
                content_snippet=c["content"][:500],
                citation_number=renumber_map.get(i),
            )
            db.add(citation)
            citations.append(citation)

    # Captura los valores antes del commit (expire_on_commit los invalida)
    citations_data = [
        {
            "document_id": str(c.document_id),
            "document_name": c.document_name,
            "chunk_index": c.chunk_index,
            "content_snippet": c.content_snippet,
            "citation_number": c.citation_number,
        }
        for c in citations
    ]

    _update_conversation_timestamp(db, conversation_id)
    db.commit()

    citations_payload = json.dumps(citations_data)
    yield f"event: citations\ndata: {citations_payload}\n\n"
    await asyncio.sleep(0)
    yield "event: done\ndata: {}\n\n"
