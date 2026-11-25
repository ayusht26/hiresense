"""
HireSense Deep Learning Package
Contains custom-engineered, proprietary neural networks for recruitment:
- NER (BiLSTM-CRF): Resume token classification & skill/entity extraction with explainable spans.
- Matching (Two-Tower DSSM): Deep semantic candidate-to-job matching network in shared latent space.
"""

import os
# Prevent OpenMP duplicate initialization issue on Windows/Anaconda
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from .ner import BiLSTM_CRF, ResumeNERExtractor
from .matching import HireSenseTwoTowerMatcher, TwoTowerMatcherService
from .pipeline import ResumeJobDeepLearningPipeline

__all__ = [
    "BiLSTM_CRF",
    "ResumeNERExtractor",
    "HireSenseTwoTowerMatcher",
    "TwoTowerMatcherService",
    "ResumeJobDeepLearningPipeline",
]
