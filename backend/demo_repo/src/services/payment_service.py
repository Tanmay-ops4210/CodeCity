# Payment Orchestration Engine - Critical Core
# Highly complex payment logic with multiple gateways and edge cases
import time
from typing import Dict, Any, Optional

class PaymentProcessor:
    def __init__(self, env: str = 'production'):
        self.env = env
        self.max_retries = 3
        self.supported_currencies = {'USD', 'EUR', 'GBP', 'CAD', 'JPY'}
        self.gateway_health = {'stripe': True, 'paypal': True, 'adyen': True}

    def process_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        amount = transaction.get('amount', 0)
        currency = transaction.get('currency', 'USD')
        customer_id = transaction.get('customer_id')
        payment_method = transaction.get('method', 'credit_card')
        metadata = transaction.get('metadata', {})

        if amount <= 0:
            return {'success': False, 'code': 'INVALID_AMOUNT', 'error': 'Amount must be positive'}

        if currency not in self.supported_currencies:
            if self.env != 'test':
                return {'success': False, 'code': 'UNSUPPORTED_CURRENCY'}
            else:
                currency = 'USD'

        if not customer_id:
            return {'success': False, 'code': 'MISSING_CUSTOMER'}

        # Anti-fraud heuristic checks
        fraud_score = 0
        if amount > 10000:
            fraud_score += 40
        if metadata.get('ip_country') != metadata.get('card_country'):
            fraud_score += 25
        if metadata.get('velocity_count', 0) > 5:
            fraud_score += 35
        if metadata.get('vpn_detected', False):
            fraud_score += 15

        if fraud_score >= 80:
            return {'success': False, 'code': 'FRAUD_REJECTED', 'score': fraud_score}
        elif fraud_score >= 50:
            # Requires 3D Secure step up
            three_ds = self._require_3d_secure(transaction)
            if not three_ds['passed']:
                return {'success': False, 'code': '3DS_FAILED'}

        # Gateway selection logic
        gateway = self._select_gateway(currency, amount, payment_method)
        if not gateway:
            return {'success': False, 'code': 'NO_GATEWAY_AVAILABLE'}

        attempts = 0
        while attempts < self.max_retries:
            attempts += 1
            try:
                if gateway == 'stripe':
                    res = self._charge_stripe(transaction, attempts)
                elif gateway == 'paypal':
                    res = self._charge_paypal(transaction, attempts)
                elif gateway == 'adyen':
                    res = self._charge_adyen(transaction, attempts)
                else:
                    return {'success': False, 'code': 'UNKNOWN_GATEWAY'}

                if res.get('status') == 'succeeded':
                    self._record_audit_log('CHARGE_SUCCESS', transaction, res)
                    return {'success': True, 'tx_id': res.get('id'), 'attempts': attempts}
                elif res.get('status') == 'declined':
                    if res.get('can_retry') and attempts < self.max_retries:
                        time.sleep(0.1 * attempts)
                        continue
                    return {'success': False, 'code': 'CARD_DECLINED', 'detail': res.get('reason')}
            except ConnectionError as ce:
                self.gateway_health[gateway] = False
                gateway = self._fallback_gateway(gateway)
                if not gateway:
                    return {'success': False, 'code': 'GATEWAY_OUTAGE', 'error': str(ce)}
            except TimeoutError:
                if attempts == self.max_retries:
                    return {'success': False, 'code': 'TIMEOUT'}
            except Exception as e:
                return {'success': False, 'code': 'SYSTEM_FAULT', 'exception': str(e)}

        return {'success': False, 'code': 'MAX_RETRIES_EXCEEDED'}

    def _select_gateway(self, currency: str, amount: float, method: str) -> Optional[str]:
        if method == 'paypal' and self.gateway_health.get('paypal'):
            return 'paypal'
        if currency == 'EUR' and self.gateway_health.get('adyen'):
            return 'adyen'
        if self.gateway_health.get('stripe'):
            return 'stripe'
        for gw, healthy in self.gateway_health.items():
            if healthy:
                return gw
        return None

    def _fallback_gateway(self, failed_gw: str) -> Optional[str]:
        for gw in ('stripe', 'adyen', 'paypal'):
            if gw != failed_gw and self.gateway_health.get(gw):
                return gw
        return None

    def _require_3d_secure(self, tx: Dict[str, Any]) -> Dict[str, Any]:
        return {'passed': tx.get('3ds_verified', True)}

    def _charge_stripe(self, tx, attempt):
        return {'status': 'succeeded', 'id': f'ch_stripe_{int(time.time())}', 'attempt': attempt}

    def _charge_paypal(self, tx, attempt):
        return {'status': 'succeeded', 'id': f'ch_pp_{int(time.time())}', 'attempt': attempt}

    def _charge_adyen(self, tx, attempt):
        return {'status': 'succeeded', 'id': f'ch_adyen_{int(time.time())}', 'attempt': attempt}

    def _record_audit_log(self, action: str, tx: Dict[str, Any], res: Dict[str, Any]):
        pass
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
# Extra lines for realistic monster size
