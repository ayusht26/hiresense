"""
HireSense AI Structuring Engine
Converts unstructured recruiter job descriptions into structured Job Requirement Profiles.
Features:
- OpenAI primary model (gpt-4o-mini)
- Google Gemini fallback model (gemini-2.5-flash)
- Strict JSON Schema & Pydantic validation
- Skill alias normalization and Devicon resolution
- Input sanitization & audit trail recording (model name + prompt version)
"""

import os
import re
import json
import logging
from typing import Tuple, Optional
from pathlib import Path
import httpx
from dotenv import load_dotenv

from AI.models import (
    StructuredJobListing,
    SalaryStructure,
    Qualifications,
    TechStackItem,
    RequirementType,
)
from AI.alias_normalization import normalize_tech_alias

# Load environment variables from .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger("hiresense.ai")
logging.basicConfig(level=logging.INFO)

PROMPT_VERSION = "v1.0.0"

SYSTEM_PROMPT = """You are HireSense's AI Recruitment Structuring Engine.
Your job is to convert unstructured recruiter notes/paragraphs into a high-precision Indeed/Naukri-style structured job listing.

CRITICAL RULES:
1. STRICT FIDELITY: Do NOT invent, assume, or hallucinate anything that is NOT explicitly stated in the recruiter's text.
   - If salary is missing: set min: null, max: null, display: "Not specified".
   - If location is missing: set location: null.
   - If work_mode is missing: set work_mode: null. (Allowed: "remote", "hybrid", "onsite", or null).
   - If experience is missing: set experience: null.
   - If employment_type is missing: set employment_type: null.
2. NO TECHNOLOGY INFERENCE: Do NOT infer a skill just because a related technology is mentioned. For example, if Docker is mentioned, do NOT add Kubernetes unless Kubernetes is explicitly mentioned. If JavaScript is mentioned, do NOT add React unless React is explicitly mentioned.
3. ALIAS NORMALIZATION: Convert aliases to canonical names (e.g. JS -> JavaScript, Postgres -> PostgreSQL, Node -> Node.js, TS -> TypeScript).
4. REQUIREMENT TYPING: Tag each tech item and qualification with a requirement_type:
   - "mandatory": explicitly required, non-negotiable ("must have", "required", "mandatory").
   - "preferred": good to have, bonus, preferred ("plus", "nice to have", "preferred").
   - "contextual": relevant to the team context or workflow.
   - "informational": mentioned as background information.
5. SALARY REFORMATTING: Keep the recruiter's stated salary numbers and currency exactly as given. Format the display string cleanly (e.g., "₹3,000 – ₹5,000 a month", "$80,000 – $100,000 a year", or "Not specified").
6. STRUCTURED OUTPUT: Return ONLY a valid JSON object matching the requested schema. No markdown formatting, no conversational preamble.

SCHEMA:
{
  "title": string,
  "company": string,
  "location": string or null,
  "work_mode": "remote" | "hybrid" | "onsite" | null,
  "employment_type": string or null,
  "experience": string or null,
  "salary": {
    "min": number or null,
    "max": number or null,
    "currency": string,
    "period": "month" | "year" | "hour" | "week",
    "display": string
  },
  "about_role": string,
  "responsibilities": [string],
  "qualifications": {
    "mandatory": [string],
    "preferred": [string]
  },
  "tech_stack": [
    {
      "name": string,
      "canonical_name": string,
      "category": "frontend" | "backend" | "database" | "devops" | "ai_ml" | "mobile" | "tools" | "other",
      "devicon_slug": string or null,
      "requirement_type": "mandatory" | "preferred" | "contextual" | "informational"
    }
  ],
  "benefits": [string]
}
"""

def sanitize_input(text: str, max_chars: int = 15000) -> str:
    """
    Sanitize raw recruiter input:
    - Strip dangerous HTML/script injection attempts
    - Normalize control characters
    - Truncate to maximum characters
    """
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*?>", "", text)
    # Normalize unicode whitespace
    cleaned = re.sub(r"[\r\n\t]+", "\n", cleaned)
    # Strip non-printable ASCII except standard whitespace
    cleaned = "".join(ch for ch in cleaned if ch == "\n" or 32 <= ord(ch) <= 126 or ord(ch) > 127)
    return cleaned.strip()[:max_chars]


