"""Cliente de Supabase Storage para subir, descargar y borrar ficheros."""
from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings

settings = get_settings()


@lru_cache
def get_supabase_client() -> Client:
    """Singleton del cliente de Supabase."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def upload_file(path: str, file_bytes: bytes, content_type: str) -> str:
    """
    Sube un fichero al bucket de Supabase.

    Args:
        path: ruta dentro del bucket, ej. '{assistant_id}/{document_id}/fichero.pdf'
        file_bytes: contenido del fichero
        content_type: MIME type

    Returns:
        La ruta del fichero (misma que el parametro path).
    """
    client = get_supabase_client()
    client.storage.from_(settings.supabase_bucket).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return path


def delete_file(path: str) -> None:
    """Borra un fichero del bucket."""
    client = get_supabase_client()
    client.storage.from_(settings.supabase_bucket).remove([path])


def delete_prefix(prefix: str) -> None:
    """Borra todos los ficheros bajo un prefijo (todos los docs de un asistente)."""
    client = get_supabase_client()
    files = client.storage.from_(settings.supabase_bucket).list(prefix)
    if not files:
        return
    paths = [f"{prefix}/{f['name']}" for f in files]
    client.storage.from_(settings.supabase_bucket).remove(paths)