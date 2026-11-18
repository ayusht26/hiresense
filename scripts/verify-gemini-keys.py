"""
HireSense - Gemini Multi-Key Credit & Status Scanner
Adapts multi-key rotation (api1, api2, api3, ...) for the HireSense AI recruitment project.

Features:
- Reads multiple comma-separated keys from GEMINI_API_KEY in .env
- Inspects credit & quota status (detects 429 quota exhaustion, 403 billing/permission, 503 demand spikes, active models)
- Automatically rotates to keys that still have credits
- Supports both the official google.genai SDK and REST API with fallback models
- Executes sample HireSense tasks (Job Structuring, Resume Evaluation, Interview Question Generation)
"""

import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv
import requests

# Load project environment
PROJECT_ROOT = Path(__file__).resolve().parent.parent
env_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=env_path)

# Try importing google.genai SDK
try:
    from google import genai
    from google.genai import types
    HAS_GENAI_SDK = True
except ImportError:
    HAS_GENAI_SDK = False

def get_gemini_keys():
    """Extract and clean all comma-separated keys from .env"""
    raw = os.getenv("GEMINI_API_KEY", "")
    return [k.strip() for k in raw.split(",") if k.strip()]

# Preferred models in priority order for HireSense
CANDIDATE_MODELS = [
    os.getenv("LLM_MODEL_PRIMARY", "gemini-3.8-flash"),
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
]

def check_key_status(key: str, index: int):
    """
    Checks if a key is valid and has available quota/credits.
    Returns (status: str, working_model: str or None, message: str)
    """
    for model in CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        payload = {
            "contents": [{"parts": [{"text": "Respond in one word: OK"}]}],
            "generationConfig": {"temperature": 0.0, "maxOutputTokens": 10}
        }
        try:
            t0 = time.time()
            resp = requests.post(url, json=payload, timeout=12)
            elapsed = time.time() - t0
            
            if resp.status_code == 200:
                return "ACTIVE", model, f"Healthy ({elapsed:.2f}s on {model})"
            
            error_data = resp.json().get("error", {})
            code = error_data.get("code") or resp.status_code
            msg = error_data.get("message", resp.text)[:120].strip()
            
            if code == 429 or "quota" in msg.lower() or "resource_exhausted" in msg.lower():
                return "QUOTA_EXHAUSTED", None, f"429 Quota/Credits exhausted: {msg[:60]}"
            elif code == 403 or "permission" in msg.lower() or "billing" in msg.lower():
                return "FORBIDDEN", None, f"403 Billing/Permission required: {msg[:60]}"
            elif code in (503, 404):
                # Temporary high demand or model deprecation, try next candidate model
                continue
            else:
                return "ERROR", None, f"HTTP {code}: {msg[:60]}"
        except requests.exceptions.Timeout:
            continue
        except Exception as e:
            return "FAILED", None, f"Exception: {e}"
            
    return "DEMAND_SPIKE", None, "Timed out or high demand across tested models"


def generate_hiresense_job_profile(job_title: str, company: str, raw_notes: str):
    """
    HireSense Task: Structure a raw job description into canonical job requirements
    using the first key with available credits.
    """
    keys = get_gemini_keys()
    if not keys:
        print("[ERROR] No GEMINI_API_KEY found in .env")
        return None
        
    system_prompt = """You are HireSense's AI Recruitment Structuring Engine.
Convert unstructured recruiter notes into a structured JSON job listing adhering strictly to:
1. "title": Job title.
2. "company": Company name.
3. "work_mode": "remote", "hybrid", "onsite", or null.
4. "employment_type": "full-time", "contract", "internship", or null.
5. "experience": e.g. "3-5 years" or null.
6. "about_role": Brief 2-3 sentence overview.
7. "responsibilities": Array of strings.
8. "qualifications": {"mandatory": [string], "preferred": [string]}.
9. "tech_stack": Array of objects: {"name": string, "canonical_name": string, "category": string, "requirement_type": "mandatory"|"preferred"}.
Return ONLY valid JSON."""

    user_prompt = f"""Job Title: {job_title}
Company: {company}
Recruiter Notes:
{raw_notes}"""

    for idx, key in enumerate(keys):
        mask = f"{key[:8]}...{key[-4:]}"
        print(f"-> Trying Key #{idx+1} ({mask})...")
        
        # 1. Try google.genai SDK if installed
        if HAS_GENAI_SDK:
            for model in CANDIDATE_MODELS:
                try:
                    client = genai.Client(api_key=key)
                    resp = client.models.generate_content(
                        model=model,
                        contents=f"{system_prompt}\n\n{user_prompt}",
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1
                        )
                    )
                    if resp and resp.text:
                        parsed = json.loads(resp.text)
                        print(f"   [SUCCESS via SDK] Key #{idx+1} succeeded with {model}!")
                        return {"key_index": idx, "model": model, "method": "SDK", "result": parsed}
                except Exception as sdk_err:
                    err_str = str(sdk_err)
                    if "429" in err_str or "quota" in err_str.lower():
                        print(f"   [QUOTA EXHAUSTED] Key #{idx+1} out of credits. Rotating...")
                        break
                    elif "403" in err_str:
                        print(f"   [BILLING/PERM] Key #{idx+1} unavailable (403). Rotating...")
                        break
                    # Continue trying next model
                    continue
        
        # 2. Direct HTTP REST API fallback
        for model in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            payload = {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1}
            }
            try:
                resp = requests.post(url, json=payload, timeout=25)
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text)
                    print(f"   [SUCCESS via REST] Key #{idx+1} succeeded with {model}!")
                    return {"key_index": idx, "model": model, "method": "REST", "result": parsed}
                elif resp.status_code == 429:
                    print(f"   [QUOTA EXHAUSTED] Key #{idx+1} has no credits remaining (429). Rotating...")
                    break
                elif resp.status_code == 403:
                    print(f"   [FORBIDDEN] Key #{idx+1} billing unavailable (403). Rotating...")
                    break
            except Exception:
                continue

    print("[FAILED] All Gemini keys exhausted or unavailable.")
    return None


