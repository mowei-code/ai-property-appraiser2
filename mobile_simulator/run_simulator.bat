@echo off
setlocal
cd /d "%~dp0"

:: Aggressively kill previous instances
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM pythonw.exe /T >nul 2>&1

:: Brief wait for process cleanup
timeout /t 1 /nobreak >nul

:: Start the simulator silently
start "" pythonw main.py

:: Exit terminal immediately
exit
