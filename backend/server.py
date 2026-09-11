"""
Code City Backend HTTP Server.
Zero-dependency API server using Python standard library http.server.
Provides:
- GET /health
- GET /demo
- POST /analyze
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Ensure local backend module can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.analyzer import analyze_repository

DEMO_REPO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "demo_repo")


class CodeCityRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _send_json_response(self, data: dict, status: int = 200):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        parsed_path = urlparse(self.path).path
        if parsed_path == "/health":
            self._send_json_response({
                "status": "online",
                "analyzer": "ast-static-parser",
                "version": "1.0.0",
                "demo_available": os.path.exists(DEMO_REPO_DIR)
            })
        elif parsed_path == "/demo":
            try:
                result = analyze_repository(DEMO_REPO_DIR)
                self._send_json_response(result)
            except Exception as e:
                self._send_json_response({"error": str(e)}, status=500)
        else:
            self._send_json_response({"error": "Not Found", "available_endpoints": ["/health", "/demo", "/analyze"]}, status=404)

    def do_POST(self):
        parsed_path = urlparse(self.path).path
        if parsed_path == "/analyze":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
                data = json.loads(body) if body else {}

                target_path = data.get("path", "").strip()
                if not target_path:
                    target_path = DEMO_REPO_DIR

                if not os.path.isabs(target_path):
                    # Resolve relative to current working directory or backend directory
                    cwd_target = os.path.abspath(target_path)
                    if os.path.exists(cwd_target):
                        target_path = cwd_target
                    else:
                        target_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), target_path)

                if not os.path.exists(target_path):
                    self._send_json_response({"error": f"Path not found: {target_path}"}, status=400)
                    return

                result = analyze_repository(target_path)
                self._send_json_response(result)
            except json.JSONDecodeError:
                self._send_json_response({"error": "Invalid JSON payload"}, status=400)
            except Exception as e:
                self._send_json_response({"error": str(e)}, status=500)
        else:
            self._send_json_response({"error": "Endpoint not found"}, status=404)

    def log_message(self, format, *args):
        # Keep console output clean
        sys.stderr.write(f"[CodeCity API] {args[0]} {args[1]} -> {args[2]}\n")


def run_server(port: int = 8000):
    server_address = ("", port)
    httpd = HTTPServer(server_address, CodeCityRequestHandler)
    print(f"[*] Code City Static Analysis Server running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Server shutting down.")
        httpd.server_close()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    run_server(port)
