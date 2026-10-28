"""
HireSense AI Structuring Microservice
FastAPI server providing AI-powered job structuring endpoints.
"""

import os
import time
from typing import Dict, List
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from AI.models import GenerateJobRequest, GenerateJobResponse
from AI.structuring_service import generate_structured_listing

app = FastAPI(
    title="HireSense AI Structuring Engine",
    description="End-to-end recruitment intelligence and job profile structuring",
    version="1.0.0",
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Rate Limiting (In-Memory Sliding Window)
# ---------------------------------------------------------
# Max 10 requests per minute per client IP
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10
client_request_history: Dict[str, List[float]] = {}

def check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    timestamps = client_request_history.get(client_ip, [])
    # Keep only timestamps inside the window
    valid_timestamps = [t for t in timestamps if t > cutoff]
    if len(valid_timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        client_request_history[client_ip] = valid_timestamps
        return False
    valid_timestamps.append(now)
    client_request_history[client_ip] = valid_timestamps
    return True

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path.endswith("/generate-job-listing") and request.method == "POST":
        client_ip = request.client.host if request.client else "unknown"
        # Check X-Forwarded-For if behind a proxy
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        if not check_rate_limit(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Maximum 10 generation requests per minute. Please try again in a few moments."
                },
                headers={"Retry-After": "60"},
            )
    response = await call_next(request)
    return response

# ---------------------------------------------------------
# Health & Status Endpoints
# ---------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "HireSense AI Structuring Engine",
        "version": "1.0.0",
        "openai_configured": bool(os.environ.get("OPENAI_API_KEY")),
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
    }

# ---------------------------------------------------------
# Job Structuring Endpoint
# ---------------------------------------------------------
@app.post(
    "/api/generate-job-listing",
    response_model=GenerateJobResponse,
    status_code=status.HTTP_200_OK,
)
async def api_generate_job_listing(payload: GenerateJobRequest):
    try:
        structured_listing, model_name, prompt_version = await generate_structured_listing(
            title=payload.title,
            company=payload.company,
            description=payload.description,
            salary=payload.salary,
        )

        return GenerateJobResponse(
            structured=structured_listing,
            model_name=model_name,
            prompt_version=prompt_version,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI structuring error: {str(exc)}",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("AI.main:app", host="0.0.0.0", port=8000, reload=True)

