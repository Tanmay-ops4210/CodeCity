#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=================================================="
echo "    CODE CITY — Complexity Topology System       "
echo "=================================================="

# Ensure node runtime is in PATH
export PATH="$DIR/.node_runtime/bin:$PATH"

# Start Python backend server on port 8000
echo "[*] Launching Python AST Analysis Server on :8000..."
python3 backend/server.py &
BACKEND_PID=$!

trap "echo '[*] Stopping Code City...'; kill $BACKEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM EXIT

# Start Vite frontend
echo "[*] Launching Vite Frontend on :5173..."
cd frontend
npm run dev -- --port 5173 --host
