# DomApp Deploy Script (PowerShell v3 - SSH pipe)
# Deploys backend, frontend, and bot via Docker
# Uses SSH key authentication by default. Password auth is available only when
# SSH_PASSWORD is set in the local environment.

$SERVER = "root@51.38.119.218"
$REMOTE_DIR = "/opt/domapp"
$SSH_PASSWORD = $env:SSH_PASSWORD
$SSHPASS = "C:\Users\user\AppData\Local\Microsoft\WinGet\Packages\xhcoding.sshpass-win32_Microsoft.Winget.Source_8wekyb3d8bbwe\sshpass.exe"
$LOCAL_DIR = "C:\Users\user\Desktop\domapp"

Write-Host "============================================"
Write-Host "  DomApp Deploy v3 (SSH pipe)"
Write-Host "  Server: $SERVER"
Write-Host "  Remote: $REMOTE_DIR"
Write-Host "============================================"

# Step 1: Create tar archive (excluding unnecessary files)
Write-Host ""
Write-Host "[1/4] Creating tar archive..."
$ARCHIVE = "$env:TEMP\domapp_deploy.tar"

# Use tar from Windows
tar -cf $ARCHIVE `
  --exclude="node_modules" `
  --exclude="__pycache__" `
  --exclude=".env" `
  --exclude=".env.*" `
  --exclude=".git" `
  --exclude="*.log" `
  --exclude="logs" `
  --exclude="backend/logs" `
  --exclude="*.pyc" `
  --exclude=".DS_Store" `
  -C "$LOCAL_DIR\.." `
  "domapp"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create archive!"
    exit 1
}
Write-Host "  -> Archive created: $ARCHIVE"

# Step 2: Create remote directory and extract archive via SSH pipe
Write-Host ""
Write-Host "[2/4] Creating remote directory..."
if ($SSH_PASSWORD -and (Test-Path $SSHPASS)) {
    & $env:ComSpec /c "set SSHPASS=$SSH_PASSWORD && $SSHPASS -e ssh -o StrictHostKeyChecking=no $SERVER mkdir -p $REMOTE_DIR"
} else {
    ssh -o StrictHostKeyChecking=no $SERVER "mkdir -p $REMOTE_DIR"
}

Write-Host ""
Write-Host "[3/4] Copying archive via SSH pipe..."
if ($SSH_PASSWORD -and (Test-Path $SSHPASS)) {
    & $env:ComSpec /c "set SSHPASS=$SSH_PASSWORD && type $ARCHIVE | $SSHPASS -e ssh -o StrictHostKeyChecking=no $SERVER 'cd $REMOTE_DIR && tar -xf - && if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi'"
} else {
    & $env:ComSpec /c "type $ARCHIVE | ssh -o StrictHostKeyChecking=no $SERVER `"cd $REMOTE_DIR && tar -xf - && if [ ! -f .env ] && [ -f .env.example ]; then cp .env.example .env; fi`""
}

# Step 4: Deploy with Docker
Write-Host ""
Write-Host "[4/4] Deploying with Docker..."

$SSH_COMMANDS = @"
set -euo pipefail

cd /opt/domapp

echo "  -> Deploying with Docker..."
docker-compose down || true
docker-compose up --build -d

# Print status
echo ""
echo "============================================"
echo "  Deployment complete!"
echo "============================================"
docker-compose ps
"@

if ($SSH_PASSWORD -and (Test-Path $SSHPASS)) {
    & $env:ComSpec /c "set SSHPASS=$SSH_PASSWORD && $SSHPASS -e ssh -o StrictHostKeyChecking=no $SERVER '$SSH_COMMANDS'"
} else {
    ssh -o StrictHostKeyChecking=no $SERVER $SSH_COMMANDS
}

# Cleanup
Remove-Item -Path $ARCHIVE -Force -ErrorAction SilentlyContinue
Write-Host "  -> Local archive cleaned up"

Write-Host ""
Write-Host "============================================"
Write-Host "  Done!"
Write-Host "============================================"
