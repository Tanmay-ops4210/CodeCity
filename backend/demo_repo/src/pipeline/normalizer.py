# Schema Normalizer
from typing import Dict, Any

class DataNormalizer:
    @staticmethod
    def normalize_timestamp(val: Any) -> int:
        if isinstance(val, int):
            return val
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def normalize_currency(code: str) -> str:
        return code.strip().upper() if code else 'USD'
