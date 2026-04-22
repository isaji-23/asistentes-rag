"""Division de texto en chunks con solapamiento.

Implementa un splitter recursivo: intenta cortar por separadores de mayor
a menor prioridad (parrafos, saltos de linea, frases, espacios, caracteres),
respetando un tamaño maximo y generando solapamiento entre chunks consecutivos
para preservar contexto.
"""
from app.config import get_settings

settings = get_settings()

# Separadores en orden de preferencia: primero cortes "semanticos",
# luego cortes mas duros si el texto no tiene estructura.
DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


def chunk_text(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[str]:
    """
    Trocea un texto en chunks con solapamiento.

    Args:
        text: texto completo a trocear
        chunk_size: tamaño maximo de cada chunk (en caracteres)
        chunk_overlap: caracteres de solapamiento entre chunks consecutivos

    Returns:
        Lista de chunks de texto, cada uno <= chunk_size.
    """
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap

    if not text or not text.strip():
        return []

    chunks = _split_recursive(text, chunk_size, DEFAULT_SEPARATORS)
    return _add_overlap(chunks, chunk_overlap)


def _split_recursive(text: str, chunk_size: int, separators: list[str]) -> list[str]:
    """Divide recursivamente hasta que cada fragmento quepa en chunk_size."""
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    separator = separators[0]
    remaining_separators = separators[1:]

    if separator == "":
        # Caso base: partimos a lo bruto por chunk_size.
        return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

    splits = text.split(separator)
    result = []
    current = ""

    for split in splits:
        candidate = current + separator + split if current else split

        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                result.append(current)
            # Si este split solo ya es demasiado grande, subdividirlo con el siguiente separador.
            if len(split) > chunk_size:
                result.extend(_split_recursive(split, chunk_size, remaining_separators))
                current = ""
            else:
                current = split

    if current:
        result.append(current)

    return [chunk for chunk in result if chunk.strip()]


def _add_overlap(chunks: list[str], overlap: int) -> list[str]:
    """Añade solapamiento copiando los ultimos N caracteres del chunk anterior."""
    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    result = [chunks[0]]
    for i in range(1, len(chunks)):
        previous_tail = chunks[i - 1][-overlap:]
        result.append(previous_tail + chunks[i])
    return result