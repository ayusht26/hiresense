from typing import List, Optional, Literal
from pydantic import BaseModel, Field

RequirementType = Literal["mandatory", "preferred", "contextual", "informational"]
WorkMode = Literal["remote", "hybrid", "onsite"]

class SalaryStructure(BaseModel):
    min: Optional[float] = Field(None, description="Minimum salary amount if specified, else null")
    max: Optional[float] = Field(None, description="Maximum salary amount if specified, else null")
    currency: str = Field("INR", description="Currency code, e.g. INR, USD, EUR")
    period: str = Field("month", description="Period: month, year, hour, week")
    display: str = Field("Not specified", description="Human-readable formatted salary string, e.g. ₹3,000 – ₹5,000 a month or Not specified")

class TechStackItem(BaseModel):
    name: str = Field(..., description="Skill/technology name as mentioned")
    canonical_name: str = Field(..., description="Normalized standard name, e.g. JavaScript, PostgreSQL")
    category: str = Field("other", description="Category: frontend, backend, database, devops, ai_ml, mobile, tools, other")
    devicon_slug: Optional[str] = Field(None, description="Devicon slug identifier for icon rendering")
    requirement_type: RequirementType = Field("preferred", description="Requirement level: mandatory, preferred, contextual, or informational")

class Qualifications(BaseModel):
    mandatory: List[str] = Field(default_factory=list, description="Mandatory/required qualifications")
    preferred: List[str] = Field(default_factory=list, description="Preferred/good-to-have qualifications")

class StructuredJobListing(BaseModel):
    title: str = Field(..., description="Standardized job title")
    company: str = Field(..., description="Company name")
    location: Optional[str] = Field(None, description="Work location/city or null if not specified")
    work_mode: Optional[WorkMode] = Field(None, description="Work mode: remote, hybrid, onsite, or null if not specified")
    employment_type: Optional[str] = Field(None, description="Employment type: Full-time, Part-time, Internship, Contract, or null if not specified")
    experience: Optional[str] = Field(None, description="Experience requirement string, e.g. 2-4 years, or null if not specified")
    salary: SalaryStructure = Field(default_factory=lambda: SalaryStructure(min=None, max=None, currency="INR", period="month", display="Not specified"))
    about_role: str = Field(..., description="Summary overview of the role")
    responsibilities: List[str] = Field(default_factory=list, description="Clear, bulleted job responsibilities")
    qualifications: Qualifications = Field(default_factory=lambda: Qualifications(mandatory=[], preferred=[]))
    tech_stack: List[TechStackItem] = Field(default_factory=list, description="Technologies and skills identified")
    benefits: List[str] = Field(default_factory=list, description="Perks and benefits mentioned in the text")

class GenerateJobRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    company: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=20000)
    salary: Optional[str] = Field(None, max_length=200)

class GenerateJobResponse(BaseModel):
    structured: StructuredJobListing
    model_name: str
    prompt_version: str


# =========================================================
# Deep Learning Endpoints Data Models
# =========================================================

class ExtractEntitiesRequest(BaseModel):
    text: str = Field(..., min_length=2, description="Raw text snippet or resume section")


class EntitySpan(BaseModel):
    text: str
    label: str
    start: int
    end: int


class ExtractEntitiesResponse(BaseModel):
    skills: List[str]
    colleges: List[str]
    experience: List[str]
    entities: List[EntitySpan]


class CandidateMatchProfile(BaseModel):
    skills: List[str] = Field(default_factory=list)
    years_experience: float = 0.0
    education_tier: int = 2  # 1: Diploma, 2: Bachelor, 3: Master, 4: PhD
    prev_roles_count: int = 1


class JobMatchProfile(BaseModel):
    required_skills: List[str] = Field(default_factory=list)
    min_experience: float = 0.0
    seniority_tier: int = 2  # 1: Jr, 2: Mid, 3: Sr, 4: Lead
    salary_band: float = 0.5


class TwoTowerMatchRequest(BaseModel):
    candidate: CandidateMatchProfile
    job: JobMatchProfile


class TwoTowerMatchResponse(BaseModel):
    score: float
    cosine_similarity: float
    fit_verdict: str
    matched_skills: List[str]
    missing_skills: List[str]


class DeepLearningPipelineRequest(BaseModel):
    resume_text: str = Field(..., min_length=5, description="Full resume text")
    job: JobMatchProfile

