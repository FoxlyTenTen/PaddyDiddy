# PadiWatch Backend — Google Earth Engine service

FastAPI service that accepts a user-drawn GeoJSON polygon, composites a
recent Sentinel-2 Surface Reflectance image, and returns Leaflet-compatible
tile URLs plus mean statistics for four vegetation indices:

| Key  | Expression              | What it tells the farmer       |
| ---- | ----------------------- | ------------------------------ |
| NDVI | `(B8 - B4) / (B8 + B4)` | Overall crop greenness         |
| NDRE | `(B8 - B5) / (B8 + B5)` | Early stress indicator         |
| NDWI | `(B3 - B8) / (B3 + B8)` | Surface moisture (McFeeters)   |
| GCI  | `(B8 / B3) - 1`         | Chlorophyll / nitrogen proxy   |

## 1. Prereqs

* Python 3.10+
* A Google Earth Engine Cloud project. Sign up at
  <https://code.earthengine.google.com/register>.
* The `earthengine` CLI (installed automatically by `earthengine-api`).

## 2. Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

## 3. Authenticate once

```bash
earthengine authenticate
```

This opens a browser, you approve access, and a credential file is cached
in `~/.config/earthengine/`. You only do this once per machine.

## 4. Configure your project ID

```bash
copy .env.example .env            # Windows
# cp .env.example .env            # macOS / Linux
```

Edit `.env` and set:

```
GEE_PROJECT_ID=your-real-ee-project-id
```

## 5. Run

```bash
uvicorn main:app --reload --port 8000
```

Endpoints:

* `GET  /api/health` — sanity check.
* `POST /api/analyze` — body:
  ```json
  {
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[101.123, 3.45], [...], [101.123, 3.45]]]
    },
    "start_date": "2026-03-01",
    "end_date": "2026-04-18"
  }
  ```

Returns tile URLs that the frontend can render directly on the map.

## Optional — service account auth

For deployed environments, create a service account in GCP, grant it
Earth Engine access, download the JSON key, then set:

```
GEE_SERVICE_ACCOUNT=my-sa@project.iam.gserviceaccount.com
GEE_KEY_FILE=C:/absolute/path/to/key.json
```

The backend will prefer service account creds when both are set.
