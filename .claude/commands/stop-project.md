Your goal is to stop all running node and java servers running for this project

Do the following:
1. Stop all node js servers for this project running on ports 5173, 8136
 e.g. Get-Process -Name "node" | Stop-Process -Force
2. stop all java servers running
e.g. Get-Process -Name "java", "javaw" -ErrorAction SilentlyContinue | Stop-Process -Force
3. Verify all node and java servers are not running on the following port
