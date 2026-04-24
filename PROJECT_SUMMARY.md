# PadiWatch Project Summary

**PadiWatch** is an AI-powered agricultural intelligence platform specifically designed to help paddy farmers monitor field health, identify potential issues, and optimize resource usage through satellite imagery and advanced multi-agent AI reasoning.

## 1. High-Level Overview

The system allows users to define the boundaries of their paddy fields on an interactive map. It then leverages remote sensing data from **Google Earth Engine (GEE)** to analyze crop health across various indices (like NDVI for vegetation health, LSWI for water stress, etc.). 

To translate this technical data into actionable insights, PadiWatch employs a sophisticated multi-agent AI system (built on **Google Agent Development Kit** and **Vertex AI / Gemini 2.5 Flash**). This "Optimizer" analyzes the field, diagnoses issues, and provides a clear, urgency-rated action checklist for the farmer.

## 2. Tech Stack

### Frontend
*   **Framework**: React 18, built with Vite.
*   **Language**: TypeScript (Strict Mode).
*   **Mapping UI**: Leaflet.js with `leaflet-draw` for interactive polygon drawing.
*   **Styling**: Tailwind CSS combined with Radix UI (shadcn/ui).
*   **State Management**: React Context API with LocalStorage persistence.
*   **Localization (i18n)**: i18next supporting English (en), Malay (ms), Tamil (ta), and Chinese (zh).

### Backend
*   **Framework**: FastAPI (Python 3.12+).
*   **Remote Sensing Engine**: Google Earth Engine (GEE) Python API.
*   **AI Intelligence**: Google Vertex AI (Gemini 2.5 Flash).
*   **Agent Orchestration**: Google Agent Development Kit (ADK).
*   **Hosting Context**: Designed for containerization (Docker) and serverless deployment (e.g., Cloud Run).

## 3. Core Features & API Flow

1.  **Field Definition**: The user draws a polygonal field boundary on the Leaflet map. The frontend sends this GeoJSON geometry to the backend.
2.  **Raw Index Analysis (`/api/analyze`)**: The backend calls GEE to fetch the latest Sentinel/Landsat imagery. It calculates and returns critical agricultural indices:
    *   **NDVI / NDRE**: Plant vigor and chlorophyll content.
    *   **LSWI**: Moisture and water stress.
    *   **GCI**: Nitrogen/Nutrient levels.
3.  **Real-time AI Optimization (`/api/optimize`)**: A streaming Server-Sent Events (SSE) endpoint that orchestrates a multi-agent workflow. The user can watch the "thought process" in real-time as the agents analyze the field.
4.  **Index Recommendations (`/api/recommend`)**: AI-driven specific recommendations based on particular index anomalies.
5.  **Geocoding proxy (`/api/geocode`)**: Proxies requests to Google Maps API to search for locations seamlessly.

## 4. Multi-Agent AI System ("The Optimizer")

The core intelligence of PadiWatch is divided into specialized AI agents that pass context to one another sequentially:

1.  **Visual Analyst**: Looks at raw grid data from GEE. It identifies and flags "problem zones" where indices drop below healthy thresholds (e.g., low NDVI or low LSWI).
2.  **Diagnostic Agronomist**: Takes the flagged zones and deduces the root agricultural cause by correlating different indices (e.g., combining low water index and low vegetation index to diagnose drought).
3.  **Action Planner**: Translates the technical diagnosis into simple, actionable steps for the farmer, rating them by urgency (e.g., "Today", "This week", "Monitor").

## 5. Recent Architecture Changes

*   **Removal of Farm Image generation**: The project has been simplified to remove the `/api/farm-image` endpoint and the associated Vertex AI annotated image generation (`vertex_image.py`). The focus is entirely on textual analysis and index data.

## 6. Project Structure Overview

*   `backend/`: Contains the FastAPI application, GEE connection logic (`gee.py`), Vertex AI logic (`vertex_analyze.py`, `vertex_recommend.py`), and the ADK multi-agent definitions (`agents/`).
*   `src/`: Contains the React UI, context providers (`src/state/`), API integration services (`src/services/`), and localization mappings.
