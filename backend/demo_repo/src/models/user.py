# User Domain Entity
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: str
    email: str
    username: str
    tier: str = 'free'
    is_active: bool = True

    def is_premium(self) -> bool:
        return self.tier in ('gold', 'enterprise')