def generate_hiresense_interview_questions(job_title: str, mandatory_skills: list):
    """
    HireSense Task: Generate interview questions using active Gemini keys.
    """
    keys = get_gemini_keys()
    prompt = f"""Generate 3 technical interview questions for a {job_title} candidate with focus on: {', '.join(mandatory_skills)}.
Return as JSON: {{"questions": [{{"question": string, "skill": string, "rubric": string}}]}}"""

    for idx, key in enumerate(keys):
        for model in ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.8-flash"]:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2}
            }
            try:
                r = requests.post(url, json=payload, timeout=20)
                if r.status_code == 200:
                    data = json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])
                    return {"key_index": idx, "model": model, "questions": data.get("questions", [])}
                elif r.status_code in (429, 403):
                    break
            except Exception:
                continue
    return None


if __name__ == "__main__":
    print("=" * 70)
    print("   HireSense - Gemini Multi-Key Credit & Status Scanner")
    print("=" * 70)
    
    keys = get_gemini_keys()
    print(f"Found {len(keys)} Gemini API keys in .env\n")
    
    active_keys = []
    for i, k in enumerate(keys):
        mask = f"{k[:8]}...{k[-4:]}"
        print(f"Testing Key #{i+1} ({mask})...", end=" ", flush=True)
        status, model, detail = check_key_status(k, i)
        print(f"[{status}] - {detail}")
        if status == "ACTIVE":
            active_keys.append((i, mask, model))
            
    print("\n" + "=" * 70)
    print(f"Results: {len(active_keys)} of {len(keys)} keys have active credits and are healthy.")
    print("=" * 70)
    
    # Run HireSense recruitment tasks
    print("\n[Task 1] Structuring Job Requirement Profile (HireSense Engine)...")
    sample_notes = """
    We are hiring a Full-Stack Engineer with 3+ years experience.
    Mandatory: React, Node.js, TypeScript, PostgreSQL.
    Preferred: Docker, GraphQL.
    Responsibilities: Build web dashboard, maintain REST APIs, and implement unit tests.
    Hybrid Bangalore, salary ₹18,00,000 - ₹26,00,000 / year.
    """
    job_res = generate_hiresense_job_profile("Full-Stack Engineer", "HireSense Labs", sample_notes)
    if job_res:
        print(f"-> Successfully structured with Key #{job_res['key_index']+1} ({job_res['model']}) via {job_res['method']}")
        print(json.dumps(job_res["result"], indent=2))
        
    print("\n[Task 2] Generating Interview Questions for Candidate...")
    int_res = generate_hiresense_interview_questions("Full-Stack Engineer", ["React", "PostgreSQL", "Node.js"])
    if int_res:
        print(f"-> Generated {len(int_res['questions'])} interview questions with Key #{int_res['key_index']+1} ({int_res['model']}):")
        for q in int_res["questions"]:
            print(f"   * [{q.get('skill', 'General')}]: {q.get('question')}")
            
    print("\n" + "=" * 70)
    print("All tasks completed successfully!")
    print("=" * 70)
