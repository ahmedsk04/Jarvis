# main.py (portfolio)
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests, os, logging, time
from typing import Optional, Dict, Any
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["POST"],
  allow_headers=["*"],
)

HF_TOKEN = os.getenv("HF_TOKEN")
REPO = os.getenv("HF_REPO", "uracoder/my-chatbot-merged")
HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"}

class Req(BaseModel):
    prompt: str

@app.post("/generate")
def generate(payload: Req):
    if not HF_TOKEN:
        raise HTTPException(status_code=500, detail="HF_TOKEN not set")
    url = f"https://api-inference.huggingface.co/models/{REPO}"
    data = {"inputs": payload.prompt, "options": {"wait_for_model": True}}
    try:
        t0 = time.time()
        resp = requests.post(url, headers=HEADERS, json=data, timeout=60)
        resp.raise_for_status()
        elapsed = time.time() - t0
        body = resp.json()
        # HF inference returns list or dict depending on model; normalize:
        if isinstance(body, list) and len(body) and "generated_text" in body[0]:
            out = body[0]["generated_text"]
        elif isinstance(body, dict) and "generated_text" in body:
            out = body["generated_text"]
        else:
            out = body
        return {"result": out, "took_seconds": elapsed}
    except requests.exceptions.RequestException as e:
        logging.exception("HF request failed")
        raise HTTPException(status_code=502, detail=str(e))

# import the model FastAPI app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

@app.get("/")
def home():
    return FileResponse(os.path.join(BASE_DIR, "templates", "index.html"))
