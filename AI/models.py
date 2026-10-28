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

