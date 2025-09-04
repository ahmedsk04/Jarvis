import os
import json
import logging
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

import httpx
import uvicorn
from pydantic import BaseModel

# ------------------------------------------------------------------------------
# App & Config
# ------------------------------------------------------------------------------
app = FastAPI(title="Ahmed | AI/ML/DL Portfolio")

# CORS (loose by default; restrict to your domain(s) in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # e.g., ["https://ahmed.dev"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static & templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Hugging Face config from environment
HF_TOKEN = os.getenv("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")
MODEL_ID = (os.getenv("/uracoder/llama-8b-jarvis") or "").strip()

logger = logging.getLogger("uvicorn.error")

# ------------------------------------------------------------------------------
# Schemas for /generate
# ------------------------------------------------------------------------------
class Msg(BaseModel):
    role: str
    content: str

class GenerateReq(BaseModel):
    prompt: Optional[str] = None
    messages: Optional[List[Msg]] = None
    params: Optional[Dict[str, Any]] = None

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
def _hf_headers() -> Dict[str, str]:
    if not HF_TOKEN:
        # Use HTTPException so client sees a clean message
        raise HTTPException(500, "HF_TOKEN is not set on the server")
    return {"Authorization": f"Bearer {HF_TOKEN}"}

def build_training_prompt(messages: List[Dict[str, str]]) -> str:
    """
    Build EXACT format used during training:
    User: ...
    Assistant: ...
    ...
    Assistant:
    """
    lines = []
    for m in messages:
        role = m["role"].strip().lower()
        if role == "user":
            lines.append(f"User: {m['content']}")
        elif role == "assistant":
            lines.append(f"Assistant: {m['content']}")
    lines.append("Assistant:")
    return "\n".join(lines)

# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------
@app.get("/health", response_class=JSONResponse)
async def health():
    return {"ok": True, "service": "portfolio", "model": MODEL_ID or None}

@app.head("/", response_class=PlainTextResponse)
async def head_root():
    # Render sometimes issues HEAD / for health: return 200
    return PlainTextResponse("", status_code=200)

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/debug-config", response_class=JSONResponse)
async def debug_config():
    """Minimal config probe without leaking secrets."""
    masked = (HF_TOKEN[:6] + "…" + HF_TOKEN[-4:]) if HF_TOKEN else None
    return {
        "ok": True,
        "MODEL_ID": MODEL_ID or None,
        "HF_TOKEN_present": bool(HF_TOKEN),
        "HF_TOKEN_masked": masked,
    }

@app.post("/contact")
async def contact(
    name: str = Form(...),
    email: str = Form(...),
    message: str = Form(...),
):
    try:
        # TODO: validate email, send email, persist to DB
        return JSONResponse(
            content={
                "status": "success",
                "message": "Message received successfully",
                "data": {"name": name, "email": email},
            }
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request",
        )

# ------------------------------------------------------------------------------
# /generate -> proxies to Hugging Face Inference API
# Uses your training template "User: ... / Assistant: ..."
# ------------------------------------------------------------------------------
@app.post("/generate", response_class=JSONResponse)
async def generate(req: GenerateReq):
    if not MODEL_ID:
        raise HTTPException(500, "MODEL_ID is not set on the server")
    if not HF_TOKEN:
        raise HTTPException(500, "HF_TOKEN is not set on the server")

    # Build prompt by your training format
    if req.messages:
        prompt = build_training_prompt([m.model_dump() for m in req.messages])
    elif req.prompt:
        prompt = f"User: {req.prompt}\nAssistant:"
    else:
        raise HTTPException(400, "Provide either 'prompt' or 'messages'")

    # Default generation params
    parameters: Dict[str, Any] = {
        "max_new_tokens": 256,
        "do_sample": False,      # Deterministic for general Qs
        "temperature": 0.3,
        "top_p": 0.9,
        "return_full_text": False,
        # "stop": ["\nUser:"],  # optional, if the model tends to continue the user tag
    }
    if req.params:
        parameters.update(req.params)

    url = f"https://api-inference.huggingface.co/models/{MODEL_ID}"
    payload = {"inputs": prompt, "parameters": parameters}

    timeout = httpx.Timeout(60.0, connect=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, headers=_hf_headers(), json=payload)

        raw_text = r.text  # capture before any json parsing (for logs)

        # Cold start case
        if r.status_code == 503:
            try:
                data = r.json()
            except Exception:
                data = {}
            if isinstance(data, dict) and "estimated_time" in data:
                return {"status": "loading", "estimated_time": data["estimated_time"]}
            logger.error("HF 503 without estimated_time: %s", raw_text[:1000])
            raise HTTPException(503, "Model loading on Hugging Face; retry shortly")

        # Other HTTP errors
        if r.status_code >= 400:
            logger.error("HF error %s: %s", r.status_code, raw_text[:1000])
            try:
                err = r.json()
            except Exception:
                err = {"error": raw_text[:500]}
            msg = err.get("error") or err.get("message") or str(err)[:500]
            raise HTTPException(r.status_code, f"HuggingFace error: {msg}")

        # Success path
        try:
            data = r.json()
        except Exception:
            logger.error("HF returned non-JSON: %s", raw_text[:1000])
            raise HTTPException(502, "Bad response from HF (non-JSON)")

        # Normalize common shapes
        if isinstance(data, list) and data and "generated_text" in data[0]:
            generated = data[0]["generated_text"]
        elif isinstance(data, dict) and "generated_text" in data:
            generated = data["generated_text"]
        else:
            generated = json.dumps(data)

        # Extract only the assistant’s latest reply
        if "Assistant:" in generated:
            ans = generated.split("Assistant:")[-1]
            if "\nUser:" in ans:
                ans = ans.split("\nUser:")[0]
            output = ans.strip()
        else:
            output = generated.strip()

        return {"output": output}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled /generate error: %s", e)
        raise HTTPException(500, "Internal error; check server logs for details")

# ------------------------------------------------------------------------------
# Local dev entrypoint (Render uses startCommand instead)
# ------------------------------------------------------------------------------
if __name__ == "__main__":
  # On Render, set startCommand to:
  # uvicorn main:app --host 0.0.0.0 --port $PORT
  port = int(os.getenv("PORT", "8000"))
  uvicorn.run(app, host="0.0.0.0", port=port)
