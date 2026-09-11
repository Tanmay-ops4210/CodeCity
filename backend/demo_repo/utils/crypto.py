# Cryptographic Utilities
import hashlib
import base64

def sha256_hash(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

def b64_encode(data: str) -> str:
    return base64.b64encode(data.encode()).decode()
