"""
Verification script for HireSense Deep Learning Modules:
  1. Tests BiLSTM-CRF Resume NER token labeling and entity span extraction.
  2. Tests Two-Tower DSSM Candidate-Job compatibility scoring and vector latency.
  3. Tests the integrated end-to-end Pipeline.
"""

import os
import time

# Prevent Intel OpenMP initialization conflicts
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from AI.DeepLearning.ner.inference import ResumeNERExtractor
from AI.DeepLearning.matching.inference import TwoTowerMatcherService
from AI.DeepLearning.pipeline import ResumeJobDeepLearningPipeline


def test_bilstm_crf_ner():
    print("\n" + "=" * 60)
    print("TEST 1: Custom BiLSTM-CRF Resume NER Model")
    print("=" * 60)

    extractor = ResumeNERExtractor()

    sample_resume = (
        "Senior Backend Engineer with 5 years experience in React and TypeScript. "
        "Graduated from IIT Bombay. Developed scalable microservices using Go, Docker, "
        "and PostgreSQL at Google."
    )

    t0 = time.perf_counter()
    summary = extractor.extract_structured_summary(sample_resume)
    latency_ms = (time.perf_counter() - t0) * 1000

    print(f"Input text: \"{sample_resume}\"")
    print(f"\nExtracted Skills:      {summary['skills']}")
    print(f"Extracted Colleges:    {summary['colleges']}")
    print(f"Extracted Experience:  {summary['experience']}")
    print(f"\nExact Character Spans (Explainable Evidence):")
    for ent in summary["raw_entities"]:
        print(f"  - [{ent['label']:<10}] '{ent['text']}' (chars {ent['start']} to {ent['end']})")

    print(f"\n[✓] NER Inference Latency: {latency_ms:.2f} ms")


def test_two_tower_matcher():
    print("\n" + "=" * 60)
    print("TEST 2: Custom Two-Tower DSSM Matching Model")
    print("=" * 60)

    matcher = TwoTowerMatcherService()

    candidate = {
        "skills": ["python", "fastapi", "postgresql", "docker", "aws"],
        "years_experience": 4.0,
        "education_tier": 2,  # B.Tech
        "prev_roles_count": 2,
    }

    # High match job
    backend_job = {
        "required_skills": ["python", "fastapi", "postgresql", "docker"],
        "min_experience": 3.0,
        "seniority_tier": 2,
        "salary_band": 0.7,
    }

    # Mismatched job
    frontend_job = {
        "required_skills": ["react", "typescript", "tailwind css", "figma"],
        "min_experience": 3.0,
        "seniority_tier": 2,
        "salary_band": 0.6,
    }

    t0 = time.perf_counter()
    backend_result = matcher.score_candidate_job(candidate, backend_job)
    latency_ms = (time.perf_counter() - t0) * 1000

    frontend_result = matcher.score_candidate_job(candidate, frontend_job)

    print(f"Candidate Skills: {candidate['skills']} (Exp: {candidate['years_experience']} yrs)")
    print("\nScenario A: Matched Backend Role (Python/FastAPI/Postgres)")
    print(f"  - Score:              {backend_result['score']} / 100")
    print(f"  - Cosine Sim:         {backend_result['cosine_similarity']}")
    print(f"  - Verdict:            {backend_result['fit_verdict']}")
    print(f"  - Matched Skills:     {backend_result['matched_skills']}")
    print(f"  - Missing Skills:     {backend_result['missing_skills']}")

    print("\nScenario B: Mismatched Frontend Role (React/TypeScript)")
    print(f"  - Score:              {frontend_result['score']} / 100")
    print(f"  - Cosine Sim:         {frontend_result['cosine_similarity']}")
    print(f"  - Verdict:            {frontend_result['fit_verdict']}")
    print(f"  - Matched Skills:     {frontend_result['matched_skills']}")
    print(f"  - Missing Skills:     {frontend_result['missing_skills']}")

    print(f"\n[✓] Matching Latency: {latency_ms:.2f} ms")


def test_integrated_pipeline():
    print("\n" + "=" * 60)
    print("TEST 3: End-to-End Deep Learning Recruitment Pipeline")
    print("=" * 60)

    pipeline = ResumeJobDeepLearningPipeline()

    resume_text = (
        "Data Scientist with 3+ years experience using Python, Scikit-Learn, and Pandas. "
        "Completed Bachelor of Engineering at BITS Pilani. Implemented deep learning "
        "models with PyTorch and deployed microservices with FastAPI on AWS."
    )

    job_requirements = {
        "required_skills": ["Python", "PyTorch", "FastAPI", "AWS", "PostgreSQL"],
        "min_experience": 3.0,
        "seniority_tier": 2,
    }

    t0 = time.perf_counter()
    result = pipeline.process_and_match(resume_text, job_requirements)
    latency_ms = (time.perf_counter() - t0) * 1000

    print(f"Candidate Match Score:  {result['overall_match_score']} / 100 ({result['fit_verdict']})")
    print(f"Normalized Skills:      {result['candidate_profile']['skills']}")
    print(f"Extracted Institutions: {result['candidate_profile']['colleges']}")
    print(f"Estimated Experience:   {result['candidate_profile']['years_experience']} years")
    print(f"Matched Skills:         {result['skills_analysis']['matched_skills']}")
    print(f"Missing Skills:         {result['skills_analysis']['missing_skills']}")
    print(f"Evidence Spans Count:   {len(result['evidence_spans'])} spans identified")
    print(f"\n[✓] Total End-to-End Pipeline Latency: {latency_ms:.2f} ms")


if __name__ == "__main__":
    test_bilstm_crf_ner()
    test_two_tower_matcher()
    test_integrated_pipeline()
