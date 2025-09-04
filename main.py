import os
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Ahmed | AI/ML/DL Portfolio")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your domain(s) in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static files ---
# Expect your assets at ./static (e.g., ./static/images/myphoto.jpg)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Templates ---
# Expect your templates at ./templates (e.g., ./templates/index.html)
templates = Jinja2Templates(directory="templates")

# --- Health check (for Render) ---
@app.get("/health", response_class=JSONResponse)
async def health():
    return {"ok": True, "service": "up"}

# Optional: handle HEAD / explicitly (FastAPI usually auto-handles via GET)
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
        # TODO: validate email, send email, persist to DB, etc.
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

# --- Local dev entrypoint ---
if __name__ == "__main__":
    # On Render, set startCommand to:
    # uvicorn main:app --host 0.0.0.0 --port $PORT
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)  # no reload in production
