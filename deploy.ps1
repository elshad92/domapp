# DomApp Deploy Script (PowerShell v3 - SSH pipe)
# Deploys backend, frontend, and bot via Docker
# Uses sshpass for password authentication + tar pipe for fast transfer

$SERVER = "root@51.38.119.218"
$REMOTE_DIR = "/opt/domapp"
$SSH_PASSWORD = "DpXWg9oz38fO"
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
  --exclude=".git" `
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
& $env:ComSpec /c "set SSHPASS=$SSH_PASSWORD && $SSHPASS -e ssh -o StrictHostKeyChecking=no $SERVER mkdir -p $REMOTE_DIR"

Write-Host ""
Write-Host "[3/4] Copying archive via SSH pipe..."
& $env:ComSpec /c "set SSHPASS=$SSH_PASSWORD && type $ARCHIVE | $SSHPASS -e ssh -o StrictHostKeyChecking=no $SERVER 'cd $REMOTE_DIR && tar -xf - && cp .env.production .env'"

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

& $env:ComSpec /c "set SSHPASS=$SSH_PASSWORD && $SSHPASS -e ssh -o StrictHostKeyChecking=no $SERVER '$SSH_COMMANDS'"

# Cleanup
Remove-Item -Path $ARCHIVE -Force -ErrorAction SilentlyContinue
Write-Host "  -> Local archive cleaned up"

Write-Host ""
Write-Host "============================================"
Write-Host "  Done!"
Write-Host "============================================"