def post_process_listing(listing_dict: dict, fallback_title: str, fallback_company: str) -> StructuredJobListing:
    """
    Validates, normalizes aliases, and ensures all fields adhere to constraints.
    """
    # Ensure title and company are present
    if not listing_dict.get("title"):
        listing_dict["title"] = fallback_title or "Job Opening"
    if not listing_dict.get("company"):
        listing_dict["company"] = fallback_company or "HireSense"

    # Normalize tech stack items with our canonical catalog
    tech_stack_raw = listing_dict.get("tech_stack", [])
    normalized_tech = []
    seen_canonical = set()

    for item in tech_stack_raw:
        if isinstance(item, str):
            raw_name = item
            cat_hint = None
            req_type: RequirementType = "preferred"
        elif isinstance(item, dict):
            raw_name = item.get("name") or item.get("canonical_name") or ""
            cat_hint = item.get("category")
            req_type_raw = str(item.get("requirement_type", "preferred")).lower()
            req_type = req_type_raw if req_type_raw in ["mandatory", "preferred", "contextual", "informational"] else "preferred"
        else:
            continue

        if not raw_name.strip():
            continue

        canonical, category, devicon = normalize_tech_alias(raw_name, cat_hint)
        if canonical.lower() in seen_canonical:
            continue
        seen_canonical.add(canonical.lower())

        normalized_tech.append(
            TechStackItem(
                name=raw_name.strip(),
                canonical_name=canonical,
                category=category,
                devicon_slug=devicon,
                requirement_type=req_type,
            )
        )

    listing_dict["tech_stack"] = [t.model_dump() for t in normalized_tech]

    # Validate salary object
    sal = listing_dict.get("salary")
    if not isinstance(sal, dict):
        listing_dict["salary"] = {
            "min": None,
            "max": None,
            "currency": "INR",
            "period": "month",
            "display": "Not specified",
        }
    else:
        display = sal.get("display")
        if not display or display.strip().lower() in ["null", "none", "not provided"]:
            if sal.get("min") or sal.get("max"):
                curr = sal.get("currency", "INR")
                period = sal.get("period", "month")
                if sal.get("min") and sal.get("max"):
                    sal["display"] = f"{curr} {sal['min']:,.0f} – {sal['max']:,.0f} per {period}"
                elif sal.get("min"):
                    sal["display"] = f"From {curr} {sal['min']:,.0f} per {period}"
                else:
                    sal["display"] = f"Up to {curr} {sal['max']:,.0f} per {period}"
            else:
                sal["display"] = "Not specified"

    # Enforce work_mode choices
    wm = listing_dict.get("work_mode")
    if wm and str(wm).lower() in ["remote", "hybrid", "onsite"]:
        listing_dict["work_mode"] = str(wm).lower()
    else:
        listing_dict["work_mode"] = None

    return StructuredJobListing.model_validate(listing_dict)


async def call_openai_structuring(prompt_user_content: str, api_key: str) -> dict:
    """
    Calls OpenAI Chat Completions API with strict JSON mode.
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_user_content},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        raw_content = data["choices"][0]["message"]["content"]
        return json.loads(raw_content)


async def call_gemini_structuring(prompt_user_content: str, api_key: str) -> dict:
    """
    Calls Google Gemini API with JSON mode fallback.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"parts": [{"text": prompt_user_content}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.1,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw_text)


async def generate_structured_listing(
    title: str,
    company: str,
    description: str,
    salary: Optional[str] = None,
) -> Tuple[StructuredJobListing, str, str]:
    """
    Generates structured job listing with:
    1. Input sanitization
    2. Primary OpenAI gpt-4o-mini with 1 retry
    3. Fallback Gemini gemini-2.5-flash
    4. Post-processing and Pydantic validation
    Returns: (StructuredJobListing, model_name, prompt_version)
    """
    clean_title = sanitize_input(title, 200)
    clean_company = sanitize_input(company, 200)
    clean_desc = sanitize_input(description, 15000)
    clean_salary = sanitize_input(salary or "", 200)

    user_prompt = f"""Job Title Provided: {clean_title}
Company Name Provided: {clean_company}
Stated Salary Input: {clean_salary if clean_salary else "Not specified"}

Recruiter Raw Description:
\"\"\"{clean_desc}\"\"\"

Generate the structured JSON job listing according to the rules and schema."""

    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()

    model_used = ""
    parsed_json = None
    last_error = None

    # Step 1: Try OpenAI (primary) with 1 retry on timeout / malformed json
    if openai_key:
        for attempt in range(2):
            try:
                logger.info(f"Calling OpenAI gpt-4o-mini (attempt {attempt + 1})...")
                parsed_json = await call_openai_structuring(user_prompt, openai_key)
                model_used = "openai/gpt-4o-mini"
                break
            except Exception as e:
                logger.warning(f"OpenAI attempt {attempt + 1} failed: {e}")
                last_error = e

    # Step 2: Fallback to Gemini if OpenAI failed or no key
    if not parsed_json and gemini_key:
        try:
            logger.info("Falling back to Google Gemini 2.5 Flash...")
            parsed_json = await call_gemini_structuring(user_prompt, gemini_key)
            model_used = "google/gemini-2.5-flash"
        except Exception as e:
            logger.error(f"Gemini fallback failed: {e}")
            last_error = e

    if not parsed_json:
        raise RuntimeError(
            f"All AI structuring providers failed. Last error: {last_error}"
        )

    # Step 3: Validate and enrich
    structured_listing = post_process_listing(parsed_json, clean_title, clean_company)
    return structured_listing, model_used, PROMPT_VERSION

