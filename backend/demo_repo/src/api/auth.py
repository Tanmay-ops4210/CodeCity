# Authentication & Token Verification
import time
import hmac
import hashlib

SECRET_KEY = b'codecity-super-secret-key-12345'

class TokenAuth:
    def __init__(self, ttl: int = 3600):
        self.ttl = ttl
        self.revoked_tokens = set()

    def generate_token(self, user_id: str, role: str) -> str:
        timestamp = int(time.time())
        payload = f'{user_id}:{role}:{timestamp}'
        sig = hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()
        return f'{payload}:{sig}'

    def verify_token(self, token: str) -> Dict[str, Any]:
        if not token or ':' not in token:
            return {'valid': False, 'reason': 'Malformed token'}
        if token in self.revoked_tokens:
            return {'valid': False, 'reason': 'Token revoked'}
        parts = token.split(':')
        if len(parts) != 4:
            return {'valid': False, 'reason': 'Invalid token components'}
        user_id, role, ts_str, sig = parts
        try:
            ts = int(ts_str)
        except ValueError:
            return {'valid': False, 'reason': 'Invalid timestamp'}
        if time.time() - ts > self.ttl:
            return {'valid': False, 'reason': 'Token expired'}
        expected = hmac.new(SECRET_KEY, f'{user_id}:{role}:{ts}'.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return {'valid': False, 'reason': 'Signature mismatch'}
        return {'valid': True, 'user_id': user_id, 'role': role}
