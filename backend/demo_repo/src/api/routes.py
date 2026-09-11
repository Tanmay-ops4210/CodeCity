# API Gateway Routes
from typing import Dict, Any, List

class ApiRouter:
    def __init__(self):
        self.routes = {}
        self.middlewares = []

    def register(self, path: str, method: str, handler):
        key = (path, method.upper())
        if key in self.routes:
            raise ValueError(f'Route already exists: {key}')
        self.routes[key] = handler

    def dispatch(self, request: Dict[str, Any]):
        path = request.get('path', '/')
        method = request.get('method', 'GET').upper()
        for mw in self.middlewares:
            request = mw(request)
            if not request:
                return {'status': 403, 'error': 'Forbidden'}
        handler = self.routes.get((path, method))
        if not handler:
            return {'status': 404, 'error': 'Not Found'}
        return handler(request)

def health_check(req):
    return {'status': 200, 'alive': True}

def get_status(req):
    return {'status': 200, 'version': '2.4.0'}
