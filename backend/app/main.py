"""Entry point de la aplicacion FastAPI."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models import *  # noqa: F401, F403 - importa los modelos para create_all
from app.routers import assistants, documents, chat as chat_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Startup: crea tablas si no existen
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: aqui iria cleanup si lo necesitaramos


app = FastAPI(
    title="Asistentes RAG",
    description="API para gestionar asistentes personalizados con RAG aislado por asistente",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: permitimos que el frontend (que correra en otro puerto) llame a la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en produccion: lista de dominios reales
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistants.router)
app.include_router(documents.router)
app.include_router(chat_router.router)

@app.get("/health", tags=["health"])
def health():
    """Endpoint de salud."""
    return {"status": "ok"}