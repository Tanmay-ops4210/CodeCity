# Shopping Cart Model
from typing import List, Dict

class ShoppingCart:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.items: List[Dict] = []

    def add(self, sku: str, quantity: int = 1, price: float = 0.0):
        self.items.append({'sku': sku, 'quantity': quantity, 'price': price})

    def total(self) -> float:
        return sum(item['quantity'] * item['price'] for item in self.items)
