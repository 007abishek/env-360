# Frontend Only Startup Script
# Starts just the frontend development server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if port 5173 is available
Write-Host "Checking port 5173..." -ForegroundColor Yellow

$connection = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($connection) {
    Write-Host ""
    Write-Host "Warning: Port 5173 is already in use!" -ForegroundColor Red
    Write-Host "Do you want to continue anyway? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "Startup cancelled." -ForegroundColor Red
        exit 0
    }
}

Write-Host ""
Write-Host "Starting Frontend..." -ForegroundColor Green
Write-Host ""

# Change to frontend directory and start dev server
Set-Location frontend
npm run dev