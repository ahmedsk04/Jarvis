import os, json
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import httpx
from typing import List, Dict, Any
from pydantic import BaseModel

app = FastAPI(title="Ahmed | AI/ML/DL Portfolio")

HF_TOKEN = os.getenv("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")  # Render secrets
MODEL_ID = os.getenv("MODEL_ID", "ahmed/llama-8b-jarvis")  # your HF repo id

class Msg(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class GenerateReq(BaseModel):
    # Either send a single "prompt" (string) OR a "messages" array for multi-turn
    prompt: str | None = None
    messages: List[Msg] | None = None
    params: Dict[str, Any] | None = None  # HF params override

def _hf_headers():
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN env var missing")
    return {"Authorization": f"Bearer {HF_TOKEN}"}

# === core: build EXACT training-style prompt ===
def build_user_assistant_prompt(messages: List[Dict[str, str]]) -> str:
    """
    messages: [{"role":"user"/"assistant", "content":"..."}]
    returns: "User: ...\nAssistant: ...\nUser: ...\nAssistant:"
    (ends with 'Assistant:' so model continues)
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

@app.post("/generate")
async def generate(req: GenerateReq):
    # 1) Build prompt according to your training format
    if req.messages:
        # already in role/content form
        msgs = [m.model_dump() for m in req.messages]
        prompt = build_user_assistant_prompt(msgs)
    elif req.prompt:
        # single-turn
        prompt = f"User: {req.prompt}\nAssistant:"
    else:
        raise HTTPException(400, "Provide either 'prompt' or 'messages'")

    # 2) Default HF generation parameters (tune as you like)
    parameters = {
        "max_new_tokens": 256,
        "do_sample": False,      # factual/general Qs → deterministic
        "temperature": 0.3,
        "top_p": 0.9,
        "return_full_text": False,
        # "stop": ["\nUser:"],   # (optional) If your model tends to continue the user tag
    }
    if req.params:
        parameters.update(req.params)

    url = f"https://api-inference.huggingface.co/models/{MODEL_ID}"
    payload = {"inputs": prompt, "parameters": parameters}

    # 3) Call HF Inference API
    timeout = httpx.Timeout(60.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, headers=_hf_headers(), json=payload)

    # 4) Handle response
    try:
        data = r.json()
    except Exception:
        raise HTTPException(500, f"Bad response from HF: {r.text[:200]}")

    if r.status_code == 503 and isinstance(data, dict) and "estimated_time" in data:
        return {"status": "loading", "estimated_time": data["estimated_time"]}

    if r.status_code >= 400:
        raise HTTPException(r.status_code, str(data)[:500])

    # Normalize common HF shapes
    if isinstance(data, list) and data and "generated_text" in data[0]:
        raw = data[0]["generated_text"]
    elif isinstance(data, dict) and "generated_text" in data:
        raw = data["generated_text"]
    else:
        raw = json.dumps(data)

    # Extract ONLY assistant’s latest reply from the training-style block
    # Everything after the last "Assistant:" up to (optional) next "\nUser:"
    if "Assistant:" in raw:
        ans = raw.split("Assistant:")[-1]
        if "\nUser:" in ans:
            ans = ans.split("\nUser:")[0]
        output = ans.strip()
    else:
        output = raw.strip()

    return {"output": output}


# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # for prod, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static files ---
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Templates ---
templates = Jinja2Templates(directory="templates")

# --- Health check (for Render) ---
@app.get("/health", response_class=JSONResponse)
async def health():
    return {"ok": True, "service": "fastapi-portfolio"}

# Root HEAD support (Render does HEAD / for health check sometimes)
@app.head("/", response_class=PlainTextResponse)
async def root_head():
    return PlainTextResponse("", status_code=200)

# --- Home page ---
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# --- Contact form ---
@app.post("/contact")
async def contact(
    name: str = Form(...),
    email: str = Form(...),
    message: str = Form(...),
):
    try:
        # Normally: validate email, send email, save to DB
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

# --- Local development entrypoint ---
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))  # default 8000 locally, $PORT on Render
    uvicorn.run(app, host="0.0.0.0", port=port)
