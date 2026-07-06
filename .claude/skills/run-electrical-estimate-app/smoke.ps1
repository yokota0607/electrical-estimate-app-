#!/usr/bin/env pwsh
# Driver script for electrical-estimate-app
# Usage: .\smoke.ps1 [screenshot] [stop]
#
# Commands:
#   (no args)   - start dev server, run API smoke tests, take screenshot, then stop
#   screenshot  - take a screenshot of the running app (server must be running)
#   stop        - kill the dev server

param(
    [string]$Command = "run"
)

$NODE = "C:\Users\admin\node-v22.16.0-win-x64"
$APP_DIR = "C:\Users\admin\electrical-estimate-app"
$SHOTS_DIR = "$APP_DIR\screenshots"
$PID_FILE = "$env:TEMP\electrical-estimate-dev.pid"
$LOG_FILE = "$env:TEMP\electrical-estimate-dev.log"
$EDGE = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$BASE_URL = "http://localhost:3000"

function Start-DevServer {
    if (Test-Path $PID_FILE) {
        $oldPid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
        if ($oldPid -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
            Write-Host "Dev server already running (PID $oldPid)"
            return
        }
    }
    Write-Host "Starting dev server..."
    $proc = Start-Process -NoNewWindow -FilePath "$NODE\npm.cmd" `
        -ArgumentList "run","dev" `
        -WorkingDirectory $APP_DIR `
        -RedirectStandardOutput $LOG_FILE `
        -RedirectStandardError "$env:TEMP\electrical-estimate-dev-err.log" `
        -PassThru
    $proc.Id | Out-File $PID_FILE -Encoding ascii
    Write-Host "Dev server PID: $($proc.Id)"

    Write-Host "Waiting for server to be ready..."
    $timeout = 30
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        try {
            $r = Invoke-WebRequest -Uri $BASE_URL -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Write-Host "Server ready at $BASE_URL"
                return
            }
        } catch {}
        Start-Sleep -Seconds 1
        $elapsed++
    }
    Write-Error "Server did not start within ${timeout}s"
    exit 1
}

function Stop-DevServer {
    if (Test-Path $PID_FILE) {
        $devPid = Get-Content $PID_FILE -ErrorAction SilentlyContinue
        if ($devPid) {
            Write-Host "Stopping dev server (PID $devPid)..."
            Stop-Process -Id $devPid -Force -ErrorAction SilentlyContinue
            # Also kill any child node processes for this app
            Get-WmiObject Win32_Process -Filter "CommandLine LIKE '%electrical-estimate-app%next%'" |
                ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        }
        Remove-Item $PID_FILE -ErrorAction SilentlyContinue
        Write-Host "Dev server stopped"
    } else {
        Write-Host "No PID file found"
    }
}

function Take-Screenshot {
    param([string]$Path = "$SHOTS_DIR\screenshot.png", [string]$Url = $BASE_URL)
    New-Item -ItemType Directory -Force $SHOTS_DIR | Out-Null
    Write-Host "Taking screenshot of $Url -> $Path"
    & $EDGE --headless=new --screenshot="$Path" --window-size=1280,800 --no-sandbox $Url 2>$null
    Start-Sleep -Milliseconds 500
    if (Test-Path $Path) {
        Write-Host "Screenshot saved: $Path"
    } else {
        Write-Error "Screenshot failed - check Edge is installed at: $EDGE"
    }
}

function Run-SmokeTests {
    Write-Host "`n=== API Smoke Tests ==="

    # GET /api/estimates
    $r = Invoke-WebRequest -Uri "$BASE_URL/api/estimates" -UseBasicParsing
    if ($r.StatusCode -ne 200) { Write-Error "GET /api/estimates failed: $($r.StatusCode)"; exit 1 }
    Write-Host "OK GET /api/estimates -> $($r.StatusCode)"

    # GET /api/unit-prices
    $r = Invoke-WebRequest -Uri "$BASE_URL/api/unit-prices" -UseBasicParsing
    if ($r.StatusCode -ne 200) { Write-Error "GET /api/unit-prices failed: $($r.StatusCode)"; exit 1 }
    Write-Host "OK GET /api/unit-prices -> $($r.StatusCode)"

    # GET /api/construction-ledger
    $r = Invoke-WebRequest -Uri "$BASE_URL/api/construction-ledger" -UseBasicParsing
    if ($r.StatusCode -ne 200) { Write-Error "GET /api/construction-ledger failed: $($r.StatusCode)"; exit 1 }
    Write-Host "OK GET /api/construction-ledger -> $($r.StatusCode)"

    # POST /api/estimates
    $body = '{"title":"Smoke Test","project_name":"Test Project","customer_name":"Test Co","items":[{"name":"CVケーブル","quantity":5,"unit":"m","unit_price":1000}]}'
    $r = Invoke-WebRequest -Uri "$BASE_URL/api/estimates" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    if ($r.StatusCode -ne 201) { Write-Error "POST /api/estimates failed: $($r.StatusCode)"; exit 1 }
    $est = $r.Content | ConvertFrom-Json
    Write-Host "OK POST /api/estimates -> $($r.StatusCode) (id=$($est.estimate.id))"

    Write-Host "`nAll smoke tests passed"
}

# Main
switch ($Command) {
    "screenshot" {
        Take-Screenshot
    }
    "stop" {
        Stop-DevServer
    }
    default {
        Start-DevServer
        Run-SmokeTests
        Take-Screenshot -Path "$SHOTS_DIR\dashboard.png"
        Take-Screenshot -Path "$SHOTS_DIR\estimates.png" -Url "$BASE_URL/estimates"
        Take-Screenshot -Path "$SHOTS_DIR\unit-prices.png" -Url "$BASE_URL/unit-prices"
        Stop-DevServer
        Write-Host "`nDone. Screenshots in: $SHOTS_DIR"
    }
}
