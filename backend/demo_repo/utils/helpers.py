# General Helper Functions
import json

def safe_json_dump(obj) -> str:
    try:
        return json.dumps(obj)
    except Exception:
        return '{}'

def truncate_str(text: str, max_len: int = 50) -> str:
    return text[:max_len] + '...' if len(text) > max_len else text
