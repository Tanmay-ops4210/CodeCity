# Financial Transaction Model
from dataclasses import dataclass
import time

@dataclass
class Transaction:
    id: str
    order_id: str
    amount: float
    currency: str
    timestamp: float = time.time()
