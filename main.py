import logging
import os
import time
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import requests
from requests.exceptions import ReadTimeout, RequestException

# --- App setup ---
app = FastAPI(title="Jarvis Chat Proxy")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for dev; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jarvis")

# --- Config (set these in environment) ---
HF_TOKEN = os.getenv("HF_TOKEN")  # Hugging Face token (optional if using Colab)
PRIMARY_REPO = os.getenv("HF_REPO", "uracoder/my-chatbot-merged")
FALLBACK_REPO = os.getenv("HF_FALLBACK", "gpt2")
PRIMARY_TIMEOUT = int(os.getenv("HF_PRIMARY_TIMEOUT", "180"))
FALLBACK_TIMEOUT = int(os.getenv("HF_FALLBACK_TIMEOUT", "60"))
PRIMARY_RETRIES = int(os.getenv("HF_PRIMARY_RETRIES", "2"))

# Colab proxy config (for Colab/ngrok)
COLAB_URL = os.getenv("COLAB_URL")        # e.g. https://xxxx.ngrok.io
COLAB_API_KEY = os.getenv("COLAB_API_KEY")  # shared secret (must match Colab)

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

# --- Request schema ---
class Req(BaseModel):
    prompt: str

# --- Helper to call HF inference ---
def hf_post(repo: str, payload: Dict[str, Any], timeout: int) -> requests.Response:
    url = f"https://api-inference.huggingface.co/models/{repo}"
    logger.info("Calling HF repo=%s timeout=%ds", repo, timeout)
    resp = requests.post(url, headers=HEADERS, json=payload, timeout=timeout)
    logger.info("HF response: repo=%s status=%s", repo, resp.status_code)
    return resp

def normalize_output(resp_json: Any) -> str:
    if isinstance(resp_json, list) and len(resp_json) and isinstance(resp_json[0], dict):
        return resp_json[0].get("generated_text", str(resp_json))
    if isinstance(resp_json, dict) and "generated_text" in resp_json:
        return resp_json["generated_text"]
    return str(resp_json)

# --- /generate endpoint: tries HF primary then fallback ---
@app.post("/generate")
def generate(payload: Req):
    if not HF_TOKEN:
        logger.warning("HF_TOKEN not set. Primary may fail for private models.")
    data = {"inputs": payload.prompt, "options": {"wait_for_model": True}}

    last_exception = None
    for attempt in range(1, PRIMARY_RETRIES + 1):
        try:
            resp = hf_post(PRIMARY_REPO, data, timeout=PRIMARY_TIMEOUT)
            if resp.status_code in (401, 403, 404):
                logger.warning("Primary returned auth/slug error: %s", resp.status_code)
                break
            if resp.status_code == 200:
                try:
                    out = normalize_output(resp.json())
                except Exception:
                    out = str(resp.text)
                return {"result": out, "model": PRIMARY_REPO}
            logger.warning("Primary attempt %d returned status %s", attempt, resp.status_code)
        except ReadTimeout as e:
            last_exception = e
            logger.warning("Primary attempt %d timed out (timeout=%ds)", attempt, PRIMARY_TIMEOUT)
        except RequestException as e:
            last_exception = e
            logger.exception("Primary attempt %d network error", attempt)
        time.sleep(1 * (2 ** (attempt - 1)))

    # fallback
    try:
        resp_fb = hf_post(FALLBACK_REPO, data, timeout=FALLBACK_TIMEOUT)
        resp_fb.raise_for_status()
        out_fb = normalize_output(resp_fb.json())
        return {"result": out_fb, "model": FALLBACK_REPO, "note": "Served by fallback model"}
    except Exception as e:
        logger.exception("Fallback call failed")
        detail_msg = "Both primary and fallback inference failed."
        if last_exception:
            detail_msg += f" Primary last error: {type(last_exception).__name__}"
        raise HTTPException(status_code=502, detail=detail_msg)

# --- /chat-to-colab: proxy to Colab/ngrok (server keeps secret) ---
@app.post("/chat-to-colab")
def chat_to_colab(payload: Req):
    if not COLAB_URL or not COLAB_API_KEY:
        logger.error("COLAB_URL or COLAB_API_KEY not configured on server")
        raise HTTPException(status_code=500, detail="COLAB_URL or COLAB_API_KEY not configured on server")

    forward_payload = {"prompt": payload.prompt}
    try:
        r = requests.post(
            f"{COLAB_URL.rstrip('/')}/generate",
            headers={
                "Content-Type": "application/json",
                "x-api-key": COLAB_API_KEY
            },
            json=forward_payload,
            timeout=120
        )
        r.raise_for_status()
        return r.json()
    except requests.exceptions.RequestException:
        logger.exception("Error calling Colab endpoint")
        raise HTTPException(status_code=502, detail="Upstream Colab inference failed")

# --- static mounting and index route (adjust paths if yours differ) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

# mount /static if folder exists
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# serve index.html if exists in templates/
@app.get("/")
def home():
    idx = os.path.join(templates_dir, "index.html")
    if os.path.isfile(idx):
        return FileResponse(idx)
    # fallback: if index in base dir
    idx2 = os.path.join(BASE_DIR, "index.html")
    if os.path.isfile(idx2):
        return FileResponse(idx2)
    raise HTTPException(status_code=404, detail="Index not found")
