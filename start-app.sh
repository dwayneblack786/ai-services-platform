#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.run-logs"
mkdir -p "$LOG_DIR"

print_header() {
  echo
  echo "Starting application services..."
  echo "================================"
  echo
}

confirm_continue() {
  local prompt="$1"
  read -r -p "$prompt (y/n): " answer
  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "Aborted by user."
    exit 1
  fi
}

check_http() {
  local name="$1"
  local url="$2"
  if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
    echo "[OK] $name is reachable at $url"
  else
    echo "[WARN] $name is not reachable at $url"
    confirm_continue "Continue anyway"
  fi
}

check_port() {
  local name="$1"
  local host="$2"
  local port="$3"
  if command -v nc >/dev/null 2>&1 && nc -z "$host" "$port" >/dev/null 2>&1; then
    echo "[OK] $name is reachable at $host:$port"
  else
    echo "[WARN] $name is not reachable at $host:$port"
    confirm_continue "Continue anyway"
  fi
}

check_mongo() {
  if pgrep -f mongod >/dev/null 2>&1; then
    echo "[OK] MongoDB process detected"
  elif command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 27017 >/dev/null 2>&1; then
    echo "[OK] MongoDB port 27017 is reachable"
  else
    echo "[WARN] MongoDB is not detected"
    confirm_continue "Continue anyway"
  fi
}

kill_ports() {
  local ports=(5000 3002 5173 5174 8000 8136 8137 50051)
  echo
  echo "Cleaning up existing processes on app ports..."

  for port in "${ports[@]}"; do
    if command -v lsof >/dev/null 2>&1; then
      local pids
      pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
      if [[ -n "$pids" ]]; then
        echo "$pids" | xargs -r kill -9 || true
        echo "  Killed process(es) on port $port"
      fi
    fi
  done

  echo "Cleanup complete"
}

start_service() {
  local name="$1"
  local workdir="$2"
  local command="$3"
  local logfile="$4"

  echo "Starting $name..."
  (
    cd "$workdir"
    nohup bash -lc "$command" >"$logfile" 2>&1 &
    echo $! >"$logfile.pid"
  )
  local pid
  pid="$(cat "$logfile.pid")"
  rm -f "$logfile.pid"
  echo "  [OK] $name started (PID: $pid)"
  echo "  Logs: $logfile"
}

print_header

check_http "Keycloak" "http://localhost:9999"
check_port "Redis" "127.0.0.1" "6379"
check_mongo
kill_ports

# Start services in roughly the same sequence as the PowerShell script.
start_service "VA-Service" "$ROOT_DIR/services-java/va-service" "./mvnw spring-boot:run" "$LOG_DIR/va-service.log"
sleep 10

start_service "Listing Service" "$ROOT_DIR/services-java/listing-service" "set -a; [ -f .env ] && source .env; set +a; ./mvnw -Dspring-boot.run.profiles=dev spring-boot:run" "$LOG_DIR/listing-service.log"
sleep 10

PYTHON_CMD="python3"
if ! command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python"
fi
start_service "Whisper Server" "$ROOT_DIR/services-python/whisper-server" "$PYTHON_CMD server.py" "$LOG_DIR/whisper-server.log"
sleep 3

start_service "Product Management Backend" "$ROOT_DIR/ai-product-management/backend-node" "npm run dev" "$LOG_DIR/product-management-backend.log"
sleep 3

start_service "Product Management Frontend" "$ROOT_DIR/ai-product-management/frontend" "npm run dev" "$LOG_DIR/product-management-frontend.log"
sleep 3

start_service "AI Listing Agent Backend" "$ROOT_DIR/ai-listing-agent/backend-node" "npm run dev" "$LOG_DIR/ai-listing-agent-backend.log"
sleep 3

start_service "AI Listing Agent Frontend" "$ROOT_DIR/ai-listing-agent/frontend" "npm run dev" "$LOG_DIR/ai-listing-agent-frontend.log"
sleep 5

echo
echo "All services started"
echo "===================="
echo "Keycloak:              http://localhost:9999"
echo "Whisper Server:        http://localhost:8000"
echo "VA-Service HTTP:       http://localhost:8136"
echo "VA-Service gRPC:       localhost:50051"
echo "Listing Service:       http://localhost:8137"
echo "Product Management:    http://localhost:5173"
echo "Listing Agent:         http://localhost:5174"
echo "Listing Agent API:     http://localhost:3002/api"

echo
echo "Running health checks..."
health_checks=(
  "VA-Service|http://localhost:8136/health"
  "Listing Service|http://localhost:8137/actuator/health"
  "Keycloak|http://localhost:9999"
  "Product Mgmt|http://localhost:5000/health"
  "Listing Agent|http://localhost:3002/health"
  "Whisper Server|http://localhost:8000/health"
)

for check in "${health_checks[@]}"; do
  name="${check%%|*}"
  url="${check##*|}"
  if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
    echo "  [OK] $name healthy"
  else
    echo "  [WARN] $name not responding yet"
  fi
done

echo
echo "Ready to test SSO."
echo "Tip: use 'tail -f .run-logs/<service>.log' to watch startup logs."

