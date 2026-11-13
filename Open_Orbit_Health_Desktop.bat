@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Launch_Orbit_Desktop.ps1"
if errorlevel 1 (
  echo.
  echo Orbit Health could not start. The error is shown above.
  pause
)
