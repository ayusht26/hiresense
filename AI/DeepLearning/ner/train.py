"""
Training script for the Custom BiLSTM-CRF Resume NER Model.
Trains on annotated resume sentences, validates loss, and saves model checkpoints + vocabulary.
"""

import os
import json
import torch
import torch.optim as optim
from torch.utils.data import DataLoader
from typing import Dict, Any, Tuple

from .crf import LinearChainCRF
from .model import BiLSTM_CRF
from .dataset import (
    TAG_TO_ID,
    ID_TO_TAG,
    SAMPLE_RESUME_TRAINING_DATA,
    Vocabulary,
    ResumeNERDataset,
    pad_collate_fn,
    tokenize_resume_sentence,
)


def train_ner_model(
    epochs: int = 40,
    batch_size: int = 4,
    lr: float = 0.015,
    crf_lr: float = 0.05,
    save_dir: str = None,
) -> Tuple[BiLSTM_CRF, Vocabulary]:
    if save_dir is None:
        save_dir = os.path.dirname(os.path.abspath(__file__))

    os.makedirs(save_dir, exist_ok=True)

    # 1. Build Vocabulary from training tokens
    vocab = Vocabulary()
    tokenized_sentences = []
    for sent, _ in SAMPLE_RESUME_TRAINING_DATA:
        tokens = [t[0] for t in tokenize_resume_sentence(sent)]
        tokenized_sentences.append(tokens)
    vocab.build_vocab_from_sentences(tokenized_sentences)

    # Save vocab mapping for inference
    vocab_path = os.path.join(save_dir, "vocab.json")
    with open(vocab_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "word2id": vocab.word2id,
                "char2id": vocab.char2id,
                "tag2id": TAG_TO_ID,
            },
            f,
            indent=2,
        )

    # 2. Prepare DataLoader
    dataset = ResumeNERDataset(SAMPLE_RESUME_TRAINING_DATA, vocab)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, collate_fn=pad_collate_fn)

    # 3. Instantiate BiLSTM-CRF
    model = BiLSTM_CRF(
        vocab_size=len(vocab),
        tag_to_id=TAG_TO_ID,
        word_emb_dim=64,
        char_vocab_size=len(vocab.char2id) + 10,
        char_emb_dim=20,
        char_out_dim=24,
        hidden_dim=64,
        num_layers=1,
        dropout=0.2,
        use_char_cnn=True,
    )

    # 4. Optimizer with differential learning rates for LSTM vs CRF transitions
    crf_params = list(model.crf.parameters())
    lstm_params = [p for p in model.parameters() if not any(p is cp for cp in crf_params)]

    optimizer = optim.AdamW(
        [
            {"params": lstm_params, "lr": lr, "weight_decay": 1e-4},
            {"params": crf_params, "lr": crf_lr, "weight_decay": 0.0},
        ]
    )
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-4)

    print(f"[*] Training Custom BiLSTM-CRF on {len(dataset)} resume examples...")
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for words, tags, chars, mask in dataloader:
            optimizer.zero_grad()
            loss = model.forward_loss(words, tags, mask, chars)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            optimizer.step()
            total_loss += loss.item()

        scheduler.step()
        if epoch % 10 == 0 or epoch == epochs:
            avg_loss = total_loss / len(dataloader)
            print(f"    Epoch {epoch:02d}/{epochs:02d} - NLL Loss: {avg_loss:.4f}")

    # 5. Save model checkpoint
    checkpoint_path = os.path.join(save_dir, "bilstm_crf_checkpoint.pt")
    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "vocab_size": len(vocab),
            "tag_to_id": TAG_TO_ID,
        },
        checkpoint_path,
    )
    print(f"[✓] Checkpoint saved successfully at {checkpoint_path}")

    return model, vocab


if __name__ == "__main__":
    train_ner_model()
