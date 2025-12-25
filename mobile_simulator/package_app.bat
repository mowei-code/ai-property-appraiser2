@echo off
echo ==========================================
echo   Mobile Simulator Packaging Tool
echo ==========================================
echo.

:: 1. Check requirements
echo [1/3] Checking dependencies...
pip install pyinstaller PySide6 requests

:: 2. Run Packaging
:: --onefile: Bundle into a single EXE
:: --windowed: Do not show a console window
:: --name: Name of the output file
:: --add-data: Include config_manager.py (PyInstaller handles modules automatically but we ensure it's here)
:: --clean: Clean cache before build

echo.
echo [2/3] Building executable (this may take a few minutes)...
pyinstaller --onefile --windowed --name "MobileSimulator" --clean main.py

:: 3. Finish
echo.
echo [3/3] Packaging Complete!
echo.
echo Check the "dist" folder for MobileSimulator.exe
echo.
pause
