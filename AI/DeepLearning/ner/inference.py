"""
Inference engine for Resume Named Entity Recognition (BiLSTM-CRF).
Loads weights, executes Viterbi decoding, and reconstructs structured entities
with exact character spans for explainable UI evidence linking.
"""

import os
import json
import torch
from typing import List, Dict, Any, Optional

from .model import BiLSTM_CRF
from .dataset import (
    TAG_TO_ID,
    ID_TO_TAG,
    Vocabulary,
    tokenize_resume_sentence,
)


class ResumeNERExtractor:
    def __init__(self, model_dir: Optional[str] = None):
        if model_dir is None:
            model_dir = os.path.dirname(os.path.abspath(__file__))

        self.model_dir = model_dir
        self.checkpoint_path = os.path.join(model_dir, "bilstm_crf_checkpoint.pt")
        self.vocab_path = os.path.join(model_dir, "vocab.json")

        self.vocab = Vocabulary()
        self.model: Optional[BiLSTM_CRF] = None
        self._ensure_initialized()

    def _ensure_initialized(self):
        """Loads trained weights and vocab, or trains a baseline model if not yet trained."""
        if not os.path.exists(self.checkpoint_path) or not os.path.exists(self.vocab_path):
            from .train import train_ner_model
            print("[*] No existing NER checkpoint found. Training initial baseline...")
            self.model, self.vocab = train_ner_model(save_dir=self.model_dir)
            return

        # Load Vocabulary
        with open(self.vocab_path, "r", encoding="utf-8") as f:
            v_data = json.load(f)
            self.vocab.word2id = v_data["word2id"]
            self.vocab.id2word = {int(k): v for k, v in v_data.get("id2word", {}).items()}
            self.vocab.char2id = v_data["char2id"]

        # Load Model
        checkpoint = torch.load(self.checkpoint_path, map_location=torch.device("cpu"), weights_only=True)
        self.model = BiLSTM_CRF(
            vocab_size=checkpoint["vocab_size"],
            tag_to_id=TAG_TO_ID,
            word_emb_dim=64,
            char_vocab_size=len(self.vocab.char2id) + 10,
            char_emb_dim=20,
            char_out_dim=24,
            hidden_dim=64,
            num_layers=1,
            dropout=0.0,
            use_char_cnn=True,
        )
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Scans raw text and returns extracted entities with exact character offsets.
        Example return:
        [
          {"text": "PostgreSQL", "label": "SKILL", "start": 42, "end": 52},
          {"text": "IIT Bombay", "label": "COLLEGE", "start": 65, "end": 75}
        ]
        """
        if not text or not text.strip():
            return []

        tokens_with_spans = tokenize_resume_sentence(text)
        if not tokens_with_spans:
            return []

        tokens = [t[0] for t in tokens_with_spans]
        word_ids = [self.vocab.word_to_id(w) for w in tokens]

        # Character tensor
        max_word_len = 20
        char_ids = []
        for w in tokens:
            w_chars = [self.vocab.char_to_id(c) for c in w[:max_word_len]]
            w_chars += [0] * (max_word_len - len(w_chars))
            char_ids.append(w_chars)

        words_tensor = torch.tensor([word_ids], dtype=torch.long)
        chars_tensor = torch.tensor([char_ids], dtype=torch.long)
        mask = torch.ones((1, len(tokens)), dtype=torch.bool)

        self.model.eval()
        with torch.no_grad():
            best_paths = self.model.decode(words_tensor, mask, chars_tensor)

        predicted_tags = [ID_TO_TAG[tag_id] for tag_id in best_paths[0]]

        # Assemble spans from BIO sequence
        entities: List[Dict[str, Any]] = []
        current_entity: Optional[Dict[str, Any]] = None

        for (token_str, start, end), tag in zip(tokens_with_spans, predicted_tags):
            if tag.startswith("B-"):
                if current_entity:
                    entities.append(current_entity)
                ent_type = tag.split("-")[1]
                current_entity = {
                    "text": token_str,
                    "label": ent_type,
                    "start": start,
                    "end": end,
                }
            elif tag.startswith("I-"):
                ent_type = tag.split("-")[1]
                if current_entity and current_entity["label"] == ent_type:
                    # Extend current entity
                    current_entity["text"] = text[current_entity["start"]:end]
                    current_entity["end"] = end
                else:
                    if current_entity:
                        entities.append(current_entity)
                    current_entity = {
                        "text": token_str,
                        "label": ent_type,
                        "start": start,
                        "end": end,
                    }
            else:  # "O" or padding
                if current_entity:
                    entities.append(current_entity)
                    current_entity = None

        if current_entity:
            entities.append(current_entity)

        return entities

    def extract_structured_summary(self, text: str) -> Dict[str, List[str]]:
        """
        Convenience method to return unique extracted skills, colleges, and experience.
        """
        entities = self.extract_entities(text)
        skills = []
        colleges = []
        experience = []

        for ent in entities:
            clean_text = ent["text"].strip(" ,.;:")
            if not clean_text:
                continue
            if ent["label"] == "SKILL" and clean_text not in skills:
                skills.append(clean_text)
            elif ent["label"] == "COLLEGE" and clean_text not in colleges:
                colleges.append(clean_text)
            elif ent["label"] == "EXPERIENCE" and clean_text not in experience:
                experience.append(clean_text)

        return {
            "skills": skills,
            "colleges": colleges,
            "experience": experience,
            "raw_entities": entities,
        }
