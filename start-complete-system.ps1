# Complete System Startup Script
# Starts Backend Try1, Backend Try2, Frontend, and Ngrok tunnels

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Complete System Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Check if ports are available
Write-Host "Checking ports..." -ForegroundColor Yellow

$portsInUse = @()
if (Test-Port 8000) { $portsInUse += "8000 (Backend Try1)" }
if (Test-Port 8001) { $portsInUse += "8001 (Backend Try2)" }
if (Test-Port 5173) { $portsInUse += "5173 (Frontend)" }

if ($portsInUse.Count -gt 0) {
    Write-Host ""
    Write-Host "Warning: The following ports are already in use:" -ForegroundColor Yellow
    foreach ($port in $portsInUse) {
        Write-Host "  - $port" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Do you want to continue anyway? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "Startup cancelled." -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "Starting all services..." -ForegroundColor Green
Write-Host ""

# 1. Start Backend Try1 (port 8000)
Write-Host "1. Starting Backend Try1 (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Backend Try1 (OpenStitching)' -ForegroundColor Cyan; python main.py"
Start-Sleep -Seconds 2

# 2. Start Backend Try2 (port 8001)
Write-Host "2. Starting Backend Try2 (port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend_try2; Write-Host 'Backend Try2 (Detailed Stitcher)' -ForegroundColor Cyan; python main.py"
Start-Sleep -Seconds 2

# 3. Start Frontend (port 5173)
Write-Host "3. Starting Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host 'Frontend (Vite + React)' -ForegroundColor Cyan; npm run dev"
Start-Sleep -Seconds 3

# 4. Start Ngrok tunnels
Write-Host "4. Starting Ngrok tunnels..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Ngrok Tunnels' -ForegroundColor Cyan; ngrok start --all --config=ngrok.yml"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:      http://localhost:5173" -ForegroundColor White
Write-Host "  Backend Try1:  http://localhost:8000" -ForegroundColor White
Write-Host "  Backend Try2:  http://localhost:8001" -ForegroundColor White
Write-Host ""
Write-Host "Ngrok URLs:" -ForegroundColor Cyan
Write-Host "  Check the Ngrok terminal window for public URLs" -ForegroundColor White
Write-Host "  Or visit: http://localhost:4040 (Ngrok dashboard)" -ForegroundColor White
Write-Host ""
Write-Host "Backend Selection:" -ForegroundColor Yellow
Write-Host "  Use the ⚙️ Backend Selector in the UI to switch between Try1 and Try2" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "  Close all PowerShell windows or run: .\stop-all.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
