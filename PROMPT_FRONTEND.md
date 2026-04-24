# Frontend Next.js — Asistentes RAG

## Contexto

Aplicacion full-stack con IA generativa. El backend es una API REST en FastAPI
corriendo en `http://localhost:8000`. Lee `DESIGN.md` antes de escribir
cualquier estilo o componente.

## Stack

- Next.js 14 con App Router (`app/`)
- TypeScript
- Tailwind CSS + shadcn/ui
- Responsive (escritorio y movil)

## Inicializacion

```bash
npx create-next-app@latest frontend --typescript --tailwind --app --eslint
cd frontend
npx shadcn@latest init
```

Instala las dependencias necesarias segun vayas creando componentes.

## Estructura de rutas

```
app/
  page.tsx                          # Pagina de inicio
  assistants/
    [assistantId]/
      page.tsx                      # Vista del asistente (chat + documentos)
```

## Variables de entorno

Crea `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Crea `frontend/lib/api.ts` con todas las llamadas a la API agrupadas por
recurso (assistants, documents, conversations, messages). Usa esta base:

```ts
const API = process.env.NEXT_PUBLIC_API_URL;
```

## Pagina de inicio — `app/page.tsx`

- Muestra la lista de asistentes existentes (GET /assistants).
- Cada asistente es una tarjeta con nombre, descripcion y boton para abrir
  su vista (navega a `/assistants/[id]`).
- Boton prominente para crear un asistente nuevo. Al pulsarlo abre un dialogo
  (shadcn Dialog) con un formulario: nombre (obligatorio), descripcion e
  instrucciones. Al guardar llama a POST /assistants y recarga la lista.
- Si no hay asistentes, muestra un estado vacio con llamada a la accion de crear.
- Sin barra lateral.

## Vista del asistente — `app/assistants/[assistantId]/page.tsx`

Layout de tres columnas en escritorio, colapsable en movil:

### Columna izquierda — Barra lateral de asistentes

- Lista de todos los asistentes (GET /assistants).
- El asistente activo aparece resaltado.
- Boton para crear asistente nuevo (mismo dialogo que en la pagina de inicio).
- Al seleccionar un asistente navega a su ruta.
- En movil: oculta por defecto, se abre con un boton hamburguesa.

### Columna central — Chat

- Historial de mensajes de la conversacion activa.
- Los mensajes del asistente muestran las citas debajo del texto si las hay
  (document_name + content_snippet).
- Input fijo en la parte inferior con boton de envio.
- El envio llama a `POST /conversations/{id}/messages/stream` y consume
  el stream SSE: acumula tokens en pantalla en tiempo real, y cuando llega
  el evento `citations` los renderiza debajo de la respuesta.
- Mientras el asistente responde, muestra un indicador de escritura y
  deshabilita el input.
- Si no hay conversacion activa, la crea automaticamente al enviar el primer
  mensaje (POST /assistants/{id}/conversations).

### Columna derecha — Documentos

- Lista de documentos del asistente (GET /assistants/{id}/documents).
- Cada documento muestra nombre, estado (pending / indexed / failed) y boton
  de borrado.
- Los documentos en estado `pending` muestran un spinner y se refresca la
  lista cada 3 segundos hasta que pasen a `indexed` o `failed`.
- Zona de drop (drag & drop) y boton para subir ficheros. Llama a
  POST /assistants/{id}/documents. Formatos aceptados: pdf, docx, pptx,
  txt, md. Tamaño maximo: 25 MB.
- En movil: se muestra debajo del chat, la barra lateral desaparece.

## Protocolo SSE

El stream de `POST /conversations/{id}/messages/stream` emite:

```
event: token
data: " texto parcial"

event: citations
data: [{"document_name":"...","chunk_index":0,"content_snippet":"..."}]

event: done
data: {}
```

Los saltos de linea en tokens vienen escapados como `\n`. El cliente debe
reemplazarlos al acumular.

## Tipos TypeScript

Define en `lib/types.ts`:

```ts
export interface Assistant {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  assistant_id: string;
  filename: string;
  status: "pending" | "indexed" | "failed";
  chunk_count?: number;
  uploaded_at: string;
}

export interface Conversation {
  id: string;
  assistant_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  document_id: string;
  document_name: string;
  chunk_index: number;
  content_snippet: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations: Citation[];
}
```

## Restricciones

- Todos los componentes que usen hooks deben ser Client Components (`"use client"`).
- No uses `any` en TypeScript.
- No uses `useEffect` para fetching inicial en Client Components: usa fetch en
  Server Components donde sea posible.
- El estado del stream (tokens acumulados, citas, loading) vive en el
  componente de chat, no en un store global.
- No instales librerias de gestion de estado (Redux, Zustand, Jotai). Usa
  React state y props.