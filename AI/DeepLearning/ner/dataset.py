"""
Resume NER Dataset, Vocabulary Manager, and Tokenization Utilities.
Defines BIO tagging schema, character/word vocabularies, and sample training corpora.
"""

import re
import torch
from torch.utils.data import Dataset
from typing import List, Tuple, Dict, Any, Optional

TAG_TO_ID = {
    "<PAD>": 0,
    "O": 1,
    "B-SKILL": 2,
    "I-SKILL": 3,
    "B-COLLEGE": 4,
    "I-COLLEGE": 5,
    "B-EXPERIENCE": 6,
    "I-EXPERIENCE": 7,
    "<START>": 8,
    "<STOP>": 9,
}

ID_TO_TAG = {v: k for k, v in TAG_TO_ID.items()}


def tokenize_resume_sentence(text: str) -> List[Tuple[str, int, int]]:
    """
    Regex tokenizer that splits on word boundaries, punctuation, and preserves
    exact character start and end offsets.
    Handles compound tech terms like Next.js, C++, and Node.js.
    """
    pattern = re.compile(r"([A-Za-z0-9+#\.\-]+|[^\s\w])")
    tokens: List[Tuple[str, int, int]] = []
    for match in pattern.finditer(text):
        token_str = match.group()
        start = match.start()
        end = match.end()
        tokens.append((token_str, start, end))
    return tokens


class Vocabulary:
    def __init__(self):
        self.word2id: Dict[str, int] = {"<PAD>": 0, "<UNK>": 1}
        self.id2word: Dict[int, str] = {0: "<PAD>", 1: "<UNK>"}
        self.char2id: Dict[str, int] = {"<PAD>": 0, "<UNK>": 1}
        self.id2char: Dict[int, str] = {0: "<PAD>", 1: "<UNK>"}

        # Initialize standard ASCII printable characters
        for c in range(32, 127):
            char = chr(c)
            if char not in self.char2id:
                cid = len(self.char2id)
                self.char2id[char] = cid
                self.id2char[cid] = char

    def add_word(self, word: str) -> int:
        w_lower = word.lower()
        if w_lower not in self.word2id:
            wid = len(self.word2id)
            self.word2id[w_lower] = wid
            self.id2word[wid] = w_lower
        return self.word2id[w_lower]

    def word_to_id(self, word: str) -> int:
        return self.word2id.get(word.lower(), self.word2id["<UNK>"])

    def char_to_id(self, char: str) -> int:
        return self.char2id.get(char, self.char2id["<UNK>"])

    def build_vocab_from_sentences(self, sentences: List[List[str]]):
        for sent in sentences:
            for word in sent:
                self.add_word(word)

    def __len__(self):
        return len(self.word2id)


