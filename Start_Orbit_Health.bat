@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok = $false; try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; $ok = $response.StatusCode -eq 200 } catch { }; if (-not $ok) { Start-Process -FilePath 'node' -ArgumentList 'backend/health_records_api.js' -WorkingDirectory '%~dp0' -WindowStyle Minimized; Start-Sleep -Seconds 2 }; Start-Process 'http://127.0.0.1:3000'"
endlocal
