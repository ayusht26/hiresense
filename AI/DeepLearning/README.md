# HireSense Deep Learning Engine

This package contains proprietary, custom-engineered PyTorch neural networks built specifically for **HireSense**:
1. **Model B: BiLSTM-CRF Resume NER** (Sub-15ms explainable entity and skill extraction).
2. **Model A: Two-Tower DSSM Matcher** (Sub-5ms dual-encoder candidate-job compatibility scoring).
3. **Integrated Pipeline & FastAPI Endpoints** for end-to-end resume structuring and matching.

---

## 1. Directory Structure

```
AI/DeepLearning/
├── __init__.py                 # Package exports & Windows/Anaconda runtime setup
├── pipeline.py                 # End-to-end recruitment pipeline (NER + Normalization + Matching)
├── test_pipeline.py            # Automated test suite and latency benchmark
├── ner/                        # Model B: Named Entity Recognition
│   ├── crf.py                  # Linear-Chain CRF (forward algorithm, Viterbi decoding, NLL loss)
│   ├── model.py                # BiLSTM_CRF architecture with Char-CNN + Word Embeddings
│   ├── dataset.py              # BIO schema, Vocabulary manager, collation & padding
│   ├── train.py                # Training script with AdamW & Cosine Annealing
│   ├── inference.py            # ResumeNERExtractor: generates structured spans with char offsets
│   ├── bilstm_crf_checkpoint.pt# Saved model weights (~15MB)
│   └── vocab.json              # Saved token and character mappings
└── matching/                   # Model A: Two-Tower DSSM
    ├── model.py                # CandidateTower, JobTower, and HireSenseTwoTowerMatcher
    ├── dataset.py              # Triplet dataset, skill vocabulary, and dense featurizer
    ├── train.py                # Triplet Margin Loss training loop
    ├── inference.py            # TwoTowerMatcherService: vector encoding and 0-100 scoring
    ├── two_tower_checkpoint.pt # Saved model weights
    └── skills.json             # Skill catalog index mapping
```

---

## 2. Model B: Custom BiLSTM-CRF for Resume NER

### Architecture
* **Input**: Raw resume sentences or parsed PDF text chunks.
* **Embedding Layer**:
  * Word Embeddings ($D=64$).
  * Character-level CNN ($D=24$) using 1D convolutions over word characters to handle out-of-vocabulary technical jargon (`Next.js`, `Kubernetes`, `PostgreSQL`).
* **Sequence Encoder**: Bidirectional LSTM ($H=64$), capturing preceding and following syntactic context (e.g. distinguishing `"Go"` as a language vs. a verb).
* **Decoder**: Linear-Chain Conditional Random Field (`LinearChainCRF`) enforcing BIO grammar:
  * Transitions to invalid tag sequences (e.g. `O` $\to$ `I-SKILL`) are strictly penalized ($-10,000$).
  * Optimal tag sequence decoded using the **Viterbi algorithm**.

### Output
Returns extracted skills, educational institutions, and job experiences along with **exact character offsets** (`start`, `end`), powering the clickable evidence links in HireSense's recruiter reports.

---

## 3. Model A: Custom Two-Tower DSSM Matcher

### Architecture
* **Candidate Tower**:
  * `nn.EmbeddingBag` over candidate skills.
  * Dense MLP projection for `[years_experience, education_tier, prev_roles_count, match_intent]`.
  * Multi-layer projection head with LayerNorm, GELU, and Dropout $\to$ $L_2$-normalized 64-D vector $\mathbf{u}$.
* **Job Tower**:
  * `nn.EmbeddingBag` over required and preferred job skills.
  * Dense MLP projection for `[min_experience, seniority_tier, salary_band]`.
  * Multi-layer projection head with LayerNorm, GELU, and Dropout $\to$ $L_2$-normalized 64-D vector $\mathbf{v}$.
* **Scoring**:
  * Normalized dot product (Cosine Similarity): $\cos(\mathbf{u}, \mathbf{v}) \in [-1, 1]$.
  * Scaled compatibility metric: $\text{Score} = (\cos + 1.0) \times 50.0 \in [0, 100]$.
* **Training Objective**: **Triplet Margin Loss** pulling relevant candidate-job pairs together while pushing mismatched pairs outside a margin $\alpha = 0.3$.

---

## 4. Benchmark Performance

Measured on a standard CPU workstation:
* **BiLSTM-CRF NER Latency**: **~10 ms** per sentence (~25 ms for full standard resume).
* **Two-Tower DSSM Pair Scoring**: **~2.3 ms** per candidate-job pair.
* **Batch Ranking**: 1,000 candidates ranked against a job in **< 15 ms** via vectorized matrix multiplication.

---

## 5. FastAPI Endpoints

The deep learning models are exposed via `AI/main.py`:

### `POST /api/deep-learning/extract-entities`
```json
{
  "text": "Senior Backend Engineer with 5 years experience in React and TypeScript. Graduated from IIT Bombay."
}
```
**Response**:
```json
{
  "skills": ["React", "TypeScript"],
  "colleges": ["IIT Bombay"],
  "experience": ["Senior Backend Engineer", "5 years experience"],
  "entities": [
    { "text": "Senior Backend Engineer", "label": "EXPERIENCE", "start": 0, "end": 23 },
    { "text": "React", "label": "SKILL", "start": 51, "end": 56 }
  ]
}
```

### `POST /api/deep-learning/match`
```json
{
  "candidate": {
    "skills": ["python", "fastapi", "postgresql", "docker"],
    "years_experience": 4.0,
    "education_tier": 2
  },
  "job": {
    "required_skills": ["python", "fastapi", "postgresql"],
    "min_experience": 3.0,
    "seniority_tier": 2
  }
}
```
**Response**:
```json
{
  "score": 87.7,
  "cosine_similarity": 0.7539,
  "fit_verdict": "Strong Fit",
  "matched_skills": ["fastapi", "postgresql", "python"],
  "missing_skills": []
}
```

### `POST /api/deep-learning/pipeline-match`
Combines resume text parsing, alias normalization, and two-tower scoring into a single unified API call.

---

## 6. How to Run Tests and Re-train

To run the verification suite:
```bash
python -m AI.DeepLearning.test_pipeline
```

To re-train the models with custom or larger datasets:
```bash
python -m AI.DeepLearning.ner.train
python -m AI.DeepLearning.matching.train
```
