# Shared text normalization and lightweight similarity helpers.
from __future__ import annotations

import re


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def normalize_tag(value: str | None) -> str:
    return normalize_text(value).lstrip("#")


def keyword_overlap(left: str, right: str) -> float:
    left_tokens = {token for token in re.split(r"\W+", normalize_text(left)) if len(token) >= 2}
    right_tokens = {token for token in re.split(r"\W+", normalize_text(right)) if len(token) >= 2}
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / min(len(left_tokens), len(right_tokens))
