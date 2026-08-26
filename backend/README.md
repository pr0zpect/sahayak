# MediKiosk backend

Pure Django + Django REST Framework JSON backend for a pre-consultation OPD intake kiosk. It has no frontend, templates, or static application assets.

## Setup

1. Use Python 3.10+ and create/activate a virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env`, then set `HF_API_KEY` and a secure `DJANGO_SECRET_KEY`. Get a free token from huggingface.co: **Settings → Access Tokens**, then enable “Make calls to Inference Providers”.
4. Install the system `tesseract-ocr` binary. `pytesseract` requires it to be on `PATH`.
5. Run `python manage.py migrate`.
6. Optionally create a doctor with `python manage.py createsuperuser`.
7. Add immediately usable example data with `python manage.py seed_demo_data`.
8. Start the API: `python manage.py runserver`.

The development configuration permits all CORS origins so a separately hosted React client can call the API. Restrict `CORS_ALLOW_ALL_ORIGINS` before production.

## Safety and architecture

All Anthropic SDK activity lives in `core/services/llm.py`; all Tesseract activity lives in `core/services/ocr.py`. Views call service functions only, which makes external calls straightforward to mock. Every Claude call includes an explicit instruction never to diagnose, recommend treatment, or invent facts. The red-flag keyword checks run before the optional LLM check, so obvious emergency text remains protected if the model/API is unavailable.

## Tests

Run `python manage.py test`. Tests mock service functions; no Anthropic API key or Tesseract installation is needed for them.

## API

Patient-facing endpoints are unauthenticated. `GET`/`PATCH` summary detail requires `Authorization: Token <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/interview/start/` | Create a session and opening question |
| POST | `/api/interview/respond/` | Save answer, red-flag check, and next question |
| POST | `/api/documents/upload/` | OCR a multipart prescription image |
| POST | `/api/summary/generate/` | Generate source-linked structured summary |
| GET/PATCH | `/api/summary/<session_id>/` | Doctor review/edit a summary |
| POST | `/api/redflag/check/` | Manually exercise hybrid red-flag checking |
| POST | `/api/mock-abdm/push/` | Return fake successful FHIR-shaped ABDM export |
| POST | `/api/auth/login/` | Obtain doctor token |

Start an interview:

```json
POST /api/interview/start/
{"patient_name":"Asha Sharma","language":"en","abha_id":null}

{"session_id":1,"question":"What brings you in today?","chips":["chest pain","fever"]}
```

Respond:

```json
POST /api/interview/respond/
{"session_id":1,"answer":"I have had a fever for two days","input_mode":"touch"}

{"question":"What temperature did you measure?","chips":["Below 100°F","100–102°F","Above 102°F"],"done":false,"red_flag":false,"red_flag_reason":null}
```

Generate a summary with `{"session_id":1}`. Its response has seven sections (`chief_complaint`, `hpi`, `pmh`, `drug_allergy`, `family_history`, `personal_history`, and `ros`); each contains `text` and `source_turns`, with optional `source_documents`. This links every stated fact to transcript/document evidence.

For an upload, send multipart `session_id=1` and `image=@prescription.png`. The response is `{"document_id":1,"extracted_text":"...","fields":{"diagnosis":null,"medicines":[],"date":null},"confidence":0.0}`.

Login with `{"username":"doctor","password":"..."}` then PATCH a generated summary using `{"structured_json":{...},"doctor_notes":"Reviewed"}`. Mock ABDM push accepts `{"session_id":1}` and returns `{"status":"pushed","abha_id":"MOCK-...","fhir_bundle":{"resourceType":"Bundle",...}}`.
