"""
Matching Dataset, Skill Vocabulary, and Featurizer for Two-Tower Matching.
Prepares Candidate and Job profiles into vectorized tensors for training and inference.
"""

import json
import torch
from torch.utils.data import Dataset
from typing import List, Dict, Tuple, Any, Optional

# Core skill vocabulary covering frontend, backend, AI/ML, DevOps, and cloud
CORE_SKILLS_LIST = [
    "<pad>",
    "<unk>",
    "python",
    "javascript",
    "typescript",
    "go",
    "java",
    "c++",
    "c#",
    "rust",
    "react",
    "next.js",
    "vue.js",
    "angular",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "spring boot",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "graphql",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "terraform",
    "ci/cd",
    "pytorch",
    "tensorflow",
    "scikit-learn",
    "pandas",
    "numpy",
    "huggingface",
    "nlp",
    "computer vision",
    "kafka",
    "spark",
    "tailwind css",
    "html5",
    "css3",
    "git",
    "linux",
]

SKILL_TO_ID: Dict[str, int] = {skill.lower(): idx for idx, skill in enumerate(CORE_SKILLS_LIST)}
ID_TO_SKILL: Dict[int, str] = {idx: skill for skill, idx in SKILL_TO_ID.items()}


def get_or_create_skill_id(skill_name: str) -> int:
    clean = skill_name.lower().strip()
    return SKILL_TO_ID.get(clean, SKILL_TO_ID["<unk>"])


def featurize_candidate(
    skills: List[str],
    years_experience: float = 0.0,
    education_tier: int = 2,  # 1: High School/Diploma, 2: Bachelor, 3: Master, 4: PhD
    prev_roles_count: int = 2,
    match_intent: float = 1.0,
) -> Tuple[List[int], List[float]]:
    """
    Returns (skill_ids, dense_features)
    """
    skill_ids = [get_or_create_skill_id(s) for s in skills]
    if not skill_ids:
        skill_ids = [SKILL_TO_ID["<unk>"]]

    dense_feats = [
        float(years_experience) / 10.0,  # Scaled ~0..1
        float(education_tier) / 4.0,
        float(prev_roles_count) / 5.0,
        float(match_intent),
    ]
    return skill_ids, dense_feats


def featurize_job(
    required_skills: List[str],
    min_experience: float = 0.0,
    seniority_tier: int = 2,  # 1: Junior, 2: Mid, 3: Senior, 4: Staff/Lead
    salary_band: float = 0.5,
) -> Tuple[List[int], List[float]]:
    """
    Returns (skill_ids, dense_features)
    """
    skill_ids = [get_or_create_skill_id(s) for s in required_skills]
    if not skill_ids:
        skill_ids = [SKILL_TO_ID["<unk>"]]

    dense_feats = [
        float(min_experience) / 10.0,
        float(seniority_tier) / 4.0,
        float(salary_band),
    ]
    return skill_ids, dense_feats


# Sample Triplet Training Data: (Candidate, Positive Job, Negative Job)
SAMPLE_MATCHING_TRIPLETS = [
    # 1. Senior Backend (Python/FastAPI/Postgres)
    (
        {"skills": ["python", "fastapi", "postgresql", "docker", "aws"], "exp": 4.5, "edu": 2, "roles": 2},
        {"skills": ["python", "fastapi", "postgresql", "docker"], "min_exp": 3.0, "seniority": 2, "sal": 0.7},  # Pos
        {"skills": ["react", "typescript", "tailwind css", "figma"], "min_exp": 3.0, "seniority": 2, "sal": 0.6}, # Neg
    ),
    # 2. Frontend Specialist (React/TypeScript/Next.js)
    (
        {"skills": ["react", "typescript", "next.js", "tailwind css", "html5"], "exp": 3.0, "edu": 2, "roles": 2},
        {"skills": ["react", "typescript", "next.js", "tailwind css"], "min_exp": 2.5, "seniority": 2, "sal": 0.6},
        {"skills": ["pytorch", "tensorflow", "scikit-learn", "nlp"], "min_exp": 4.0, "seniority": 3, "sal": 0.8},
    ),
    # 3. AI / ML Engineer (PyTorch/NLP/Python)
    (
        {"skills": ["python", "pytorch", "huggingface", "nlp", "docker"], "exp": 3.5, "edu": 3, "roles": 2},
        {"skills": ["python", "pytorch", "nlp", "transformers", "docker"], "min_exp": 3.0, "seniority": 2, "sal": 0.85},
        {"skills": ["java", "spring boot", "mysql", "angular"], "min_exp": 5.0, "seniority": 3, "sal": 0.7},
    ),
    # 4. DevOps / Cloud Architect
    (
        {"skills": ["kubernetes", "docker", "terraform", "aws", "ci/cd", "linux"], "exp": 6.0, "edu": 2, "roles": 3},
        {"skills": ["kubernetes", "terraform", "aws", "docker"], "min_exp": 5.0, "seniority": 3, "sal": 0.9},
        {"skills": ["html5", "css3", "javascript", "react"], "min_exp": 1.0, "seniority": 1, "sal": 0.4},
    ),
    # 5. Full Stack Developer (Node/React/Mongo)
    (
        {"skills": ["javascript", "typescript", "react", "node.js", "mongodb"], "exp": 2.5, "edu": 2, "roles": 1},
        {"skills": ["typescript", "react", "node.js", "mongodb"], "min_exp": 2.0, "seniority": 2, "sal": 0.55},
        {"skills": ["c++", "linux", "embedded", "rust"], "min_exp": 4.0, "seniority": 3, "sal": 0.75},
    ),
]


class MatchingTripletDataset(Dataset):
    def __init__(self, triplets: List[Tuple[Dict, Dict, Dict]] = SAMPLE_MATCHING_TRIPLETS):
        self.triplets = triplets

    def __len__(self):
        return len(self.triplets)

    def __getitem__(self, idx: int):
        cand, pos_job, neg_job = self.triplets[idx]
        c_skills, c_dense = featurize_candidate(cand["skills"], cand.get("exp", 2.0), cand.get("edu", 2), cand.get("roles", 1))
        p_skills, p_dense = featurize_job(pos_job["skills"], pos_job.get("min_exp", 2.0), pos_job.get("seniority", 2), pos_job.get("sal", 0.5))
        n_skills, n_dense = featurize_job(neg_job["skills"], neg_job.get("min_exp", 2.0), neg_job.get("seniority", 2), neg_job.get("sal", 0.5))
        return (c_skills, c_dense), (p_skills, p_dense), (n_skills, n_dense)


def collate_triplets(batch):
    """
    Collate variable-length skill ID lists into flattened tensors + offsets for EmbeddingBag.
    """
    def pack_tower_data(items):
        skill_ids_list = []
        offsets = []
        dense_list = []
        current_offset = 0

        for s_ids, dense in items:
            offsets.append(current_offset)
            skill_ids_list.extend(s_ids)
            current_offset += len(s_ids)
            dense_list.append(dense)

        return (
            torch.tensor(skill_ids_list, dtype=torch.long),
            torch.tensor(offsets, dtype=torch.long),
            torch.tensor(dense_list, dtype=torch.float32),
        )

    cand_items = [b[0] for b in batch]
    pos_items = [b[1] for b in batch]
    neg_items = [b[2] for b in batch]

    cand_tensors = pack_tower_data(cand_items)
    pos_tensors = pack_tower_data(pos_items)
    neg_tensors = pack_tower_data(neg_items)

    return cand_tensors, pos_tensors, neg_tensors
