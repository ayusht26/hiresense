"""
Custom Two-Tower DSSM (Deep Structured Semantic Model) for Candidate-Job Matching.
Projects heterogeneous candidate and job requirements into a shared L2-normalized 64-D embedding space.
Inference: Dot product of normalized vectors (<5ms) yielding a 0-100 compatibility score.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Dict, Any, Optional


class CandidateTower(nn.Module):
    """
    Candidate Deep Tower:
    Encodes bag-of-skills and continuous experience/education features into an L2-normalized vector.
    """
    def __init__(
        self,
        num_skills: int,
        skill_emb_dim: int = 64,
        dense_in_dim: int = 4,  # [years_experience, education_tier, prev_roles_count, match_intent]
        dense_hidden_dim: int = 32,
        latent_dim: int = 64,
        dropout: float = 0.2,
    ):
        super(CandidateTower, self).__init__()
        self.skill_embeddings = nn.EmbeddingBag(
            num_embeddings=num_skills,
            embedding_dim=skill_emb_dim,
            mode="mean",
            padding_idx=0,
        )
        self.dense_fc = nn.Sequential(
            nn.Linear(dense_in_dim, dense_hidden_dim),
            nn.LayerNorm(dense_hidden_dim),
            nn.GELU(),
        )
        self.fusion = nn.Sequential(
            nn.Linear(skill_emb_dim + dense_hidden_dim, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(128, latent_dim),
        )

    def forward(
        self,
        skill_ids: torch.Tensor,
        offsets: torch.Tensor,
        dense_feats: torch.Tensor,
    ) -> torch.Tensor:
        """
        skill_ids: [total_skills_in_batch]
        offsets: [batch_size]
        dense_feats: [batch_size, dense_in_dim]
        Returns: [batch_size, latent_dim] (L2-normalized)
        """
        s_emb = self.skill_embeddings(skill_ids, offsets)
        d_emb = self.dense_fc(dense_feats)
        combined = torch.cat([s_emb, d_emb], dim=1)
        latent = self.fusion(combined)
        return F.normalize(latent, p=2, dim=1)


class JobTower(nn.Module):
    """
    Job Requirement Deep Tower:
    Encodes mandatory/preferred skills and role requirements into the same L2-normalized 64-D space.
    """
    def __init__(
        self,
        num_skills: int,
        skill_emb_dim: int = 64,
        dense_in_dim: int = 3,  # [min_experience, job_seniority_tier, salary_band]
        dense_hidden_dim: int = 32,
        latent_dim: int = 64,
        dropout: float = 0.2,
    ):
        super(JobTower, self).__init__()
        self.skill_embeddings = nn.EmbeddingBag(
            num_embeddings=num_skills,
            embedding_dim=skill_emb_dim,
            mode="mean",
            padding_idx=0,
        )
        self.dense_fc = nn.Sequential(
            nn.Linear(dense_in_dim, dense_hidden_dim),
            nn.LayerNorm(dense_hidden_dim),
            nn.GELU(),
        )
        self.fusion = nn.Sequential(
            nn.Linear(skill_emb_dim + dense_hidden_dim, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(128, latent_dim),
        )

    def forward(
        self,
        skill_ids: torch.Tensor,
        offsets: torch.Tensor,
        dense_feats: torch.Tensor,
    ) -> torch.Tensor:
        """
        skill_ids: [total_skills_in_batch]
        offsets: [batch_size]
        dense_feats: [batch_size, dense_in_dim]
        Returns: [batch_size, latent_dim] (L2-normalized)
        """
        s_emb = self.skill_embeddings(skill_ids, offsets)
        d_emb = self.dense_fc(dense_feats)
        combined = torch.cat([s_emb, d_emb], dim=1)
        latent = self.fusion(combined)
        return F.normalize(latent, p=2, dim=1)


class HireSenseTwoTowerMatcher(nn.Module):
    """
    End-to-End Two-Tower DSSM for candidate-job compatibility scoring.
    """
    def __init__(
        self,
        num_skills: int,
        latent_dim: int = 64,
        dropout: float = 0.2,
    ):
        super(HireSenseTwoTowerMatcher, self).__init__()
        self.num_skills = num_skills
        self.latent_dim = latent_dim

        self.candidate_tower = CandidateTower(
            num_skills=num_skills,
            skill_emb_dim=64,
            dense_in_dim=4,
            dense_hidden_dim=32,
            latent_dim=latent_dim,
            dropout=dropout,
        )
        self.job_tower = JobTower(
            num_skills=num_skills,
            skill_emb_dim=64,
            dense_in_dim=3,
            dense_hidden_dim=32,
            latent_dim=latent_dim,
            dropout=dropout,
        )

        # Temperature parameter for contrastive learning
        self.temperature = nn.Parameter(torch.ones([]) * 0.07)

    def encode_candidate(
        self, skill_ids: torch.Tensor, offsets: torch.Tensor, dense_feats: torch.Tensor
    ) -> torch.Tensor:
        return self.candidate_tower(skill_ids, offsets, dense_feats)

    def encode_job(
        self, skill_ids: torch.Tensor, offsets: torch.Tensor, dense_feats: torch.Tensor
    ) -> torch.Tensor:
        return self.job_tower(skill_ids, offsets, dense_feats)

    def forward(
        self,
        cand_inputs: Tuple[torch.Tensor, torch.Tensor, torch.Tensor],
        job_inputs: Tuple[torch.Tensor, torch.Tensor, torch.Tensor],
    ) -> torch.Tensor:
        """
        Computes pairwise compatibility score in [0, 100].
        """
        u = self.encode_candidate(*cand_inputs)  # [B, D]
        v = self.encode_job(*job_inputs)        # [B, D]
        # Cosine similarity for unit vectors: sum(u * v, dim=-1) in [-1, 1]
        cosine_sim = torch.sum(u * v, dim=1)
        # Scaled to 0..100
        score = (cosine_sim + 1.0) * 50.0
        return torch.clamp(score, 0.0, 100.0)

    def compute_triplet_loss(
        self,
        cand_inputs: Tuple[torch.Tensor, torch.Tensor, torch.Tensor],
        pos_job_inputs: Tuple[torch.Tensor, torch.Tensor, torch.Tensor],
        neg_job_inputs: Tuple[torch.Tensor, torch.Tensor, torch.Tensor],
        margin: float = 0.25,
    ) -> torch.Tensor:
        """
        Triplet Margin Loss:
        L = max(0, ||u - v_pos||^2 - ||u - v_neg||^2 + margin)
        """
        u = self.encode_candidate(*cand_inputs)
        v_pos = self.encode_job(*pos_job_inputs)
        v_neg = self.encode_job(*neg_job_inputs)

        pos_dist = torch.sum((u - v_pos) ** 2, dim=1)
        neg_dist = torch.sum((u - v_neg) ** 2, dim=1)
        loss = F.relu(pos_dist - neg_dist + margin)
        return torch.mean(loss)
