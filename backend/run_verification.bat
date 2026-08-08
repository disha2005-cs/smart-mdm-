@echo off
echo ========================================
echo Database Verification Script
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run verification script
python verify_and_fix_database.py

echo.
echo ========================================
echo Verification Complete
echo ========================================
echo.
echo Press any key to exit...
pause > nul
