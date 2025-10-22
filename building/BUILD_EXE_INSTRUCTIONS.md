# Building the Installer EXE

This guide shows you how to build a standalone **EXE installer** that users can just double-click to install Connections Monitor.

---

## Quick Start

### Build the EXE:

```powershell
.\build-installer-exe.ps1
```

**Output:** `ConnectionsMonitor-Installer.exe` 

**That's it!** Now distribute the EXE file to users.

---

## Prerequisites for Building

You need **PS2EXE** to convert PowerShell scripts to EXE files.

The build script will **automatically install it** for you, but if you need to install manually:

```powershell
Install-Module -Name PS2EXE -Scope CurrentUser
```

---

## Building the Installer

### Method 1: Using the Build Script (Recommended)

```powershell
# Open PowerShell (no admin needed)
cd "c:\Users\YourName\Downloads\connections-monitor"

# Run the build script
.\build-installer-exe.ps1
```

The script will:
1. Check for PS2EXE module (installs if missing)
2. Convert `install.ps1` to `ConnectionsMonitor-Installer.exe`
3. Verify the output

### Method 2: Manual Build

If you prefer to build manually:

```powershell
# Install PS2EXE
Install-Module -Name PS2EXE -Scope CurrentUser
Import-Module PS2EXE

# Build the EXE
Invoke-PS2EXE -inputFile "install.ps1" `
              -outputFile "ConnectionsMonitor-Installer.exe" `
              -title "Connections Monitor Installer" `
              -description "Connections Monitor Installation Wizard" `
              -version "1.0.0.0" `
              -noConsole:$false `
              -requireAdmin:$false
```

---

## What You Get

**Output File:** `ConnectionsMonitor-Installer.exe`

---

## Customizing the Installer

Edit `install.ps1` before building to customize:

### Change Default Install Location:
```powershell
# Line 21
$InstallDir = Join-Path $env:LOCALAPPDATA "ConnectionsMonitor"
# Change to whatever you want
```

### Change App Name:
```powershell
# Line 14-16
"  Connections Monitor - User Installation"
# Change to your app name
```

### Add/Remove Features:
Edit the PowerShell script as needed, then rebuild:
```powershell
.\build-installer-exe.ps1
```

## Summary

**To build the installer EXE:**
```powershell
.\build-installer-exe.ps1
```

**Output:** `ConnectionsMonitor-Installer.exe`

**Users:** Just double-click to install!

**That's it!** 🚀

---

Need help? Check if `install.ps1` exists and try rebuilding. The build script handles everything automatically.