# PadiWatch Technical Architecture

PadiWatch is an AI-powered agricultural intelligence platform designed to help paddy farmers monitor field health and optimize resource usage through satellite imagery and multi-agent AI reasoning.

## 1. System Overview

The system follows a modern decoupled architecture:
- **Frontend**: A responsive React/TypeScript application providing interactive mapping and real-time AI tracking.
- **Backend**: A FastAPI service that orchestrates remote sensing data from Google Earth Engine and AI reasoning via Vertex AI.
- **AI Core**: A multi-agent system powered by the Google Agent Development Kit (ADK) and Gemini 2.5 Flash.

---

## 2. Frontend Architecture

### Core Technologies
- **Framework**: React 18 with Vite.
- **Language**: TypeScript (Strict Mode).
- **Mapping**: Leaflet.js with `leaflet-draw` for field boundary definition.
- **Styling**: Tailwind CSS + Radix UI (shadcn/ui).
- **State Management**: React Context API (`AnalysisProvider`) with local storage persistence for session history.
- **i18n**: i18next supporting English (en), Malay (ms), Tamil (ta), and Chinese (zh).

### Key Components
- **Dashboard**: High-level summary of field indices (NDVI, LSWI, etc.).
- **Map View**: Interactive interface for drawing polygons and visualizing satellite tile overlays.
- **Optimize Engine**: A real-time SSE (Server-Sent Events) interface that streams the multi-agent system's thought process and tool usage to the user.
- **Services**: Modular API clients (`gee.ts`, `optimize.ts`, `farmImage.ts`) using the Fetch API.

---

## 3. Backend Architecture

### Core Technologies
- **Server**: FastAPI (Python 3.12+).
- **Remote Sensing**: Google Earth Engine (GEE) Python API.
- **AI Models**: Google Vertex AI (Gemini 2.5 Flash).
- **Agent Framework**: Google ADK (Agent Development Kit).
- **Infrastructure**: Designed for containerized deployment (Cloud Run).

### API Endpoints
- `POST /api/analyze`: Computes raw satellite indices (NDVI, NDRE, LSWI, GCI) for a given polygon.
- `POST /api/farm-image`: Generates an annotated bird's-eye view image of the farm with problem zones highlighted.
- `POST /api/recommend`: Provides specific index recommendations based on field conditions.
- `POST /api/optimize`: A streaming SSE endpoint that executes the multi-agent orchestration.
- `GET /api/geocode`: Proxy for Google Maps Geocoding API.

---

## 4. Multi-Agent AI System (The Optimizer)

The "Optimizer" uses a sequential multi-agent handoff pattern to process raw satellite data into actionable farming tasks.

### Agent Workflow
1.  **Visual Analyst**:
    - **Role**: Identifies problem zones from raw 4x4 grid data.
    - **Tools**: `fetch_field_indices`, `generate_annotated_image`.
    - **Thresholds**: NDVI < 0.4 (Vigor), LSWI < -0.1 (Water), GCI < 2.0 (Nutrients).
2.  **Diagnostic Agronomist**:
    - **Role**: Diagnoses the root cause (e.g., Drought, Nutrient Deficiency, Pest Stress).
    - **Input**: Identified zones from the Visual Analyst.
    - **Reasoning**: Uses cross-index correlation (e.g., Low NDVI + Low LSWI = Drought).
3.  **Action Planner**:
    - **Role**: Translates technical diagnoses into a simple "Action Checklist".
    - **Output**: Urgency-rated tasks (e.g., "Apply Urea top-dressing - Today").

---

## 5. Data Flow

1.  **Input**: User draws a field boundary (Polygon) on the Leaflet map.
2.  **Analysis**: Frontend sends GeoJSON to `/api/analyze`.
3.  **Remote Sensing**: GEE fetches the latest Sentinel-2/Landsat imagery, masks clouds, and computes mean indices.
4.  **Optimization**:
    - Frontend initiates `/api/optimize` via EventSource/Streaming Fetch.
    - Backend creates a GEE scene and registers it in a session-scoped registry.
    - Sequential agents execute tools, each streaming their "thought" and "result" back to the UI.
5.  **Output**: UI renders the final checklist, annotated farm image, and diagnostic report.

---

## 6. Project Structure

```text
├── backend/                # Python FastAPI Service
│   ├── agents/             # Multi-agent system (ADK)
│   ├── main.py             # API Routes & Entry Point
│   ├── gee.py              # Google Earth Engine logic
│   ├── vertex_analyze.py   # Vertex AI integration
│   └── vertex_image.py     # Annotated image generation
├── src/                    # React Frontend
│   ├── components/         # UI Components (Map, Dashboard, etc.)
│   ├── services/           # API Wrappers
│   ├── state/              # Context Providers
│   └── i18n/               # Localization files
└── dist/                   # Built frontend (served by backend in production)
```
