@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 server\start.py %*
  goto finish
)
where python >nul 2>nul
if not errorlevel 1 (
  python server\start.py %*
  goto finish
)
echo Python fehlt. Bitte Python 3.10 oder neuer von python.org installieren.
echo Bei der Installation "Add python.exe to PATH" aktivieren.
:finish
pause
