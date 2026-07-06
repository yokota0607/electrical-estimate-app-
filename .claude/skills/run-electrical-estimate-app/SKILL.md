---
name: run-electrical-estimate-app
description: Build, run, and drive electrical-estimate-app. Use when asked to start the app, run it, take a screenshot of its UI, test its API, or verify a change in the running app.
---

Next.js 16 web app for electrical construction estimates (電気工事見積もり管理システム). Drive it via `.claude/skills/run-electrical-estimate-app/smoke.ps1` — the script starts the dev server, runs API smoke tests, and takes screenshots using Edge headless.

All paths below are relative to `electrical-estimate-app/`.

## Prerequisites

Node.js 22 portable is installed at `C:\Users\admin\node-v22.16.0-win-x64`. Microsoft Edge is installed at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.

No additional system packages needed — both are already present on this machine.

## Setup

```powershell
$env:PATH = "C:\Users\admin\node-v22.16.0-win-x64;$env:PATH"
npm install
```

`.env.local` must contain `ANTHROPIC_API_KEY` for the PDF analysis feature (`/api/analyze`). The app runs without it — the key is only needed for PDF-based estimate generation.

## Run (agent path)

```powershell
$env:PATH = "C:\Users\admin\node-v22.16.0-win-x64;$env:PATH"
Set-Location "C:\Users\admin\electrical-estimate-app"
powershell -ExecutionPolicy Bypass -File ".claude\skills\run-electrical-estimate-app\smoke.ps1"
```

This starts the dev server, tests all API endpoints, captures three screenshots, then stops the server. Full run takes ~20s.

Screenshots land in `screenshots\`:
- `screenshots\dashboard.png` — main dashboard
- `screenshots\estimates.png` — estimate history list
- `screenshots\unit-prices.png` — unit price management

To take a screenshot of the running app only (server must already be listening on port 3000):

```powershell
powershell -ExecutionPolicy Bypass -File ".claude\skills\run-electrical-estimate-app\smoke.ps1" screenshot
```

To stop the server:

```powershell
powershell -ExecutionPolicy Bypass -File ".claude\skills\run-electrical-estimate-app\smoke.ps1" stop
```

### API smoke tests (direct)

```powershell
# Start server first, then:
Invoke-WebRequest -Uri "http://localhost:3000/api/estimates" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/api/unit-prices" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:3000/api/construction-ledger" -UseBasicParsing

# Create a test estimate
$body = '{"title":"Test","project_name":"Test Project","customer_name":"Test Co","items":[{"name":"CVケーブル","quantity":5,"unit":"m","unit_price":1000}]}'
Invoke-WebRequest -Uri "http://localhost:3000/api/estimates" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## Run (human path)

```powershell
$env:PATH = "C:\Users\admin\node-v22.16.0-win-x64;$env:PATH"
cd C:\Users\admin\electrical-estimate-app
npm run dev   # → opens http://localhost:3000 in browser. Ctrl-C to stop.
```

## Gotchas

- **Screenshots show "読み込み中..." (loading)** — Edge headless captures the initial server render before client-side React data fetches complete. This is normal; it confirms the page structure is correct. The API smoke tests separately verify data endpoints work.

- **`$pid` is reserved in PowerShell 5.1** — PowerShell's automatic `$pid` variable is read-only. The smoke script uses `$devPid` instead. Don't rename it back to `$pid`.

- **Port 3000 EADDRINUSE** — If the script crashes mid-run, the server stays alive. Kill it before relaunching: `Stop-Process -Id (netstat -ano | Select-String ':3000.*LISTENING' | ForEach-Object { ($_ -split '\s+')[-1] }) -Force`

- **Node not found** — Must set PATH before running npm: `$env:PATH = "C:\Users\admin\node-v22.16.0-win-x64;$env:PATH"`

- **PDF analysis requires ANTHROPIC_API_KEY** — `/api/analyze` and `/api/analyze-estimate` return errors without the key. All other routes work without it.

## Troubleshooting

- **`npm : The term 'npm' is not recognized`**: PATH not set. Prefix command with `$env:PATH = "C:\Users\admin\node-v22.16.0-win-x64;$env:PATH"`.

- **`Start-Process: %1 is not a valid Win32 application`**: Tried to launch `npm` directly. Use `npm.cmd` — e.g., `Start-Process "$NODE\npm.cmd"`.

- **Screenshot file not created**: Edge may have written to the current working directory instead of the specified path. Check `ls .` for `screenshot.png`. Ensure the output path is an absolute Windows path.

- **`Cannot overwrite variable PID`**: Used `$pid` variable name. Rename to `$devPid` or any other name.
