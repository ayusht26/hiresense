"""
Linear-Chain Conditional Random Field (CRF) in Pure PyTorch.
Enforces sequential transition dynamics (e.g. I-SKILL cannot follow O without B-SKILL).
Provides:
  - forward_alg: Log-sum-exp partition function computation
  - score_sentence: Score of the ground-truth sequence
  - loss: Negative log-likelihood = log Z(x) - score(x, y)
  - decode: Viterbi dynamic programming optimal path search
"""

import torch
import torch.nn as nn
from typing import List, Tuple, Optional


class LinearChainCRF(nn.Module):
    def __init__(self, num_tags: int, start_tag_id: int, stop_tag_id: int):
        super(LinearChainCRF, self).__init__()
        self.num_tags = num_tags
        self.start_tag_id = start_tag_id
        self.stop_tag_id = stop_tag_id

        # transitions[i, j] represents the score of transitioning FROM tag j TO tag i
        self.transitions = nn.Parameter(torch.empty(num_tags, num_tags))
        self.reset_parameters()

    def reset_parameters(self):
        # Initialize uniformly around 0
        nn.init.uniform_(self.transitions, -0.1, 0.1)
        # Enforce structural constraints:
        # 1. Impossible to transition TO the start tag
        self.transitions.data[self.start_tag_id, :] = -10000.0
        # 2. Impossible to transition FROM the stop tag
        self.transitions.data[:, self.stop_tag_id] = -10000.0

    def _forward_alg(self, emissions: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        """
        Computes the log-sum-exp partition function log Z(x) across all possible tag sequences.
        emissions: [seq_len, batch_size, num_tags]
        mask:      [seq_len, batch_size] (boolean)
        Returns:   [batch_size] total log-partition scores
        """
        seq_len, batch_size, num_tags = emissions.shape

        # Initialize forward variables in log space
        init_alphas = torch.full((batch_size, num_tags), -10000.0, device=emissions.device)
        init_alphas[:, self.start_tag_id] = 0.0
        forward_var = init_alphas

        for i in range(seq_len):
            emit_score = emissions[i]  # [batch_size, num_tags]
            mask_i = mask[i].unsqueeze(1)  # [batch_size, 1]

            # Broadcast: forward_var is [batch_size, 1, num_tags] (from tag)
            # transitions is [1, num_tags, num_tags] (to_tag, from_tag)
            # emit_score is [batch_size, num_tags, 1] (to tag)
            # next_tag_var: [batch_size, to_tag, from_tag]
            next_tag_var = (
                forward_var.unsqueeze(1)
                + self.transitions.unsqueeze(0)
                + emit_score.unsqueeze(2)
            )

            # Sum over previous tags (from_tag) in log space
            alpha_t = torch.logsumexp(next_tag_var, dim=2)  # [batch_size, num_tags]

            # If token is masked (padding), keep previous forward_var
            forward_var = torch.where(mask_i, alpha_t, forward_var)

        # Transition to STOP tag
        terminal_vars = forward_var + self.transitions[self.stop_tag_id].unsqueeze(0)
        alpha = torch.logsumexp(terminal_vars, dim=1)
        return alpha

    def _score_sentence(
        self, emissions: torch.Tensor, tags: torch.Tensor, mask: torch.Tensor
    ) -> torch.Tensor:
        """
        Computes the score of the ground-truth sequence.
        emissions: [seq_len, batch_size, num_tags]
        tags:      [seq_len, batch_size] (ground truth tag ids)
        mask:      [seq_len, batch_size]
        """
        seq_len, batch_size, _ = emissions.shape
        score = torch.zeros(batch_size, device=emissions.device)

        # Prepend START tag to tags sequence
        padded_tags = torch.cat(
            [torch.full((1, batch_size), self.start_tag_id, dtype=torch.long, device=tags.device), tags],
            dim=0,
        )

        for i in range(seq_len):
            mask_i = mask[i]
            cur_tag = tags[i]
            prev_tag = padded_tags[i]

            # Transition from prev_tag to cur_tag
            trans_score = self.transitions[cur_tag, prev_tag]
            # Emission of cur_tag
            emit_score = emissions[i, torch.arange(batch_size), cur_tag]

            step_score = (trans_score + emit_score) * mask_i.float()
            score += step_score

        # Add transition to STOP tag from the last valid token of each sentence
        last_valid_indices = mask.long().sum(dim=0)  # [batch_size]
        for b in range(batch_size):
            last_tag = padded_tags[last_valid_indices[b], b]
            score[b] += self.transitions[self.stop_tag_id, last_tag]

        return score

    def forward_loss(
        self, emissions: torch.Tensor, tags: torch.Tensor, mask: torch.Tensor
    ) -> torch.Tensor:
        """
        Computes the Negative Log-Likelihood (NLL) loss:
        NLL = log Z(x) - score(x, y)
        """
        forward_score = self._forward_alg(emissions, mask)
        gold_score = self._score_sentence(emissions, tags, mask)
        return torch.mean(forward_score - gold_score)

    def decode(self, emissions: torch.Tensor, mask: torch.Tensor) -> List[List[int]]:
        """
        Viterbi decoding algorithm to find the highest-scoring sequence of tags.
        emissions: [seq_len, batch_size, num_tags]
        mask:      [seq_len, batch_size]
        Returns:   List of decoded tag ID sequences for each batch element.
        """
        seq_len, batch_size, num_tags = emissions.shape
        backpointers: List[List[torch.Tensor]] = []

        # Initialize viterbi variables in log space
        init_vvars = torch.full((batch_size, num_tags), -10000.0, device=emissions.device)
        init_vvars[:, self.start_tag_id] = 0.0
        forward_var = init_vvars

        for i in range(seq_len):
            emit_score = emissions[i]
            mask_i = mask[i].unsqueeze(1)

            # next_tag_var: [batch_size, to_tag, from_tag]
            next_tag_var = forward_var.unsqueeze(1) + self.transitions.unsqueeze(0)
            max_vars, bptrs = torch.max(next_tag_var, dim=2)

            max_vars = max_vars + emit_score
            forward_var = torch.where(mask_i, max_vars, forward_var)
            backpointers.append(bptrs)

        # Transition to STOP tag
        terminal_vars = forward_var + self.transitions[self.stop_tag_id].unsqueeze(0)
        best_last_tags = torch.argmax(terminal_vars, dim=1).tolist()

        # Follow backpointers backward for each sentence
        best_paths: List[List[int]] = []
        lengths = mask.long().sum(dim=0).tolist()

        for b in range(batch_size):
            best_tag_id = best_last_tags[b]
            seq_l = lengths[b]
            if seq_l == 0:
                best_paths.append([])
                continue

            path = [best_tag_id]
            for i in range(seq_l - 1, 0, -1):
                best_tag_id = backpointers[i][b][best_tag_id].item()
                path.append(best_tag_id)

            path.reverse()
            best_paths.append(path)

        return best_paths
