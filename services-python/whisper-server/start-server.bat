@echo off
cd /d "%~dp0"
echo Starting Whisper STT Server...
echo.
venv\Scripts\python.exe server.py
pause
