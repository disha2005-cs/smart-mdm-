# PowerShell script to create .env file for frontend

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Create Frontend .env File" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "First, start backend ngrok in another window:" -ForegroundColor White
Write-Host "   ngrok http 8000`n" -ForegroundColor Green

Write-Host "Then, copy the HTTPS URL and paste it below." -ForegroundColor White
Write-Host "Example: https://abc-123-xyz.ngrok-free.app`n" -ForegroundColor Yellow

$backendUrl = Read-Host "Enter your backend ngrok HTTPS URL"

if ($backendUrl -notmatch "^https://") {
    Write-Host "`n❌ Error: URL must start with https://" -ForegroundColor Red
    exit
}

$envContent = "VITE_API_URL=$backendUrl/api/v1"
$envPath = "c:\Disha_project\frontend-new\.env"

$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "`n✅ Created .env file at:" -ForegroundColor Green
Write-Host "   $envPath`n" -ForegroundColor White

Write-Host "Content:" -ForegroundColor Yellow
Write-Host "   $envContent`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Next Steps:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Restart frontend:" -ForegroundColor White
Write-Host "   cd c:\Disha_project\frontend-new" -ForegroundColor Green
Write-Host "   npm run dev`n" -ForegroundColor Green

Write-Host "2. Access your ngrok URL:" -ForegroundColor White
Write-Host "   https://hopeless-polly-unexpectably.ngrok-free.dev/`n" -ForegroundColor Green

Write-Host "Done! 🎉`n" -ForegroundColor Green
