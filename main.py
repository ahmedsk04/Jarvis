from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Ahmed | AI/ML/DL Portfolio")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates directory
templates = Jinja2Templates(directory="templates")

# Home route
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Contact form POST
@app.post("/contact")
async def contact(
    name: str = Form(...),
    email: str = Form(...),
    message: str = Form(...)
):
    try:
        # Here you would typically add code to:
        # 1. Validate the email format
        # 2. Send an email
        # 3. Store in database
        # For now, we'll just return success if we got the data
        return JSONResponse(
            content={
                "status": "success",
                "message": "Message received successfully",
                "data": {"name": name, "email": email}
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your request"
        )

# Run the application
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
