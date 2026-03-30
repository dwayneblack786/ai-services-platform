Start the PropVision vision-server and verify it's running.

Steps:
1. Check if vision-server is already running on port 8001: `curl -s http://localhost:8001/health 2>/dev/null`
2. If already running, report status and model info from the health endpoint
3. If not running, start it: `cd services-python/vision-server && python server.py` (run in background)
4. Wait for startup, then verify health endpoint responds
5. Run a quick smoke test: send a test image to `/analyze` if one exists in `data/raw/`
6. Report: server status, loaded model checkpoint, GPU memory usage, available endpoints
