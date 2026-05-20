param(
    [ValidateSet('user', 'admin')]
    [string]$Target = 'user',
    [int]$ClientPort = 8080,
    [int]$ServerPort = 3002
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ProjectRoot = Join-Path $RepoRoot 'tcg-narrative-game'
$ServerDir = Join-Path $ProjectRoot 'apps\server'
$ClientDir = Join-Path $ProjectRoot 'apps\client'
$LogDir = Join-Path $PSScriptRoot 'logs'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Test-TcpPort {
    param([int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(250, $false)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Wait-TcpPort {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 25
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Test-HttpOk {
    param([string]$Url)

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    } catch {
        return $false
    }
}

function Test-ClientReady {
    param([int]$Port)

    return (Test-HttpOk -Url "http://127.0.0.1:$Port/auth.html") -or
        (Test-HttpOk -Url "http://127.0.0.1:$Port/admin.html")
}

function Wait-ClientReady {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 25
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-ClientReady -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Resolve-ClientPort {
    param([int]$PreferredPort)

    for ($port = $PreferredPort; $port -lt ($PreferredPort + 20); $port++) {
        if (Test-ClientReady -Port $port) {
            return $port
        }
        if (-not (Test-TcpPort -Port $port)) {
            return $port
        }
    }

    throw "No se encontro un puerto libre para el frontend desde $PreferredPort hasta $($PreferredPort + 19)."
}

function Ensure-NodeModules {
    param(
        [string]$Directory,
        [string]$LogName
    )

    if (Test-Path (Join-Path $Directory 'node_modules')) {
        return
    }

    $installLog = Join-Path $LogDir $LogName
    Push-Location $Directory
    try {
        npm.cmd install *> $installLog
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $ServerDir) -or -not (Test-Path $ClientDir)) {
    throw "No se encontro el proyecto en $ProjectRoot"
}

Ensure-NodeModules -Directory $ServerDir -LogName 'server-install.log'
Ensure-NodeModules -Directory $ClientDir -LogName 'client-install.log'

if (-not (Test-TcpPort -Port $ServerPort)) {
    $serverLog = Join-Path $LogDir 'server.log'
    $serverCommand = @"
`$env:PORT = '$ServerPort'
npm.cmd run dev *> '$serverLog'
"@
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $serverCommand) `
        -WorkingDirectory $ServerDir `
        -WindowStyle Hidden
}

if (-not (Wait-TcpPort -Port $ServerPort -TimeoutSeconds 25)) {
    throw "No se pudo iniciar el backend en el puerto $ServerPort. Revisa tools\logs\server.log"
}

$ClientPort = Resolve-ClientPort -PreferredPort $ClientPort

if (-not (Test-ClientReady -Port $ClientPort)) {
    $clientLog = Join-Path $LogDir 'client.log'
    $clientCommand = @"
`$env:VITE_PORT = '$ClientPort'
`$env:VITE_BACKEND_PORT = '$ServerPort'
npm.cmd run dev -- --host 0.0.0.0 --port $ClientPort *> '$clientLog'
"@
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $clientCommand) `
        -WorkingDirectory $ClientDir `
        -WindowStyle Hidden
}

if (-not (Wait-ClientReady -Port $ClientPort -TimeoutSeconds 25)) {
    throw "No se pudo iniciar el frontend en el puerto $ClientPort. Revisa tools\logs\client.log"
}

$page = if ($Target -eq 'admin') { 'admin.html' } else { 'auth.html' }
$url = "http://localhost:$ClientPort/$page"
Start-Process $url
Write-Host "Sempai Clash abierto en $url"
