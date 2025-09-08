# main.py (portfolio)
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os, json
from typing import Optional, Dict, Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


HF_TOKEN = os.getenv("HF_TOKEN")  # set on Render as secret
MODEL_ID = os.getenv("MODEL_ID", "ahmed/llama-8b-jarvis")  # your HF model repo

if not HF_TOKEN:
    raise RuntimeError("HF_TOKEN env var missing")

app = FastAPI(title="Jarvis Inference Proxy")

# --- CORS (allow your portfolio domain) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-portfolio.onrender.com", "http://localhost:3000", "*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateReq(BaseModel):
    prompt: str
    params: Optional[Dict[str, Any]] = None  # e.g. {"max_new_tokens":256, "temperature":0.3}

def _hf_headers():
    return {"Authorization": f"Bearer {HF_TOKEN}"}

@app.get("/health")
async def health():
    return {"ok": True, "model": MODEL_ID}

@app.post("/generate")
async def generate(req: GenerateReq):
    # default params (tune as needed)
    parameters = {
        "max_new_tokens": 256,
        "do_sample": False,
        "temperature": 0.3,
        "top_p": 0.9,
        "return_full_text": False,
    }
    if req.params:
        parameters.update(req.params)

    payload = {"inputs": req.prompt, "parameters": parameters}

    url = f"https://api-inference.huggingface.co/models/{MODEL_ID}"
    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, headers=_hf_headers(), json=payload)
    # HF API returns different shapes depending on pipeline; normalize
    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=500, detail=f"Bad response from HF: {r.text[:200]}")

    if r.status_code == 503 and isinstance(data, dict) and "estimated_time" in data:
        # model cold start on HF — tell frontend to retry after a moment
        return {"status": "loading", "estimated_time": data["estimated_time"]}

    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=str(data)[:500])

    # common shapes:
    # 1) [{"generated_text": "..."}]
    # 2) {"generated_text": "..."} (rare)
    # 3) text-generation-stream tokens (not used here)
    if isinstance(data, list) and data and "generated_text" in data[0]:
        out = data[0]["generated_text"]
    elif isinstance(data, dict) and "generated_text" in data:
        out = data["generated_text"]
    else:
        # fallback: just dump JSON
        out = json.dumps(data)

    return {"output": out}



# import the model FastAPI app
app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/")
def home():
    return FileResponse(os.path.join(BASE_DIR, "templates", "index.html"))
