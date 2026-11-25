"""
End-to-End Deep Learning Pipeline for HireSense.
Connects:
  1. BiLSTM-CRF Resume NER (extracts skills, colleges, and experience spans).
  2. Alias Normalization (normalizes variations like 'JS' -> 'javascript').
  3. Two-Tower DSSM Matcher (computes deep compatibility score & vector embeddings).
"""

import os
import re
from typing import Dict, Any, List, Optional

from .ner.inference import ResumeNERExtractor
from .matching.inference import TwoTowerMatcherService
from AI.alias_normalization import normalize_tech_alias


def normalize_skill(name: str) -> str:
    canonical, _, _ = normalize_tech_alias(name)
    return canonical.lower()


class ResumeJobDeepLearningPipeline:
    def __init__(self, models_dir: Optional[str] = None):
        if models_dir is None:
            models_dir = os.path.dirname(os.path.abspath(__file__))

        ner_dir = os.path.join(models_dir, "ner")
        matching_dir = os.path.join(models_dir, "matching")

        print("[*] Initializing HireSense Deep Learning Pipeline...")
        self.ner_extractor = ResumeNERExtractor(model_dir=ner_dir)
        self.matcher_service = TwoTowerMatcherService(model_dir=matching_dir)
        print("[✓] HireSense Deep Learning Pipeline ready.")

    def _estimate_experience_years(self, experience_spans: List[str]) -> float:
        """Heuristic parser to extract numerical years from NER experience spans."""
        for span in experience_spans:
            match = re.search(r"(\d+(\.\d+)?)\s*\+?\s*years?", span, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    pass
        return 2.0  # Default baseline if not explicitly found

    def process_and_match(
        self,
        resume_text: str,
        job_requirements: Dict[str, Any],
        candidate_meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end deep learning workflow:
        1. Tokenizes and extracts entities via BiLSTM-CRF with exact spans.
        2. Normalizes skills to canonical taxonomy.
        3. Encodes candidate and job via Two-Tower DSSM.
        4. Returns structured report ready for recruiter audit.
        """
        candidate_meta = candidate_meta or {}

        # 1. BiLSTM-CRF NER Extraction
        ner_summary = self.ner_extractor.extract_structured_summary(resume_text)
        extracted_skills = ner_summary["skills"]
        extracted_colleges = ner_summary["colleges"]
        extracted_exp = ner_summary["experience"]

        # 2. Skill Normalization via HireSense dictionary
        normalized_skills = []
        for s in extracted_skills:
            norm = normalize_skill(s)
            if norm not in normalized_skills:
                normalized_skills.append(norm)

        # 3. Experience Estimation
        years_exp = candidate_meta.get("years_experience")
        if years_exp is None:
            years_exp = self._estimate_experience_years(extracted_exp)

        candidate_profile = {
            "skills": normalized_skills,
            "years_experience": years_exp,
            "education_tier": candidate_meta.get("education_tier", 2),
            "prev_roles_count": candidate_meta.get("prev_roles_count", max(1, len(extracted_exp))),
        }

        # Normalize job required skills
        raw_job_skills = job_requirements.get("required_skills", [])
        norm_job_skills = [normalize_skill(s) for s in raw_job_skills]
        normalized_job = {
            **job_requirements,
            "required_skills": norm_job_skills,
        }

        # 4. Two-Tower Matching
        match_result = self.matcher_service.score_candidate_job(
            candidate=candidate_profile,
            job=normalized_job,
        )

        return {
            "overall_match_score": match_result["score"],
            "cosine_similarity": match_result["cosine_similarity"],
            "fit_verdict": match_result["fit_verdict"],
            "candidate_profile": {
                **candidate_profile,
                "colleges": extracted_colleges,
                "experience_spans": extracted_exp,
            },
            "skills_analysis": {
                "matched_skills": match_result["matched_skills"],
                "missing_skills": match_result["missing_skills"],
            },
            "evidence_spans": ner_summary["raw_entities"],
            "embeddings": {
                "candidate_vector": match_result["candidate_vector"],
                "job_vector": match_result["job_vector"],
            },
        }
