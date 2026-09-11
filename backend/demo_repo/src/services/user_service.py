# User Profile and Authentication Service
from typing import Optional, Dict

class UserService:
    def __init__(self, db_client=None):
        self.db = db_client or {}
        self.cache = {}

    def get_user(self, user_id: str) -> Optional[Dict]:
        if user_id in self.cache:
            return self.cache[user_id]
        user = self.db.get(user_id)
        if user:
            self.cache[user_id] = user
        return user

    def update_profile(self, user_id: str, updates: Dict) -> bool:
        if user_id not in self.db:
            return False
        self.db[user_id].update(updates)
        if user_id in self.cache:
            del self.cache[user_id]
        return True
