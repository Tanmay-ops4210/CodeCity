# Order Management Service
from typing import List, Dict, Any

class OrderService:
    def __init__(self, inventory_svc, payment_svc):
        self.inventory = inventory_svc
        self.payments = payment_svc
        self.orders = {}

    def create_order(self, customer_id: str, items: List[Dict[str, Any]], payment_info: Dict[str, Any]) -> Dict[str, Any]:
        if not items:
            return {'success': False, 'error': 'Cart is empty'}
        
        total = 0
        for item in items:
            qty = item.get('quantity', 0)
            price = item.get('unit_price', 0)
            if qty <= 0 or price <= 0:
                return {'success': False, 'error': f'Invalid item: {item}'}
            total += qty * price
            
            if not self.inventory.check_stock(item.get('sku'), qty):
                return {'success': False, 'error': f'Out of stock: {item.get("sku")}'}

        payment_result = self.payments.process_transaction({
            'customer_id': customer_id,
            'amount': total,
            'method': payment_info.get('method')
        })

        if not payment_result.get('success'):
            return {'success': False, 'error': 'Payment rejected', 'details': payment_result}

        order_id = f'ord_{len(self.orders) + 1}'
        self.orders[order_id] = {
            'order_id': order_id,
            'customer_id': customer_id,
            'items': items,
            'total': total,
            'status': 'CONFIRMED'
        }
        return {'success': True, 'order_id': order_id, 'total': total}
