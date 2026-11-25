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

from AI.models import (
    GenerateJobRequest,
    GenerateJobResponse,
    ExtractEntitiesRequest,
    ExtractEntitiesResponse,
    EntitySpan,
    TwoTowerMatchRequest,
    TwoTowerMatchResponse,
    DeepLearningPipelineRequest,
)
from AI.structuring_service import generate_structured_listing
from AI.DeepLearning.ner.inference import ResumeNERExtractor
from AI.DeepLearning.matching.inference import TwoTowerMatcherService
from AI.DeepLearning.pipeline import ResumeJobDeepLearningPipeline

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

# ---------------------------------------------------------
# Deep Learning Endpoints (In-House Trained Models)
# ---------------------------------------------------------
_ner_extractor = None
_matcher_service = None
_dl_pipeline = None

def get_ner_extractor():
    global _ner_extractor
    if _ner_extractor is None:
        _ner_extractor = ResumeNERExtractor()
    return _ner_extractor

def get_matcher_service():
    global _matcher_service
    if _matcher_service is None:
        _matcher_service = TwoTowerMatcherService()
    return _matcher_service

def get_dl_pipeline():
    global _dl_pipeline
    if _dl_pipeline is None:
        _dl_pipeline = ResumeJobDeepLearningPipeline()
    return _dl_pipeline


@app.post(
    "/api/deep-learning/extract-entities",
    response_model=ExtractEntitiesResponse,
    status_code=status.HTTP_200_OK,
)
async def api_extract_entities(payload: ExtractEntitiesRequest):
    """
    Extracts skills, colleges, and experience entities using the custom BiLSTM-CRF model.
    Returns exact character spans for explainable UI evidence linking.
    """
    try:
        extractor = get_ner_extractor()
        summary = extractor.extract_structured_summary(payload.text)
        spans = [
            EntitySpan(
                text=ent["text"],
                label=ent["label"],
                start=ent["start"],
                end=ent["end"],
            )
            for ent in summary["raw_entities"]
        ]
        return ExtractEntitiesResponse(
            skills=summary["skills"],
            colleges=summary["colleges"],
            experience=summary["experience"],
            entities=spans,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"BiLSTM-CRF extraction error: {str(exc)}",
        )


@app.post(
    "/api/deep-learning/match",
    response_model=TwoTowerMatchResponse,
    status_code=status.HTTP_200_OK,
)
async def api_two_tower_match(payload: TwoTowerMatchRequest):
    """
    Computes candidate-job compatibility score and vector distance using
    the custom Two-Tower DSSM network in under 5ms.
    """
    try:
        matcher = get_matcher_service()
        result = matcher.score_candidate_job(
            candidate=payload.candidate.model_dump(),
            job=payload.job.model_dump(),
        )
        return TwoTowerMatchResponse(
            score=result["score"],
            cosine_similarity=result["cosine_similarity"],
            fit_verdict=result["fit_verdict"],
            matched_skills=result["matched_skills"],
            missing_skills=result["missing_skills"],
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Two-Tower matching error: {str(exc)}",
        )


@app.post(
    "/api/deep-learning/pipeline-match",
    status_code=status.HTTP_200_OK,
)
async def api_dl_pipeline_match(payload: DeepLearningPipelineRequest):
    """
    End-to-End Deep Learning pipeline:
    Resume text -> BiLSTM-CRF token parsing -> Normalization -> Two-Tower Matching.
    """
    try:
        pipeline = get_dl_pipeline()
        result = pipeline.process_and_match(
            resume_text=payload.resume_text,
            job_requirements=payload.job.model_dump(),
        )
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deep learning pipeline error: {str(exc)}",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("AI.main:app", host="0.0.0.0", port=8000, reload=True)