# Curated resume training corpus with dense technical skills, degrees/institutions, and roles
SAMPLE_RESUME_TRAINING_DATA = [
    (
        "Developed high throughput microservices using Go and PostgreSQL at Google .",
        ["O", "O", "O", "O", "O", "B-SKILL", "O", "B-SKILL", "O", "O", "O"],
    ),
    (
        "Senior Backend Engineer with 5 years experience in React and TypeScript .",
        ["B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-SKILL", "O", "B-SKILL", "O"],
    ),
    (
        "Graduated with B.Tech in Computer Science from IIT Bombay in 2024 .",
        ["O", "O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-COLLEGE", "I-COLLEGE", "O", "O", "O"],
    ),
    (
        "Architected distributed real-time data pipelines with Kafka , Apache Spark , and Redis .",
        ["O", "O", "O", "O", "O", "O", "B-SKILL", "O", "B-SKILL", "I-SKILL", "O", "O", "B-SKILL", "O"],
    ),
    (
        "Full Stack Developer proficient in Next.js , Tailwind CSS , and GraphQL .",
        ["B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "O", "B-SKILL", "O", "B-SKILL", "I-SKILL", "O", "O", "B-SKILL", "O"],
    ),
    (
        "Earned Master of Science from Stanford University specializing in Machine Learning .",
        ["O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-COLLEGE", "I-COLLEGE", "O", "O", "B-SKILL", "I-SKILL", "O"],
    ),
    (
        "Trained deep neural networks with PyTorch and HuggingFace Transformers deployed via Docker on AWS .",
        ["O", "O", "O", "O", "O", "B-SKILL", "O", "B-SKILL", "I-SKILL", "O", "O", "B-SKILL", "O", "B-SKILL", "O"],
    ),
    (
        "Cloud Architect with 8 years of experience designing Kubernetes clusters on Google Cloud Platform .",
        ["B-EXPERIENCE", "I-EXPERIENCE", "O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-SKILL", "O", "O", "B-SKILL", "I-SKILL", "I-SKILL", "O"],
    ),
    (
        "Completed Bachelor of Engineering at BITS Pilani with honors in Electronics .",
        ["O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-COLLEGE", "I-COLLEGE", "O", "O", "O", "O", "O"],
    ),
    (
        "Built responsive web applications in Vue.js , Node.js , and MongoDB with automated CI/CD .",
        ["O", "O", "O", "O", "O", "B-SKILL", "O", "B-SKILL", "O", "O", "B-SKILL", "O", "O", "B-SKILL", "O"],
    ),
    (
        "Data Scientist with 3+ years experience using Python , Scikit-Learn , and Pandas for statistical modeling .",
        ["B-EXPERIENCE", "I-EXPERIENCE", "O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O", "B-SKILL", "O", "B-SKILL", "O", "O", "B-SKILL", "O", "O", "O", "O"],
    ),
    (
        "Received degree from Delhi University and worked as a Junior Frontend Developer .",
        ["O", "O", "O", "B-COLLEGE", "I-COLLEGE", "O", "O", "O", "O", "B-EXPERIENCE", "I-EXPERIENCE", "I-EXPERIENCE", "O"],
    ),
    (
        "Implemented secure RESTful microservices with FastAPI and SQLAlchemy .",
        ["O", "O", "O", "O", "O", "B-SKILL", "O", "B-SKILL", "O"],
    ),
    (
        "Researched deep reinforcement learning algorithms at IIIT Hyderabad .",
        ["O", "B-SKILL", "I-SKILL", "I-SKILL", "O", "O", "B-COLLEGE", "I-COLLEGE", "O"],
    ),
    (
        "Automated infrastructure provisioning with Terraform and Ansible across multi-region AWS environments .",
        ["O", "O", "O", "O", "B-SKILL", "O", "B-SKILL", "O", "O", "B-SKILL", "O", "O"],
    ),
]


class ResumeNERDataset(Dataset):
    def __init__(self, data: List[Tuple[str, List[str]]], vocab: Vocabulary, max_word_len: int = 20):
        self.vocab = vocab
        self.max_word_len = max_word_len
        self.items = []

        for sent_str, tag_labels in data:
            tokens = [t[0] for t in tokenize_resume_sentence(sent_str)]
            # Match lengths if any minor tokenization discrepancy
            min_len = min(len(tokens), len(tag_labels))
            tokens = tokens[:min_len]
            tags = [TAG_TO_ID.get(t, TAG_TO_ID["O"]) for t in tag_labels[:min_len]]
            self.items.append((tokens, tags))

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx: int):
        tokens, tags = self.items[idx]
        word_ids = [self.vocab.word_to_id(w) for w in tokens]
        char_ids = []
        for w in tokens:
            w_chars = [self.vocab.char_to_id(c) for c in w[: self.max_word_len]]
            w_chars += [0] * (self.max_word_len - len(w_chars))
            char_ids.append(w_chars)
        return torch.tensor(word_ids, dtype=torch.long), torch.tensor(tags, dtype=torch.long), torch.tensor(char_ids, dtype=torch.long)


def pad_collate_fn(batch):
    """
    Pads variable-length sequences to the maximum length in the current batch.
    Creates corresponding boolean attention masks.
    """
    word_seqs, tag_seqs, char_seqs = zip(*batch)
    lengths = [len(seq) for seq in word_seqs]
    max_len = max(lengths)
    batch_size = len(batch)
    max_word_len = char_seqs[0].shape[1]

    padded_words = torch.zeros((batch_size, max_len), dtype=torch.long)
    padded_tags = torch.zeros((batch_size, max_len), dtype=torch.long)
    padded_chars = torch.zeros((batch_size, max_len, max_word_len), dtype=torch.long)
    mask = torch.zeros((batch_size, max_len), dtype=torch.bool)

    for i, (w, t, c) in enumerate(zip(word_seqs, tag_seqs, char_seqs)):
        l = lengths[i]
        padded_words[i, :l] = w
        padded_tags[i, :l] = t
        padded_chars[i, :l] = c
        mask[i, :l] = True

    return padded_words, padded_tags, padded_chars, mask
