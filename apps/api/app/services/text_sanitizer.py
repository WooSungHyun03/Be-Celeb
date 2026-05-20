# Normalizes user-facing LLM text before it is returned or stored.
from __future__ import annotations

import re


KOREAN_ONLY_OUTPUT_INSTRUCTION = (
    "All user-facing string values must be written in natural Korean. "
    "Do not use Chinese, Japanese, or Hanja characters. "
    "Translate Chinese expressions such as 拟人化 into Korean, for example 의인화. "
    "Common tech names such as YouTube, AI, IT, Python, and JavaScript are allowed."
)

_HAN_TEXT_RE = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]+")
_MULTISPACE_RE = re.compile(r"\s{2,}")

_PHRASE_REPLACEMENTS = {
    "拟人化": " 의인화",
    "拟人": " 의인화",
    "人格化": " 의인화",
    "娱乐": " 엔터테인먼트",
    "对决": " 대결",
    "类型": " 타입",
    "用户": " 사용자",
    "视频": " 영상",
    "内容": " 콘텐츠",
    "推荐": " 추천",
    "生成": " 생성",
    "分析": " 분석",
}


def sanitize_user_facing_text(value: str) -> str:
    text = value
    for source, replacement in _PHRASE_REPLACEMENTS.items():
        text = text.replace(source, replacement)
    text = _HAN_TEXT_RE.sub("", text)
    text = _MULTISPACE_RE.sub(" ", text)
    text = re.sub(r"\s+([,.!?])", r"\1", text)
    text = re.sub(r"\s+([가-힣])", r" \1", text)
    return text.strip()
