# Asistentes RAG multi-tenant

Aplicación full-stack para crear y conversar con asistentes personalizados basados en documentos propios mediante RAG (Retrieval-Augmented Generation), con aislamiento total entre asistentes.

---

## Tabla de contenidos

- [Asistentes RAG multi-tenant](#asistentes-rag-multi-tenant)
	- [Tabla de contenidos](#tabla-de-contenidos)
	- [Resumen](#resumen)
	- [Arquitectura de infraestructura](#arquitectura-de-infraestructura)
		- [Servicios y responsabilidades](#servicios-y-responsabilidades)
		- [Despliegue de Azure AI Foundry](#despliegue-de-azure-ai-foundry)
		- [Configuración de Azure AI Search](#configuración-de-azure-ai-search)
	- [Cómo se cumple el core de la práctica](#cómo-se-cumple-el-core-de-la-práctica)
		- [Aislamiento por asistente](#aislamiento-por-asistente)
		- [Persistencia de conversaciones](#persistencia-de-conversaciones)
		- [Citas y comportamiento "no inventar"](#citas-y-comportamiento-no-inventar)
	- [Pipeline de ingesta de documentos](#pipeline-de-ingesta-de-documentos)
	- [Pipeline de chat RAG](#pipeline-de-chat-rag)
		- [Dos variantes del pipeline](#dos-variantes-del-pipeline)
	- [Decisiones de diseño](#decisiones-de-diseño)
	- [Backend (FastAPI)](#backend-fastapi)
		- [Modelo de datos](#modelo-de-datos)
		- [Organización de capas](#organización-de-capas)
	- [Frontend (Next.js)](#frontend-nextjs)
	- [Ejecución local](#ejecución-local)
		- [Requisitos previos](#requisitos-previos)
		- [Backend](#backend)
		- [Frontend](#frontend)
		- [Variables de entorno principales](#variables-de-entorno-principales)

---

## Resumen

La plataforma permite a un usuario crear varios asistentes, cada uno con sus propias instrucciones de comportamiento y su propia base documental, y mantener conversaciones con ellos. Cada asistente solo puede responder usando información de **sus propios documentos**, el aislamiento es absoluto y se garantiza a nivel de infraestructura, no solo de aplicación.

Cuando el asistente no encuentra evidencia suficiente en sus documentos, lo declara explícitamente en lugar de inventar. Cuando sí responde, las afirmaciones llevan citas trazables al fragmento concreto del documento de origen.

Técnicamente es un sistema RAG clásico (no agéntico): pipeline lineal sin tool calling ni descomposición de queries por LLM. La calidad del retrieval se logra mediante **búsqueda híbrida** (BM25 + vectorial) con **semantic reranker** sobre Azure AI Search.

---

## Arquitectura de infraestructura

```
┌──────────────────────────┐
│       Frontend           │
│   (Next.js + Tailwind)   │
└────────────┬─────────────┘
             │ HTTPS
             ▼
┌──────────────────────────────────────────────────────────────┐
│                    Backend FastAPI                           │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐  │
│  │  Asistentes  │   Ingesta    │  Chat RAG    │ Historial │  │
│  │     CRUD     │  (background)│   (sync+SSE) │   CRUD    │  │
│  └──────────────┴──────────────┴──────────────┴───────────┘  │
└──┬──────────────┬──────────────┬─────────────────┬───────────┘
   │              │              │                 │
   ▼              ▼              ▼                 ▼
┌────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────────┐
│Postgres│  │ Supabase │  │ Azure AI     │  │ Azure       │
│Supabase│  │ Storage  │  │ Search       │  │ OpenAI      │
│        │  │          │  │ (Basic +     │  │ (via        │
│metadata│  │ ficheros │  │ semantic     │  │ Foundry)    │
│ + chat │  │originales│  │ reranker)    │  │             │
└────────┘  └──────────┘  └──────────────┘  └─────────────┘
                                  │
                                  ▼
                    Filtro `assistant_id` en cada query
                       → aislamiento multi-tenant
```

### Servicios y responsabilidades

| Servicio | Rol | Por qué este |
|---|---|---|
| **Azure AI Search** (tier Basic) | Vector store + búsqueda híbrida + reranker semántico | Soporta vector search, BM25 y reranking en un único motor con filtros por metadata |
| **Azure OpenAI** (vía Azure AI Foundry) | LLM (`gpt-4o-mini`) y embeddings (`text-embedding-3-large`) | Acceso empresarial a los modelos de OpenAI con cumplimiento de datos en Azure |
| **Supabase Postgres** | Datos relacionales: asistentes, documentos, conversaciones, mensajes, citas | Postgres gestionado con panel web, baja fricción de despliegue |
| **Supabase Storage** | Ficheros originales subidos por el usuario | S3-compatible, integrado con la cuenta de BBDD, tier gratuito generoso |

### Despliegue de Azure AI Foundry

Deployments configurados:
- `gpt-4o-mini`
- `text-embedding-3-large` - vectores de 3072 dimensiones

### Configuración de Azure AI Search

Servicio: tier **Basic**, semantic ranker en plan **Free** (1000 queries/mes), un único índice llamado `assistants-rag`.

**Esquema del índice:**

| Campo | Tipo | Propiedades | Función |
|---|---|---|---|
| `chunk_id` | String | key, filterable | Identificador único del fragmento |
| `assistant_id` | String | filterable | **Aislamiento entre asistentes** |
| `document_id` | String | filterable | Permite borrar todos los chunks de un documento |
| `document_name` | String | retrievable | Para mostrar en las citas |
| `chunk_index` | Int32 | retrievable | Posición del chunk dentro del documento |
| `content` | String | searchable | Índice invertido BM25 |
| `content_vector` | Collection(Single) | searchable, 3072 dims, HNSW cosine | Índice vectorial |

---

## Cómo se cumple el core de la práctica

### Aislamiento por asistente

El requisito crítico del enunciado: **un asistente nunca puede recuperar documentos de otro asistente**.

**Mecanismo elegido**: un único índice en Azure AI Search con el campo `assistant_id` marcado como `filterable`. Cada chunk indexado lleva su `assistant_id` como metadato. Cada query incluye obligatoriamente `filter="assistant_id eq '{id}'"`.

**Por qué un solo índice y no uno por asistente**: crear/borrar índices al crear/borrar asistentes es lento (segundos por operación), y el tier Basic limita a 15 índices, lo que rompería la escalabilidad. Con un índice y filtro, crear un asistente es una operación O(1) sobre Postgres.

**Mitigación del riesgo de fuga**: toda búsqueda en el índice pasa por una **única función centralizada** en `app/services/azure_search.py`. No existe otro punto de acceso al cliente de Search en el código. El filtro por `assistant_id` no es opcional: se construye dentro de esa función a partir del parámetro recibido. Es imposible "olvidarlo" desde un endpoint sin modificar la función central.

### Persistencia de conversaciones

Cada conversación se asocia a un asistente en Postgres. Los mensajes se guardan en orden cronológico con su rol (`user` o `assistant`). Al continuar una conversación, el backend carga los últimos 10 mensajes para construir el contexto, garantizando memoria conversacional. La conversación puede reanudarse en cualquier momento o iniciarse de cero borrando el registro.

### Citas y comportamiento "no inventar"

Dos defensas combinadas:

1. **Filtrado por relevancia antes del LLM**: tras el reranking semántico, los chunks con `reranker_score` por debajo de un umbral configurable (por defecto 1.5) se descartan. Si **no queda ningún chunk válido**, el LLM responde con un mensaje acorde.

2. **Marcador estructurado en el prompt**: cuando sí hay contexto, el LLM recibe la instrucción de emitir el marcador `<|NC|>` si considera que el contexto recuperado no responde realmente a la pregunta. El backend detecta este marcador, lo elimina de la respuesta visible y lo trata como una respuesta "no contestable".

**Citas trazables**: el LLM debe insertar referencias `[N]` en el cuerpo de la respuesta vinculadas a los chunks usados. El backend post-procesa esas citas, las renumera secuencialmente, y solo persiste en `message_citations` los chunks que el LLM efectivamente referenció (no todos los recuperados). Así las citas mostradas al usuario son las que realmente fundamentaron la respuesta.

---

## Pipeline de ingesta de documentos

```
Cliente sube fichero
        │
        ▼
┌─────────────────────────────────────────┐
│ POST /assistants/{id}/documents         │
│  • Valida extensión (pdf/docx/pptx/txt) │
│  • Valida tamaño ≤ 25 MB                │
│  • Deduce MIME en backend (no cliente)  │
│  • Crea registro: status="pending"      │
│  • Sube a Supabase Storage              │
│  • Lanza BackgroundTask                 │
│  • Responde 202 Accepted                │
└────────────────┬────────────────────────┘
                 │ (asíncrono)
                 ▼
┌──────────────────────────────────────────┐
│ BackgroundTask: pipeline de ingesta      │
│                                          │
│  1. Extrae texto                         │
│     pypdf / python-docx / python-pptx    │
│                                          │
│  2. Chunking recursivo                   │
│     • chunk_size: 800 chars              │
│     • overlap:    150 chars              │
│     • separadores: \n\n → \n → . → ' '   │
│                                          │
│  3. Embeddings en batch                  │
│     • 1 sola llamada a Azure OpenAI      │
│       con todos los chunks juntos        │
│                                          │
│  4. Upload a Azure AI Search             │
│     • cada chunk con assistant_id        │
│       como metadata filtrable            │
│                                          │
│  5. status="indexed" + chunk_count       │
│                                          │
│  En caso de error:                       │
│   • status="failed"                      │
│   • limpia chunks parcialmente subidos   │
└──────────────────────────────────────────┘
```

**Por qué BackgroundTasks y no respuesta síncrona**: ingerir un PDF de 50 páginas puede tardar 20-40 segundos por las llamadas a embeddings. Hacer el cliente esperar daría una mala UX. Se devuelve `202 Accepted` y el frontend hace polling al endpoint de listado para ver cuándo el documento pasa de `pending` a `indexed`.

**Por qué embeddings en batch**: Azure OpenAI permite mandar múltiples textos en una sola llamada. Para un documento con 50 chunks, esto reduce de 50 round-trips a 1 (latencia y rate-limit muy menores).

**Sobre el chunking propio (no LangChain)**: implementación recursiva minimalista que recorre separadores en orden de prioridad: primero corta por párrafos (`\n\n`), si los párrafos siguen siendo demasiado largos cae a salto de línea, luego a frase, luego a palabra. Genera solapamiento entre chunks consecutivos copiando los últimos N caracteres del chunk anterior, lo que preserva contexto en los límites. No se trae LangChain porque solo se necesitaba esta función concreta y traer una dependencia pesada por un splitter no estaba justificado.

---

## Pipeline de chat RAG

```
POST /assistants/{aid}/conversations/{cid}/messages
        │
        ▼
┌────────────────────────────────────────────────────┐
│ 1. Carga el asistente (instrucciones)              │
│ 2. Carga últimos 10 mensajes (memoria)             │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 3. Embed de la pregunta                            │
│    Azure OpenAI: text-embedding-3-large            │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 4. Búsqueda híbrida en Azure AI Search             │
│    • search_text  → BM25                           │
│    • vector       → embedding de la pregunta       │
│    • query_type   → semantic (reranker)            │
│    • filter       → assistant_id eq '{aid}'        │
│    • top          → 5                              │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 5. Filtro por relevancia                           │
│    Descarta chunks con reranker_score < 1.5        │
│                                                    │
│    Si quedan 0 chunks:                             │
│    → respuesta hardcoded "no tengo información"   │
│    → no se llama al LLM                            │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 6. Construcción del prompt                         │
│    System: instrucciones del asistente             │
│          + reglas anti-alucinación                 │
│          + protocolo de citas y marcador <|NC|>    │
│    Historial: últimos N mensajes                   │
│    User:  pregunta + <context> con chunks          │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 7. Llamada al LLM                                  │
│    Azure OpenAI gpt-4o-mini, temperature=0.2       │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 8. Post-procesado                                  │
│    • Detecta <|NC|> → elimina y marca no contesta. │
│    • Parsea citas [N] del cuerpo                   │
│    • Renumera secuencialmente                      │
│    • Mapea cada [N] a su chunk de origen           │
└────────────────┬───────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────────┐
│ 9. Persistencia                                    │
│    • Inserta mensaje del usuario                   │
│    • Inserta respuesta del asistente               │
│    • Inserta MessageCitation solo de los chunks    │
│      efectivamente citados                         │
└────────────────────────────────────────────────────┘
```

### Dos variantes del pipeline

| Variante | Uso | Endpoint |
|---|---|---|
| Síncrona: `run_rag_pipeline` | Respuesta única JSON con respuesta + citas | `POST .../messages` |
| Streaming: `stream_rag_pipeline` | Server-Sent Events: tokens en tiempo real, citas al final | `POST .../messages/stream` |

El streaming emite tres tipos de evento: `event: token` por cada delta del LLM (UX "máquina de escribir"), un único `event: citations` al final con las citas resueltas, y `event: done` para cerrar la conexión. La lógica de retrieval, filtrado y construcción de prompt es idéntica entre ambas variantes; solo cambia cómo se entrega la respuesta.

---

## Decisiones de diseño

| Decisión | Alternativa descartada | Justificación |
|---|---|---|
| RAG clásico, no agéntico | Tool calling con knowledge bases de Foundry | Restricción del enunciado. Pipeline lineal y determinista, más fácil de razonar y depurar |
| Búsqueda híbrida + semantic reranker | Solo vectorial | El reranker mejora ~30-50% la precisión final según Microsoft. BM25 captura términos exactos (nombres propios, códigos) que la similitud semántica puede pasar por alto |
| Aislamiento por filtro `assistant_id` | Un índice por asistente | Un índice escala a miles de asistentes; uno-por-asistente choca con el límite de 15 índices del tier Basic |
| Foundry sin hub | Foundry hub-based | Despliegue más ligero, menos recursos auxiliares. Equivalente para consumir LLM y embeddings |
| Endpoint clásico de Azure OpenAI | Endpoint Foundry Agents | El segundo es ruta agéntica. El primero usa el SDK estándar `openai` y mantiene el sistema como RAG puro |
| Push model en AI Search | Integrated Vectorization | Control total del chunking y del flujo. Integrated Vectorization requiere Blob Storage como origen e introduce complejidad de skillsets |
| BackgroundTasks de FastAPI | Celery + Redis | "Rapido y sencillo": una dependencia menos. Suficiente para el caso de uso, donde la ingesta es ocasional |
| Citas estructuradas (no parseadas inline) | Confiar en formato del LLM | Las citas se devuelven en un campo JSON separado con metadata completa (`document_name`, `chunk_index`). Más fiable de renderizar en el frontend |
| MIME deducido por extensión en backend | Confiar en `Content-Type` del cliente | Defensa en profundidad: clientes mal configurados envían MIMEs incorrectos. El backend siempre lo deriva por extensión |
| Marcador `<|NC|>` para no-contesta | Detectar frases en lenguaje natural | Detección por marcador estructural es 100% determinista. Detectar "no tengo información" en texto libre es frágil |

---

## Backend (FastAPI)

### Modelo de datos

```
Assistant
  ├── Document            (1:N, ficheros subidos)
  └── Conversation        (1:N)
        └── Message       (1:N, role: user | assistant)
              └── MessageCitation  (1:N, chunks citados)
```

Cascade `ON DELETE` en Postgres: borrar un asistente arrastra todos sus documentos, conversaciones, mensajes y citas. La eliminación además limpia ficheros en Supabase Storage y chunks en Azure AI Search en el mismo endpoint.

### Organización de capas

```
backend/app/
├── routers/         # Endpoints HTTP
├── schemas/         # DTOs Pydantic (request/response)
├── models/          # ORM SQLAlchemy
├── services/        # Lógica de dominio
│   ├── azure_openai.py      # Cliente LLM + embeddings
│   ├── azure_search.py      # Cliente retrieval (centro del aislamiento)
│   ├── supabase_storage.py  # Cliente Storage
│   ├── extraction.py        # Extracción de texto por formato
│   ├── chunking.py          # Splitter recursivo
│   ├── ingestion.py         # Orquestador de ingesta
│   └── rag.py               # Orquestador de chat (sync + streaming)
├── database.py      # Engine SQLAlchemy + dependency `get_db`
├── config.py        # Pydantic Settings (validación de .env)
└── main.py          # Entry point + CORS + lifespan
```

Los **endpoints son finos**: validan, llaman al servicio correspondiente y devuelven. Toda la lógica de dominio (RAG, ingesta, retrieval) vive en `services/`, que es testeable y reutilizable. Esta separación permite que los routers se mantengan declarativos y la lógica compleja quede aislada y unit-testeable.

---

## Frontend (Next.js)

SPA en Next.js + TypeScript con Tailwind y shadcn/ui. Tres vistas:

1. **Gestión de asistentes**: listado, creación, edición, borrado
2. **Documentos por asistente**: subida con drag-and-drop, indicador de estado (`pending` → `indexed`), borrado
3. **Chat**: selección de conversación o creación nueva, mensajes con renderizado de citas como pills clicables, streaming token a token vía SSE

---

## Ejecución local

### Requisitos previos

- Python 3.12+
- Node 20+
- Recursos Azure aprovisionados: AI Foundry con `gpt-4o-mini` y `text-embedding-3-large`, AI Search Basic con semantic ranker activado
- Proyecto Supabase con bucket `assistant-documents`

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

cp .env.example .env             # rellenar con credenciales reales
python create_index.py           # crea el índice en Azure AI Search

uvicorn app.main:app --reload --port 8000
```

API disponible en `http://localhost:8000`, documentación interactiva en `/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local       # apuntar a http://localhost:8000
npm run dev
```

Disponible en `http://localhost:3000`.

### Variables de entorno principales

```env
# Supabase
DATABASE_URL=postgresql+psycopg://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
SUPABASE_BUCKET=assistant-documents

# Azure OpenAI (endpoint clásico, no el de Foundry Agents)
AZURE_OPENAI_ENDPOINT=https://xxx.openai.azure.com/
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_LLM_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://xxx.search.windows.net
AZURE_SEARCH_API_KEY=...
AZURE_SEARCH_INDEX_NAME=assistants-rag

# RAG tuning
CHUNK_SIZE=800
CHUNK_OVERLAP=150
RETRIEVAL_TOP_K=5
RERANKER_MIN_SCORE=1.5
```