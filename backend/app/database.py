"""Configuracion de la base de datos con SQLAlchemy."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,   # Verifica que la conexion sigue viva antes de usarla
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base comun de todos los modelos ORM."""
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency injection para obtener una sesion de BBDD por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()