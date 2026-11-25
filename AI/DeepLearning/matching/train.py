"""
Training script for the Custom Two-Tower DSSM Candidate-Job Matching Model.
Trains using Triplet Margin Loss to pull matched candidate-job pairs close together in
the 64-D latent space while pushing mismatched pairs apart.
"""

import os
import json
import torch
import torch.optim as optim
from torch.utils.data import DataLoader
from typing import Tuple

from .model import HireSenseTwoTowerMatcher
from .dataset import (
    SKILL_TO_ID,
    MatchingTripletDataset,
    collate_triplets,
)


def train_matching_model(
    epochs: int = 50,
    batch_size: int = 4,
    lr: float = 0.003,
    margin: float = 0.3,
    save_dir: str = None,
) -> Tuple[HireSenseTwoTowerMatcher, dict]:
    if save_dir is None:
        save_dir = os.path.dirname(os.path.abspath(__file__))

    os.makedirs(save_dir, exist_ok=True)

    # 1. Save skill dictionary
    skills_path = os.path.join(save_dir, "skills.json")
    with open(skills_path, "w", encoding="utf-8") as f:
        json.dump(SKILL_TO_ID, f, indent=2)

    # 2. Prepare Dataset and DataLoader
    dataset = MatchingTripletDataset()
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, collate_fn=collate_triplets)

    # 3. Instantiate Two-Tower Matcher
    model = HireSenseTwoTowerMatcher(num_skills=len(SKILL_TO_ID), latent_dim=64, dropout=0.15)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-5)

    print(f"[*] Training Two-Tower DSSM on {len(dataset)} triplet examples...")
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for cand_t, pos_t, neg_t in dataloader:
            optimizer.zero_grad()
            loss = model.compute_triplet_loss(cand_t, pos_t, neg_t, margin=margin)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        scheduler.step()
        if epoch % 10 == 0 or epoch == epochs:
            avg_loss = total_loss / len(dataloader)
            print(f"    Epoch {epoch:02d}/{epochs:02d} - Triplet Loss: {avg_loss:.4f}")

    # 4. Save checkpoint
    checkpoint_path = os.path.join(save_dir, "two_tower_checkpoint.pt")
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "num_skills": len(SKILL_TO_ID),
            "latent_dim": 64,
        },
        checkpoint_path,
    )
    print(f"[✓] Two-Tower checkpoint saved at {checkpoint_path}")

    return model, SKILL_TO_ID


if __name__ == "__main__":
    train_matching_model()
