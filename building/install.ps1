# Connections Monitor - User Installation (No Admin Required)
# This script installs the application to your user profile without requiring administrator rights

$ErrorActionPreference = "Stop"

function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Host @"
=======================================================
  Connections Monitor - User Installation
  (No Administrator Rights Required)
=======================================================
"@ -ForegroundColor Cyan

$UserProfile = $env:USERPROFILE
$InstallDir = Join-Path $env:LOCALAPPDATA "ConnectionsMonitor"
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Connections Monitor"

Write-Info "`nInstallation will be in your user profile:"
Write-Host "  Location: $InstallDir" -ForegroundColor White

Write-Info "`n[1/5] Checking Prerequisites..."
$nodeVersion = $null
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Success "  ✓ Node.js found: $nodeVersion"
        
        # Check if version is 18 or higher
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 18) {
            Write-Warning "  ⚠ Node.js $nodeVersion detected. Version 18+ is recommended."
            Write-Warning "    The app may still work, but please consider upgrading."
        }
    }
}
catch {
    Write-Error "  ✗ Node.js not found!"
    Write-Host ""
    Write-Warning "Node.js is required but not installed."
    Write-Host ""
    Write-Host "Without administrator rights, you have two options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install Node.js to your user profile (no admin needed)" -ForegroundColor White
    Write-Host "  1. Download Node.js from: https://nodejs.org/en/download/" -ForegroundColor Gray
    Write-Host "  2. Run the installer and choose 'Install for current user only'" -ForegroundColor Gray
    Write-Host "  3. Make sure to check 'Add to PATH'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Use portable Node.js (advanced)" -ForegroundColor White
    Write-Host "  1. Download portable: https://nodejs.org/dist/latest-v20.x/" -ForegroundColor Gray
    Write-Host "  2. Extract to a folder in your user profile" -ForegroundColor Gray
    Write-Host "  3. Add the folder to your PATH environment variable" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installing Node.js, run this script again." -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "`n[2/5] Configuration Setup..."

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Connections Monitor - Configuration"
$form.Size = New-Object System.Drawing.Size(500, 350)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Configure Your Connections Monitor"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$titleLabel.Size = New-Object System.Drawing.Size(450, 25)
$form.Controls.Add($titleLabel)

$pathLabel = New-Object System.Windows.Forms.Label
$pathLabel.Text = "Installation Location (User Profile):"
$pathLabel.Location = New-Object System.Drawing.Point(20, 60)
$pathLabel.Size = New-Object System.Drawing.Size(450, 20)
$form.Controls.Add($pathLabel)

$pathTextBox = New-Object System.Windows.Forms.TextBox
$pathTextBox.Text = $InstallDir
$pathTextBox.Location = New-Object System.Drawing.Point(20, 85)
$pathTextBox.Size = New-Object System.Drawing.Size(450, 25)
$pathTextBox.ReadOnly = $false
$form.Controls.Add($pathTextBox)

$tokenLabel = New-Object System.Windows.Forms.Label
$tokenLabel.Text = "IPinfo.io API Token (optional - leave blank for limited features):"
$tokenLabel.Location = New-Object System.Drawing.Point(20, 120)
$tokenLabel.Size = New-Object System.Drawing.Size(450, 20)
$form.Controls.Add($tokenLabel)

$tokenTextBox = New-Object System.Windows.Forms.TextBox
$tokenTextBox.Location = New-Object System.Drawing.Point(20, 145)
$tokenTextBox.Size = New-Object System.Drawing.Size(450, 25)
$tokenTextBox.Text = ""
$form.Controls.Add($tokenTextBox)

$intervalLabel = New-Object System.Windows.Forms.Label
$intervalLabel.Text = "Scan Refresh Interval (seconds):"
$intervalLabel.Location = New-Object System.Drawing.Point(20, 180)
$intervalLabel.Size = New-Object System.Drawing.Size(450, 20)
$form.Controls.Add($intervalLabel)

$intervalTextBox = New-Object System.Windows.Forms.TextBox
$intervalTextBox.Location = New-Object System.Drawing.Point(20, 205)
$intervalTextBox.Size = New-Object System.Drawing.Size(100, 25)
$intervalTextBox.Text = "30"
$form.Controls.Add($intervalTextBox)

$infoLabel = New-Object System.Windows.Forms.Label
$infoLabel.Text = "Get a free API token at: https://ipinfo.io/signup (50,000 requests/month)"
$infoLabel.Location = New-Object System.Drawing.Point(20, 240)
$infoLabel.Size = New-Object System.Drawing.Size(450, 30)
$infoLabel.ForeColor = [System.Drawing.Color]::Gray
$form.Controls.Add($infoLabel)

$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = "Install"
$installButton.Location = New-Object System.Drawing.Point(300, 270)
$installButton.Size = New-Object System.Drawing.Size(80, 30)
$installButton.DialogResult = [System.Windows.Forms.DialogResult]::OK
$form.Controls.Add($installButton)
$form.AcceptButton = $installButton

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Cancel"
$cancelButton.Location = New-Object System.Drawing.Point(390, 270)
$cancelButton.Size = New-Object System.Drawing.Size(80, 30)
$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.Controls.Add($cancelButton)
$form.CancelButton = $cancelButton

$result = $form.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::Cancel) {
    Write-Warning "`nInstallation cancelled by user."
    exit 0
}

