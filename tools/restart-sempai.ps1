param(
    [ValidateSet('user', 'admin')]
    [string]$Target = 'user',
    [int]$ClientPort = 8080,
    [int]$ServerPort = 3002
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$LaunchScript = Join-Path $PSScriptRoot 'launch-sempai.ps1'
$LogDir = Join-Path $PSScriptRoot 'logs'
$RestartLog = Join-Path $LogDir 'restart.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-RestartLog {
    param([string]$Message)
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    Add-Content -Path $RestartLog -Value $line
    Write-Host $Message
}

function Stop-PortOwner {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -and $_.OwningProcess -ne 0 } |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $connections) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Write-RestartLog "Cerrando proceso $($process.ProcessName) PID $processId en puerto $Port."
            Stop-Process -Id $processId -Force -ErrorAction Stop
        } catch {
            Write-RestartLog "No se pudo cerrar PID $processId en puerto ${Port}: $($_.Exception.Message)"
        }
    }
}

function Test-HttpOk {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    } catch {
        return $false
    }
}

Write-RestartLog 'Reiniciando Sempai Clash.'
Stop-PortOwner -Port $ServerPort
Stop-PortOwner -Port $ClientPort
Start-Sleep -Seconds 2

& $LaunchScript -Target $Target -ClientPort $ClientPort -ServerPort $ServerPort

$healthUrl = "http://127.0.0.1:$ServerPort/health"
$clientUrl = "http://127.0.0.1:$ClientPort/auth.html"

if (-not (Test-HttpOk -Url $healthUrl)) {
    throw "El backend no respondio correctamente en $healthUrl. Revisa tools\logs\server.log"
}

if (-not (Test-HttpOk -Url $clientUrl)) {
    throw "El frontend no respondio correctamente en $clientUrl. Revisa tools\logs\client.log"
}

Write-RestartLog "Sempai Clash quedo listo: frontend http://127.0.0.1:$ClientPort, backend http://127.0.0.1:$ServerPort."
