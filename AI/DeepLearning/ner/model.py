"""
BiLSTM-CRF Neural Architecture for Resume Skill & Entity Extraction.
Combines:
  1. Word embeddings + Character-level CNN representations (for OOV technical terms like Next.js, PyTorch).
  2. Bidirectional LSTM for two-way context encoding.
  3. Linear projection to emission scores.
  4. LinearChainCRF for grammar-enforced sequence decoding.
"""

import torch
import torch.nn as nn
from typing import List, Tuple, Dict, Optional
from .crf import LinearChainCRF


class CharCNNEmbedding(nn.Module):
    """
    Extracts morphological and subword features for out-of-vocabulary technical skills
    (e.g., 'PostgreSQL', 'Kubernetes', 'FastAPI') using 1D character convolutions.
    """
    def __init__(self, num_chars: int, char_dim: int = 25, out_channels: int = 30, kernel_size: int = 3):
        super(CharCNNEmbedding, self).__init__()
        self.char_embed = nn.Embedding(num_chars, char_dim, padding_idx=0)
        self.conv = nn.Conv1d(
            in_channels=char_dim,
            out_channels=out_channels,
            kernel_size=kernel_size,
            padding=kernel_size // 2,
        )
        self.relu = nn.ReLU()

    def forward(self, chars: torch.Tensor) -> torch.Tensor:
        """
        chars: [batch_size, seq_len, max_word_len]
        Returns: [batch_size, seq_len, out_channels]
        """
        batch_size, seq_len, max_word_len = chars.shape
        # Flatten batch and seq dimensions for 1D conv
        x = chars.view(batch_size * seq_len, max_word_len)  # [B*T, W]
        x_emb = self.char_embed(x).transpose(1, 2)  # [B*T, char_dim, W]
        x_conv = self.relu(self.conv(x_emb))  # [B*T, out_channels, W]
        # Max pool over character dimension
        x_pool, _ = torch.max(x_conv, dim=2)  # [B*T, out_channels]
        return x_pool.view(batch_size, seq_len, -1)  # [B, T, out_channels]


class BiLSTM_CRF(nn.Module):
    def __init__(
        self,
        vocab_size: int,
        tag_to_id: Dict[str, int],
        word_emb_dim: int = 100,
        char_vocab_size: int = 128,
        char_emb_dim: int = 25,
        char_out_dim: int = 30,
        hidden_dim: int = 128,
        num_layers: int = 1,
        dropout: float = 0.25,
        use_char_cnn: bool = True,
    ):
        super(BiLSTM_CRF, self).__init__()
        self.vocab_size = vocab_size
        self.tag_to_id = tag_to_id
        self.id_to_tag = {v: k for k, v in tag_to_id.items()}
        self.num_tags = len(tag_to_id)
        self.use_char_cnn = use_char_cnn
        self.hidden_dim = hidden_dim

        # Word embeddings
        self.word_embeddings = nn.Embedding(vocab_size, word_emb_dim, padding_idx=0)

        # Character CNN feature extractor
        if self.use_char_cnn:
            self.char_cnn = CharCNNEmbedding(
                num_chars=char_vocab_size,
                char_dim=char_emb_dim,
                out_channels=char_out_dim,
                kernel_size=3,
            )
            input_dim = word_emb_dim + char_out_dim
        else:
            input_dim = word_emb_dim

        self.dropout = nn.Dropout(dropout)

        # Bidirectional LSTM
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim // 2,
            num_layers=num_layers,
            bidirectional=True,
            batch_first=True,
        )

        # Linear projection to emission scores for each tag
        self.hidden_to_tag = nn.Linear(hidden_dim, self.num_tags)

        # Linear-Chain Conditional Random Field
        self.crf = LinearChainCRF(
            num_tags=self.num_tags,
            start_tag_id=self.tag_to_id["<START>"],
            stop_tag_id=self.tag_to_id["<STOP>"],
        )

    def _get_lstm_emissions(
        self,
        words: torch.Tensor,
        chars: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        words: [batch_size, seq_len]
        chars: [batch_size, seq_len, max_word_len] (optional)
        Returns emissions: [seq_len, batch_size, num_tags]
        """
        w_emb = self.word_embeddings(words)
        if self.use_char_cnn and chars is not None:
            c_emb = self.char_cnn(chars)
            x = torch.cat([w_emb, c_emb], dim=2)
        else:
            x = w_emb

        x = self.dropout(x)
        lstm_out, _ = self.lstm(x)  # [batch_size, seq_len, hidden_dim]
        lstm_out = self.dropout(lstm_out)

        emissions = self.hidden_to_tag(lstm_out)  # [batch_size, seq_len, num_tags]
        # Transpose to [seq_len, batch_size, num_tags] for CRF
        return emissions.transpose(0, 1)

    def forward_loss(
        self,
        words: torch.Tensor,
        tags: torch.Tensor,
        mask: torch.Tensor,
        chars: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """
        Calculates Negative Log-Likelihood loss on batch.
        """
        emissions = self._get_lstm_emissions(words, chars)
        mask_t = mask.transpose(0, 1)  # [seq_len, batch_size]
        tags_t = tags.transpose(0, 1)  # [seq_len, batch_size]
        return self.crf.forward_loss(emissions, tags_t, mask_t)

    def decode(
        self,
        words: torch.Tensor,
        mask: torch.Tensor,
        chars: Optional[torch.Tensor] = None,
    ) -> List[List[int]]:
        """
        Viterbi decode highest probability tag sequences.
        """
        emissions = self._get_lstm_emissions(words, chars)
        mask_t = mask.transpose(0, 1)
        return self.crf.decode(emissions, mask_t)
