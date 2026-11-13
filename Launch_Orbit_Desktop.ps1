$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$appUrl = 'http://127.0.0.1:3000'
$healthUrl = "$appUrl/api/health"

try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
} catch {
    Start-Process -FilePath 'node' -ArgumentList 'backend/health_records_api.js' -WorkingDirectory $projectRoot -WindowStyle Hidden
    $health = $null
    for ($attempt = 0; $attempt -lt 25 -and -not $health; $attempt++) {
        Start-Sleep -Milliseconds 300
        try { $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 } catch { }
    }
}

if (-not $health -or $health.status -ne 'ok') {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show('Could not start the Orbit Health server. Make sure Node.js is installed, then try again.', 'Orbit Health') | Out-Null
    exit 1
}

$edgeExe = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path -LiteralPath $edgeExe)) {
    $edgeExe = Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'
}

try {
    if (Test-Path -LiteralPath $edgeExe) {
        Start-Process -FilePath $edgeExe -ArgumentList @("--app=$appUrl") -WorkingDirectory $projectRoot -ErrorAction Stop | Out-Null
    } else {
        Start-Process -FilePath $appUrl -ErrorAction Stop | Out-Null
    }
} catch {
    Start-Process -FilePath $appUrl -ErrorAction Stop | Out-Null
}
