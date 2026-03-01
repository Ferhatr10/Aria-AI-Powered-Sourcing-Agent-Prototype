# Aria — AI-Powered Sourcing Agent Prototype
<div align="center">

**End-to-end AI-driven platform for automotive RFQ analysis and supplier discovery**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_AI-white?logo=ollama)](https://ollama.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://docker.com/)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Core Algorithm — How It Works](#-core-algorithm--how-it-works)
- [Architecture Diagram](#-architecture-diagram)
- [Technology Map](#-technology-map)
- [Backend — Doclin](#-backend--doclin)
  - [Module Structure](#module-structure)
  - [API Endpoints](#api-endpoints)
  - [Two-Pass AI Pipeline](#two-pass-ai-pipeline)
  - [Database Schema](#database-schema)
  - [Hybrid Search Engine](#hybrid-search-engine)
  - [Data Ingestion](#data-ingestion)
  - [RunPod Serverless Handler](#runpod-serverless-handler)
- [Frontend — Aria](#-frontend--aria)
  - [Page Structure](#page-structure)
  - [Components](#components)
  - [API Proxy Layer](#api-proxy-layer)
  - [Frontend Technologies](#frontend-technologies)
- [Frontend ↔ Backend Connection](#-frontend--backend-connection)
- [Environment Variables](#-environment-variables)
- [Setup & Running](#-setup--running)
- [Docker Deployment](#-docker-deployment)

---

## 🌐 Overview

**Aria** is a fully AI-powered platform designed for supply chain managers in the automotive industry. It has two core functions:

1. **📄 RFQ Analysis** — Analyzes technical documents (PDF, Lastenheft) using AI to automatically extract part requirements, material specifications, certification needs, and manufacturing processes.

2. **🔍 Supplier Discovery** — Matches extracted requirements against suppliers in the database, ranking them by vector similarity, certification compliance, geographic proximity, and regulatory alignment.

---

## 🧪 Tech Stack

| Layer | Technology | Details |
|-------|------------|---------|
| **🤖 LLM** | Mistral-Small / Qwen-2.5 | Two-Pass RAG Architecture — Raw data extraction in first pass, manufacturing process synthesis in second pass |
| **🗄️ Database** | PostgreSQL + PostGIS + pgvector | Vector similarity (768D), geographic queries (ST_DWithin), and trigram deduplication in a single database |
| **📄 Parsing** | Docling | High-performance PDF Layout Analysis — Smart chunking that preserves tables, headings, and technical values |
| **🖥️ Frontend** | Next.js + Tailwind + Leaflet.js | SSR proxy layer, responsive UI, and interactive map view |

---

## 🧠 Core Algorithm — How It Works?

Aria solves the **"Document-to-Supplier"** automatic matching problem. The process consists of 4 main stages:

### 1. Intelligent Document Chunking
The uploaded PDF is parsed using the **Docling** library. Unlike traditional PDF readers, Docling preserves table structures, heading hierarchies, and technical values. The document is split into 1500-token chunks using `HybridChunker`, ensuring that even long Lastenheft documents maintain meaningful context in each chunk.

### 2. Two-Pass AI Extraction (Two-Pass RAG)
Unlike classical RAG architectures, Aria uses two separate LLM passes operating with **Map-Reduce** logic:

- **Pass 1 — Extractor (Map):** Each chunk is independently sent to a smaller LLM (Qwen-2.5 / Mistral-Small). The model runs at `temperature=0`, extracting material codes ("AlSi9Cu3"), certifications ("IATF 16949"), and surface treatments **character by character**. No guessing or translation is performed.

- **Pass 2 — Organizer (Reduce):** All chunk results are merged and fed to a larger LLM. This model **infers manufacturing processes** from raw material codes (e.g., ADC12 → "High-Pressure Die Casting"), classifies certifications, and generates a **semantic search persona** (2-3 sentence "ideal supplier" description) for the supplier search engine.

### 3. Hybrid Supplier Matching
The extracted profile is searched against suppliers in the database using the **HybridSearchEngine**. The engine combines 4 different signals in a single SQL query:

- **Vector Similarity** — Supplier descriptions are converted to 768-dimensional vectors using `nomic-embed-text`. Cosine similarity is computed via `pgvector`.
- **Certification/Regulatory Compliance** — Filters standard matches like ISO, IATF in strict or soft mode.
- **Geographic Proximity** — Distance to the reference city is calculated using PostGIS, with a proximity bonus applied.
- **Fuzzy Deduplication** — Duplicate suppliers with name similarity >75% are eliminated using `pg_trgm`.

### 4. Visualization & Decision Support
Results are presented to the user in two different views:
- **Table View** — Detailed sortable list by suitability score and distance
- **Map View** — Interactive map with Leaflet.js showing supplier locations and search radius circle

```
PDF → Docling → Chunks → Pass 1 (Extract) → Merge → Pass 2 (Organize)
                                                           │
                                                           ▼
                                              SupplierSearchProfile
                                                           │
                                                           ▼
                                            HybridSearchEngine.search()
                                             ┌─────────────────────────┐
                                             │ Vector + Cert + Geo +   │
                                             │ Dedup → Ranked Results  │
                                             └─────────┬───────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              ▼                 ▼
                                         📊 Table         🗺️ Map
```

---

## 🏗 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND — Aria (Next.js 16)                     │
│                                                                         │
│   /upload          /search              /ingest                         │
│   ┌──────────┐     ┌────────────────┐   ┌──────────────┐                │
│   │ PDF Upload│     │ Filtered Search│   │ Data Mgmt    │                │
│   │ AI Analyze│     │ Map View      │   │ CSV/JSON/DB  │                │
│   └─────┬────┘     └───────┬────────┘   └──────┬───────┘                │
│         │                  │                    │                        │
│   ┌─────┴──────────────────┴────────────────────┴────────┐              │
│   │              Next.js API Routes (Proxy Layer)         │              │
│   │  /api/extract-pdf  /api/discovery  /api/metadata      │              │
│   │  /api/ingest/file  /api/ingest/data  /api/ingest/reset│              │
│   └─────────────────────────┬────────────────────────────┘              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTP (JSON / FormData)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      BACKEND — Doclin (FastAPI)                          │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐     │
│   │                      api.py (FastAPI App)                      │     │
│   │  /extract-pdf  /discovery  /metadata  /ingest-file  /reset-db  │     │
│   └────────┬──────────────┬─────────────────────┬──────────────────┘     │
│            │              │                     │                        │
│     ┌──────▼──────┐ ┌─────▼──────┐      ┌──────▼──────┐                 │
│     │ extractor.py│ │ search.py  │      │  ingest.py  │                 │
│     │ Two-Pass AI │ │ Hybrid     │      │ CSV/JSON/   │                 │
│     │ Pipeline    │ │ Search     │      │ SQLite      │                 │
│     └──────┬──────┘ │ Engine     │      └──────┬──────┘                 │
│            │        └──────┬─────┘             │                        │
│     ┌──────▼──────┐        │            ┌──────▼──────┐                 │
│     │  prompt.py  │        │            │ database.py │                 │
│     │  schema.py  │        │            │ init_db()   │                 │
│     └──────┬──────┘        │            └──────┬──────┘                 │
│            │               │                   │                        │
│     ┌──────▼──────┐  ┌─────▼─────┐     ┌──────▼──────┐                 │
│     │   Ollama    │  │ Nominatim │     │ PostgreSQL  │                 │
│     │ qwen2.5:14b │  │ Geocoding │     │ + pgvector  │                 │
│     │ nomic-embed │  │ API       │     │ + PostGIS   │                 │
│     └─────────────┘  └───────────┘     │ + pg_trgm   │                 │
│                                        └─────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Technology Map

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Framework** | Next.js 16 (App Router) | SSR, routing, API proxy |
| **UI Library** | React 19, Radix UI, shadcn/ui | Component system |
| **Styling** | Tailwind CSS 4 | Responsive design |
| **Map** | Leaflet + react-leaflet | Supplier map view |
| **Backend Framework** | FastAPI + Uvicorn | REST API server |
| **AI Model (LLM)** | Ollama — qwen2.5:14b | Local AI inference |
| **Embedding Model** | nomic-embed-text (Ollama) | 768-dimensional vectors |
| **Document Processing** | Docling + LangChain | PDF parsing & chunking |
| **Database** | PostgreSQL | Relational data store |
| **Vector Search** | pgvector (IVFFlat) | Cosine similarity search |
| **Geospatial Search** | PostGIS | ST_DWithin, ST_Distance |
| **Text Similarity** | pg_trgm | Fuzzy deduplication |
| **Geocoding** | Nominatim (OSM) | City → coordinate conversion |
| **Serverless** | RunPod | GPU-based scaling |
| **Container** | Docker | Full environment isolation |

---

## 🐍 Backend — Doclin

### Module Structure

```
doclin/
├── api.py              # FastAPI application and endpoint definitions
├── extractor.py        # Two-Pass AI extraction pipeline
├── prompt.py           # LLM system/user prompts (Pass 1 & Pass 2)
├── schema.py           # Pydantic data models (Pass1Extraction, SupplierSearchProfile)
├── search.py           # HybridSearchEngine — hybrid search engine
├── database.py         # PostgreSQL connection and schema management
├── ingest.py           # Data ingestion (CSV, JSON, SQLite)
├── handler.py          # RunPod Serverless handler
├── start.sh            # Startup script (PostgreSQL + Ollama + FastAPI)
├── Dockerfile          # Container configuration
└── requirements.txt    # Python dependencies
```

---

### API Endpoints

#### 📄 Extraction

| Method | Endpoint | Description | Input | Output |
|--------|----------|-------------|-------|--------|
| `POST` | `/extract-pdf` | Upload and analyze a PDF file with AI | `multipart/form-data` (`file`) | `SupplierSearchProfile` JSON |
| `POST` | `/process` | Send a base64-encoded PDF (Serverless compatible) | `{"pdf_base64": "...", "filename": "rfq.pdf"}` | `SupplierSearchProfile` JSON |

**`/extract-pdf` Example Response:**
```json
{
  "success": true,
  "filename": "lastenheft.pdf",
  "elapsed_seconds": 45.2,
  "data": {
    "part_classification": {
      "category": "Powertrain",
      "name": "Engine Block Cover"
    },
    "search_parameters": {
      "must_have_processes": ["High-Pressure Die Casting", "CNC Machining"],
      "material_families": ["Aluminum Alloys"],
      "specific_materials": ["AlSi9Cu3 (Fe)"]
    },
    "compliance": {
      "required_certs": ["IATF 16949", "ISO 9001"],
      "environmental": ["ISO 14001", "RoHS", "REACH"]
    },
    "generated_search_persona": "Tier-1 automotive supplier with high-pressure aluminum die casting capability..."
  }
}
```

---

#### 🔍 Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/discovery` | Hybrid search — vector + filter + geospatial |
| `GET`  | `/metadata` | Filter options (countries, certifications, regulations) |

**`/discovery` Request Body:**
```json
{
  "query": "high pressure aluminum die casting IATF certified",
  "certifications": ["ISO 9001", "IATF 16949"],
  "regulatory": ["RoHS"],
  "countries": ["Germany", "Turkey"],
  "near_city": "Stuttgart",
  "radius_km": 500,
  "strict_mode": true,
  "top_k": 10
}
```

**`/discovery` Response Structure:**
```json
{
  "success": true,
  "results": {
    "results": [
      {
        "supplier_id": "SUP-1001",
        "name": "Precision Casting GmbH",
        "certifications": ["IATF 16949", "ISO 9001"],
        "regulatory_compliance": ["RoHS", "REACH"],
        "materials": ["Aluminum", "Zinc"],
        "rating": 4.5,
        "country": "Germany",
        "city": "Stuttgart",
        "lat": 48.7758,
        "lng": 9.1829,
        "distance_km": 12.4,
        "scores": {
          "vector_similarity": 0.8721,
          "proximity_bonus": 0.2856,
          "match_bonus": 0.0,
          "total_suitability": 1.1577
        }
      }
    ],
    "center_coords": [48.7758, 9.1829]
  }
}
```

---

#### 📥 Ingestion

| Method | Endpoint | Description | Input |
|--------|----------|-------------|-------|
| `POST` | `/ingest-file` | Ingest data from file upload | `multipart/form-data` — `.csv`, `.json`, `.db` |
| `POST` | `/ingest-data` | Send JSON data directly | `[{...}, {...}]` JSON array |
| `POST` | `/ingest` *(deprecated)* | Trigger via local file path | `csv_path` query param |

---

#### 🔧 Maintenance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/reset-db` | Delete all supplier data (`TRUNCATE`) |
| `GET`  | `/health` | Health check |
| `GET`  | `/` | API status message |

---

### Two-Pass AI Pipeline

At the core of Aria lies a **Two-Pass Agentic RAG** architecture:

```
                    PDF Document
                        │
                        ▼
            ┌───────────────────────┐
            │   Docling Converter   │
            │   (No-OCR, fast)      │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │    HybridChunker      │
            │  max_tokens: 1500     │
            │  tokenizer: MiniLM    │
            └───────────┬───────────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
        ┌──────────┐ ┌──────┐ ┌──────┐
        │ Chunk 1  │ │ ...  │ │ N    │     ← max 100 chunks
        └────┬─────┘ └──┬───┘ └──┬───┘
             │          │        │
             ▼          ▼        ▼
    ┌─────────────────────────────────────┐
    │  PASS 1 — THE EXTRACTOR (Map)       │
    │  Model: qwen2.5:14b                 │
    │  Temp: 0 (deterministic)            │
    │  Output: Pass1Extraction schema     │
    │                                     │
    │  Extracted from each chunk:         │
    │  • component_name                   │
    │  • material_specifications          │
    │  • certifications_mentioned         │
    │  • weight_and_dimensions            │
    │  • surface_treatments               │
    └─────────────┬───────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │         MERGE (Combine)             │
    │  • Singular fields → last non-null  │
    │  • List fields → union +            │
    │    deduplicate (set)                │
    └─────────────┬───────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │  PASS 2 — THE ORGANIZER (Reduce)    │
    │  Model: qwen2.5:14b                 │
    │  Temp: 0.1 (minimal creativity)     │
    │  Output: SupplierSearchProfile      │
    │                                     │
    │  Synthesized outputs:              │
    │  • part_classification              │
    │  • search_parameters               │
    │    ├─ must_have_processes           │
    │    ├─ material_families            │
    │    └─ specific_materials           │
    │  • compliance                      │
    │    ├─ required_certs               │
    │    └─ environmental                │
    │  • generated_search_persona        │
    └─────────────────────────────────────┘
```

#### Pass 1 — The Extractor
- **Task**: Extracts raw technical data (materials, certifications, surface treatments) from each chunk **as-is**.
- **Rules**: No translation, no guessing — preserve units and tolerances exactly.
- **Multilingual**: Recognizes German technical terms (Werkstoff, Oberflächenbehandlung, etc.).

#### Pass 2 — The Organizer
- **Task**: Analyzes raw data to **infer manufacturing processes** (e.g., ADC12 → "High-Pressure Die Casting").
- **Search Persona**: Generates a 2-3 sentence ideal supplier profile for the vector search engine.

---

### Database Schema

PostgreSQL database `rfq_db` with the `suppliers` table:

```sql
CREATE TABLE suppliers (
    id              SERIAL PRIMARY KEY,
    supplier_id     TEXT,                        -- SUP-1000 format
    name            TEXT NOT NULL,
    certifications  TEXT[],                      -- {"ISO 9001", "IATF 16949"}
    regulatory      TEXT[],                      -- {"RoHS", "REACH"}
    materials       TEXT[],                      -- {"Aluminum", "Steel"}
    sop_date        DATE,
    description     TEXT,                        -- Used for embedding generation
    embedding       vector(768),                 -- nomic-embed-text vector
    rating          DOUBLE PRECISION,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    city            TEXT,
    country         TEXT,
    location        GEOGRAPHY(POINT, 4326)       -- PostGIS geographic point
);
```

#### PostgreSQL Extensions

| Extension | Purpose |
|-----------|---------|
| `pgvector` | 768-dimensional vector storage and cosine similarity search |
| `pg_trgm` | Trigram-based text similarity (`similarity()` function) |
| `PostGIS` | Geospatial queries (`ST_DWithin`, `ST_Distance`, `ST_MakePoint`) |

#### Database Indexes

| Index | Type | Description |
|-------|------|-------------|
| `idx_suppliers_vector` | IVFFlat (lists=100) | Vector cosine similarity search |
| `idx_suppliers_name_trgm` | GIN | Fuzzy name search/deduplication |
| `idx_suppliers_location` | GiST | Geospatial location search |

#### Automatic Trigger

When `lat/lng` is updated, the `location` (GEOGRAPHY) column is automatically updated:

```sql
CREATE TRIGGER trg_update_supplier_location
BEFORE INSERT OR UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_supplier_location();
```

---

### Hybrid Search Engine

The `HybridSearchEngine` in `search.py` uses a 5-layer hybrid scoring system:

```
┌─────────────────────────────────────────────────────┐
│               HybridSearchEngine.search()           │
│                                                     │
│  1. Query Vectorization                             │
│     └─ OllamaEmbeddings("nomic-embed-text")         │
│                                                     │
│  2. City Geocoding (optional)                       │
│     └─ Nominatim API → (lat, lng)                   │
│                                                     │
│  3. SQL Pipeline (CTEs):                            │
│     ┌─────────────────────────────────────────────┐ │
│     │ filtered_suppliers                          │ │
│     │   • Compute vector similarity               │ │
│     │   • Strict/Soft certification filter         │ │
│     │   • Country filter                          │ │
│     │   • Radius filter (ST_DWithin)              │ │
│     ├─────────────────────────────────────────────┤ │
│     │ scored_suppliers                            │ │
│     │   • proximity_bonus (distance-based, 30%)   │ │
│     │   • match_bonus (cert/reg match, 20%+20%)  │ │
│     ├─────────────────────────────────────────────┤ │
│     │ final_scored                                │ │
│     │   • total_suitability = vector + proximity  │ │
│     │     + match_bonus                           │ │
│     │   • distance_km calculation                 │ │
│     ├─────────────────────────────────────────────┤ │
│     │ deduplicated                                │ │
│     │   • similarity(name) > 0.75 → keep highest  │ │
│     │     score, discard others                    │ │
│     └─────────────────────────────────────────────┘ │
│                                                     │
│  4. Format & Return Results                         │
│     └─ JSON: {results, center_coords}               │
└─────────────────────────────────────────────────────┘
```

#### Scoring Details

| Component | Weight | Description |
|-----------|--------|-------------|
| `vector_similarity` | Base score | `1 - (embedding <=> query_vector)` cosine distance |
| `proximity_bonus` | ×0.30 | `GREATEST(0, 1 - distance/radius)` — distance-to-center ratio |
| `match_bonus` | ×0.20 + ×0.20 | Matched certification and regulation count (active in soft mode) |

#### Strict Mode vs Soft Mode
- **`strict_mode=true`**: Suppliers not meeting certification and regulation criteria are completely excluded.
- **`strict_mode=false`**: All suppliers are included, scored with match_bonus.

---

### Data Ingestion

`ingest.py` loads supplier data from 3 formats:

| Format | Function | Description |
|--------|----------|-------------|
| CSV | `ingest_csv(path)` | Reads row by row with `DictReader` |
| JSON | `ingest_json(path)` | Accepts single object or array |
| SQLite | `ingest_sqlite(path)` | Reads from `suppliers` table |

#### Vector Generation Process
```
For each record:
  1. capabilities + materials → build "Capabilities: X. Materials: Y." string
  2. Generate 768-dimensional vector with OllamaEmbeddings("nomic-embed-text")
  3. INSERT into PostgreSQL suppliers table
```

#### Expected Data Schema
```json
{
  "supplier_id": "SUP-1001",
  "company_name": "Precision Casting GmbH",
  "capabilities": ["CNC Machining", "Die Casting"],
  "materials": ["Aluminum", "Zinc"],
  "certifications": ["ISO 9001", "IATF 16949"],
  "regulatory_compliance": ["RoHS", "REACH"],
  "rating": 4.5,
  "lat": 48.7758,
  "lng": 9.1829,
  "city": "Stuttgart",
  "country": "Germany",
  "sop_date": "2025-06-01"
}
```

---

### RunPod Serverless Handler

`handler.py` runs as a GPU-based serverless function on the RunPod platform:

```python
# RunPod job input structure:
{
  "input": {
    "pdf_base64": "<base64 encoded PDF>",
    "filename": "rfq.pdf"        # optional
  }
}
```

- When `RUNPOD_SERVERLESS=true`, `start.sh` launches handler mode.
- Otherwise, FastAPI (Standalone Pod) mode is activated.

---

## ⚛ Frontend — Aria

### Page Structure

```
app/
├── page.tsx                    # "/" → redirects to /upload
├── layout.tsx                  # Root layout (Inter font, metadata, analytics)
├── globals.css                 # Global styles
│
├── upload/
│   └── page.tsx                # 📄 RFQ Analysis page
│
├── search/
│   └── page.tsx                # 🔍 Supplier Discovery page (706 lines)
│
├── ingest/
│   └── page.tsx                # 📥 Data Management page
│
└── api/                        # Next.js API proxy routes
    ├── extract-pdf/route.ts    # → backend /extract-pdf
    ├── discovery/route.ts      # → backend /discovery
    ├── metadata/route.ts       # → backend /metadata
    └── ingest/
        ├── file/route.ts       # → backend /ingest-file
        ├── data/route.ts       # → backend /ingest-data
        └── reset/route.ts      # → backend /reset-db
```

---

### Page Details

#### 📄 Upload Page (`/upload`)

| Feature | Description |
|---------|-------------|
| PDF/DOCX/TXT upload | Drag & drop and file selection |
| AI analysis | Sends request to backend via `/api/extract-pdf` |
| Requirement cards | Extracted data shown as editable cards |
| Manual addition | Users can add new requirement fields |
| localStorage | Requirements are transferred to `/search` page |

**User Flow:**
```
Upload File → AI Analysis (loading) → Requirement Cards → "Find Suppliers" → /search
```

---

#### 🔍 Search Page (`/search`)

| Feature | Description |
|---------|-------------|
| Filter panel | Country, certification, regulation selection (multi-select combobox) |
| Geospatial filter | City + radius slider (0-5000 km) |
| Location detection | Browser geolocation + Nominatim reverse geocoding |
| Strict/Soft mode | Toggle switch for strict/soft filtering |
| Results table | Sortable (by distance, suitability) |
| Map view | Leaflet map + circle markers + radius circle |
| Backend status | Live connection indicator (online/offline) |

---

#### 📥 Ingest Page (`/ingest`)

| Feature | Description |
|---------|-------------|
| File tab | CSV, JSON, SQLite file upload (drag & drop) |
| Raw JSON tab | Direct JSON paste area |
| DB Reset | Database reset button (with confirmation) |

---

### Components

```
components/
├── navbar.tsx              # Navigation bar (Upload, Discovery, Ingest)
├── file-uploader.tsx       # Drag & drop PDF upload + AI analysis trigger
├── file-upload.tsx         # Alternative file upload component
├── requirement-card.tsx    # Editable requirement card (confidence bar)
├── filter-sidebar.tsx      # Search filter sidebar component
├── supplier-table.tsx      # Supplier results table
├── map-component.tsx       # Leaflet map (supplier markers + radius)
├── map-placeholder.tsx     # Map loading placeholder
├── analysis-loading.tsx    # AI analysis loading animation
├── theme-provider.tsx      # next-themes theme provider
└── ui/                     # shadcn/ui components (57 files)
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── badge.tsx
    ├── slider.tsx
    ├── switch.tsx
    ├── progress.tsx
    ├── dialog.tsx
    ├── select.tsx
    ├── toast.tsx
    └── ... (47 more)
```

---

### API Proxy Layer

The frontend **does not connect directly** to the backend. Next.js API Routes act as a **proxy layer**:

```
[Browser] → /api/discovery → [Next.js Server] → https://backend:8080/discovery → [FastAPI]
```

**Why Proxy?**
- Eliminates CORS issues
- Backend URL stays hidden from client-side
- No frontend redeployment needed when API_BASE_URL changes
- Request/response transformation possible

**`lib/api-config.ts`:**
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://xxx-8080.proxy.runpod.net";
```

---

### Frontend Technologies

| Package | Version | Usage |
|---------|---------|-------|
| `next` | 16.1.6 | Framework (App Router, Server Components) |
| `react` | 19.2.4 | UI rendering engine |
| `tailwindcss` | 4.2.0 | Utility-first CSS framework |
| `@radix-ui/*` | Various | Accessible headless UI primitives |
| `lucide-react` | 0.564 | SVG icon library |
| `leaflet` + `react-leaflet` | 1.9 / 5.0 | Interactive map |
| `recharts` | 2.15 | Chart components |
| `zod` | 3.24 | Schema validation |
| `react-hook-form` | 7.54 | Form management |
| `sonner` | 1.7 | Toast notifications |
| `next-themes` | 0.4.6 | Dark/Light theme support |
| `date-fns` | 4.1 | Date formatting |
| `class-variance-authority` | 0.7.1 | Component variant management |
| `tailwind-merge` | 3.3.1 | Tailwind class conflict resolution |
| `@vercel/analytics` | 1.6.1 | User analytics |

---

## 🔗 Frontend ↔ Backend Connection

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             USER FLOW                                    │
│                                                                          │
│  1. /upload: User uploads a PDF                                          │
│     └─→ FileUploader → fetch("/api/extract-pdf") → Backend /extract-pdf  │
│         └─→ Docling + Two-Pass AI → SupplierSearchProfile                │
│             └─→ Frontend converts to RequirementCards                    │
│                 └─→ Saves to localStorage → redirects to /search         │
│                                                                          │
│  2. /search: User selects filters and clicks "Apply Filters"             │
│     └─→ Reads requirements from localStorage (builds query)              │
│         └─→ fetch("/api/discovery") → Backend /discovery                 │
│             └─→ HybridSearchEngine.search()                              │
│                 ├─ Query vectorization (nomic-embed-text)                │
│                 ├─ City geocoding (Nominatim)                            │
│                 ├─ PostgreSQL hybrid SQL query                           │
│                 └─→ Results → Table + Map view                           │
│                                                                          │
│  3. /search: Metadata (filter options)                                   │
│     └─→ useEffect → fetch("/api/metadata") → Backend /metadata           │
│         └─→ PostgreSQL DISTINCT queries → countries, certifications      │
│                                                                          │
│  4. /ingest: Admin uploads data                                          │
│     ├─→ File: fetch("/api/ingest/file") → Backend /ingest-file           │
│     ├─→ JSON: fetch("/api/ingest/data") → Backend /ingest-data           │
│     └─→ Reset: fetch("/api/ingest/reset") → Backend /reset-db            │
│         └─→ Generate embedding per record → PostgreSQL INSERT            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Endpoint Mapping Table

| Frontend Route | Next.js API Proxy | Backend Endpoint | Method |
|----------------|-------------------|------------------|--------|
| `/upload` (FileUploader) | `/api/extract-pdf` | `POST /extract-pdf` | FormData |
| `/search` (on page load) | `/api/metadata` | `GET /metadata` | — |
| `/search` (apply filters) | `/api/discovery` | `POST /discovery` | JSON |
| `/ingest` (file upload) | `/api/ingest/file` | `POST /ingest-file` | FormData |
| `/ingest` (send JSON) | `/api/ingest/data` | `POST /ingest-data` | JSON |
| `/ingest` (DB reset) | `/api/ingest/reset` | `POST /reset-db` | — |

---

## 🔐 Environment Variables

### Backend (Doclin)

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server address |
| `OLLAMA_MODEL` | `qwen2.5:32b` | LLM model to use |
| `DB_HOST` | `localhost` | PostgreSQL host address |
| `PGPASSWORD` | `postgres` | PostgreSQL password |
| `PORT` | `8080` | FastAPI server port |
| `RUNPOD_SERVERLESS` | — | If `true`, starts RunPod handler mode |

### Frontend (Aria)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | RunPod proxy URL | Backend API address |

---

## 🚀 Setup & Running

### Backend (Doclin)

```bash
# 1. Install PostgreSQL + Extensions
sudo apt install postgresql postgresql-contrib
# pgvector, pg_trgm, postgis extensions required

# 2. Set up Python environment
cd doclin
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Download Ollama models
ollama pull qwen2.5:14b
ollama pull nomic-embed-text

# 4. Create the database
createdb rfq_db
python database.py

# 5. Start the server
uvicorn api:app --host 0.0.0.0 --port 8080
```

### Frontend (Aria)

```bash
# 1. Install dependencies
cd aria
pnpm install

# 2. Set environment variables
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# 3. Start development server
pnpm dev
```

**Application:** Accessible at `http://localhost:3000`.

---

## 🐳 Docker Deployment

### Dockerfile (Backend)

```bash
# Build
docker build -t doclin-backend .

# Run
docker run -d \
  -p 8080:8080 \
  -e OLLAMA_MODEL=qwen2.5:14b \
  -e PGPASSWORD=postgres \
  --gpus all \
  doclin-backend
```

The Docker image includes:
- Python 3.11 + all dependencies
- PostgreSQL + pgvector (source build)
- Ollama + model preloading
- Docling model files
- Automatic startup via `start.sh` (PostgreSQL → Ollama → FastAPI)

---

<div align="center">

**Built with ❤️ for Automotive Supply Chain Intelligence**

*Aria © 2026 — AI-Powered Procurement Assistant*

</div>