$InstallDir = $pathTextBox.Text
$ipToken = $tokenTextBox.Text
$refreshInterval = $intervalTextBox.Text

Write-Success "  Configuration received"

if (-not ($refreshInterval -match '^\d+$')) {
    Write-Warning "  Invalid refresh interval. Using default: 30"
    $refreshInterval = "30"
}

Write-Info "`n[3/5] Creating Installation Directory..."
if (Test-Path $InstallDir) {
    Write-Warning "  Directory already exists. It will be updated."
}
else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Success "  ✓ Directory created: $InstallDir"
}
Write-Info "`n[4/5] Installing Application Files..."
$sourceDir = Split-Path -Parent $PSScriptRoot

Copy-Item -Path (Join-Path $sourceDir "src") -Destination (Join-Path $InstallDir "src") -Recurse -Force
Write-Success "  ✓ Copied src/"

Copy-Item -Path (Join-Path $sourceDir "package.json") -Destination $InstallDir -Force
Copy-Item -Path (Join-Path $sourceDir "package-lock.json") -Destination $InstallDir -Force -ErrorAction SilentlyContinue
Write-Success "  ✓ Copied package files"

$configPath = Join-Path $InstallDir "config.yml"
if (-not (Test-Path $configPath)) {
    if (Test-Path (Join-Path $sourceDir "config.yml")) {
        Copy-Item -Path (Join-Path $sourceDir "config.yml") -Destination $InstallDir -Force
        Write-Success "  Copied config.yml template"
    }
}

Write-Info "  Installing Node.js dependencies..."
$originalLocation = Get-Location
try {
    Set-Location $InstallDir
    $npmOutput = npm install --production 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ Dependencies installed successfully"
    }
    else {
        Write-Warning "  ⚠ Some warnings during npm install (app should still work)"
    }
}
catch {
    Write-Warning "  ⚠ Error during npm install: $_"
    Write-Warning "  You may need to run 'npm install' manually in: $InstallDir"
}
finally {
    Set-Location $originalLocation
}

Write-Info "`n[5/5] Configuring Application..."
$configContent = @"
# Connections Monitor Configuration File
# Generated by user installer

# IPinfo.io API token for geo-location features
# Get a free token at: https://ipinfo.io/signup
ipToken: "$ipToken"

# Scan refresh interval in seconds
refreshInterval: $refreshInterval

# Display settings
showLocalAddresses: true
showRemoteAddresses: true
showPorts: true
showProcessNames: true

# Filter settings
excludeLocalhost: true
excludeSystemProcesses: false

# Export settings
exportFormat: "json"
exportPath: "./exports"

# Logging
logLevel: "info"
logFile: "./connections-monitor.log"
"@

Set-Content -Path $configPath -Value $configContent -Encoding UTF8
Write-Success "  ✓ Configuration file created"

Write-Info "`nCreating Start Menu Shortcut..."
if (-not (Test-Path $StartMenuDir)) {
    New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut((Join-Path $StartMenuDir "Connections Monitor.lnk"))
$Shortcut.TargetPath = "node.exe"
$Shortcut.Arguments = "`"$InstallDir\src\scanner.js`""
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Network Connections Monitor"
$Shortcut.Save()
Write-Success "  Start Menu shortcut created (User)"

$response = [System.Windows.Forms.MessageBox]::Show(
    "Would you like to create a Desktop shortcut?",
    "Desktop Shortcut",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
)

if ($response -eq [System.Windows.Forms.DialogResult]::Yes) {
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $DesktopShortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "Connections Monitor.lnk"))
    $DesktopShortcut.TargetPath = "node.exe"
    $DesktopShortcut.Arguments = "`"$InstallDir\src\scanner.js`""
    $DesktopShortcut.WorkingDirectory = $InstallDir
    $DesktopShortcut.Description = "Network Connections Monitor"
    $DesktopShortcut.Save()
    Write-Success "  ✓ Desktop shortcut created"
}

Write-Host ""
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Info "Installed to: $InstallDir"
Write-Host ""
Write-Host "To run the application:" -ForegroundColor White
Write-Host "  1. Open Start Menu → Connections Monitor" -ForegroundColor Cyan
Write-Host "  2. Or run: node `"$InstallDir\src\scanner.js`"" -ForegroundColor Cyan
Write-Host ""
Write-Info "Configuration file: $configPath"
Write-Host ""
Write-Host "Enjoy monitoring your network connections!" -ForegroundColor Green
Write-Host ""

$runNow = [System.Windows.Forms.MessageBox]::Show(
    "Installation complete! Would you like to run Connections Monitor now?",
    "Launch Application",
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
)

if ($runNow -eq [System.Windows.Forms.DialogResult]::Yes) {
    Write-Info "Launching Connections Monitor..."
    Start-Process -FilePath "node.exe" -ArgumentList "`"$InstallDir\src\scanner.js`"" -WorkingDirectory $InstallDir
}

Read-Host "`nPress Enter to exit"