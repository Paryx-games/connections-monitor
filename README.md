# Connections Monitor

A Node.js application that monitors and displays active TCP and UDP network connections on Windows systems in real-time. It provides detailed information including process names, geographic locations of remote IPs, connection states, and more.

> [!NOTE]
> We accept Pull Requests and Issues so long as they follow our guidelines.

> [!IMPORTANT]
> It may take a few days to implement or merge pull requests due to business or other issues.

## Features

- **Real-time Monitoring**: Continuously scans and displays network connections every 2 seconds (configurable).
- **TCP & UDP Support**: Monitors both TCP connections and UDP endpoints.
- **Process Information**: Shows the process name associated with each connection.
- **Geographic Data**: Fetches country information for remote IP addresses using IPinfo.io.
- **Color-coded Output**: Highlights risky ports and connection states for easy identification.
- **Configurable**: Uses a YAML config file for settings like API tokens and refresh intervals.

## Prerequisites

- **Node.js** (version 18 or higher)
- **Windows** with PowerShell 5.1+
- **IPinfo.io Account**: Required for geographic data (free tier available)

---

## Installation

### For End Users: Download the Installer EXE

1. **Download** `ConnectionsMonitor-Installer.exe` from the [Releases](https://github.com/Paryx-games/connections-monitor/releases) page
2. **Double-click** the installer
3. **Follow the wizard** to configure and install
4. **Launch** from Start Menu!

**No administrator rights required!** ✅

---

### For Developers: Build From Source

#### Quick Install:

```powershell
# Clone the repository
git clone https://github.com/Paryx-games/connections-monitor.git
cd connections-monitor

# Run the installer
npm run install-app
```

#### Manual Install:

```powershell
# Install dependencies
npm install

# Configure
# Edit config.yml and add your IPinfo.io token

# Run
npm start
```

---

## Building the Installer

Want to build the installer EXE yourself?

```powershell
# Builds: ConnectionsMonitor-Installer.exe
npm run build-installer
```

See [BUILD_EXE_INSTRUCTIONS.md](BUILD_EXE_INSTRUCTIONS.md) for detailed instructions.

**Requirements:**
- PS2EXE PowerShell module (automatically installed by build script)

---

## Configuration

Edit `config.yml` to customize settings:

```yaml
# Get your token from: https://ipinfo.io/signup (free tier: 50k requests/month)
ipToken: "your_token_here"

# How often to scan connections (milliseconds)
refreshInterval: 2000

# Highlight risky ports
highlightedPorts:
  '3389': '#FF0000'  # RDP - Red
  '445': '#800080'   # SMB - Purple
  '22': '#FFA500'    # SSH - Orange

# Color scheme
colors:
  tcp:
    listening: 'green'
    established: 'yellow'
    other: 'white'
  udp: 'cyan'

# Display options
logErrors: true

# Columns to show
columns:
  Proto: true
  Local: true
  Port: true
  Foreign: true
  State: true
  PID: true
  Process: true
  Geo: true
  Bytes: true
  Age: true

# Column widths
columnWidths:
  Proto: 5
  Local: 22
  Port: 6
  Foreign: 22
  State: 12
  PID: 6
  Process: 25
  Geo: 8
  Bytes: 8
  Age: 6

# Column order
columnOrder: ['Proto', 'Local', 'Port', 'Foreign', 'State', 'PID', 'Process', 'Geo', 'Bytes', 'Age']
```

---

## Running the Application

### If Installed via EXE Installer:
- Open **Start Menu** → Search for **"Connections Monitor"**
- Click to launch

### If Running from Source:
```powershell
npm start
```

Or directly:
```powershell
node src/scanner.js
```

---

## Usage

The output displays a real-time table with the following columns:

| Column | Description |
|--------|-------------|
| **Proto** | Protocol (TCP or UDP) |
| **Local** | Local address and port |
| **Foreign** | Remote address and port |
| **State** | Connection state (TCP only) |
| **PID** | Process ID |
| **Process** | Process name |
| **Geo** | Geographic location (country) |
| **Bytes** | Data transferred |
| **Age** | Time since connection started |

### Color Coding

- **Risky Ports**: Highlighted in colors (RDP=red, SMB=purple, SSH=orange)
- **TCP States**:
  - Listening: Green
  - Established: Yellow
  - Others: White
- **UDP**: Cyan

---

## Installation Locations

When installed via the EXE installer, files are placed in your user profile:

- **Application:** `%LOCALAPPDATA%\ConnectionsMonitor`
- **Config:** `%LOCALAPPDATA%\ConnectionsMonitor\config.yml`
- **Start Menu:** User Start Menu → Connections Monitor

**Full path:** `C:\Users\YourName\AppData\Local\ConnectionsMonitor`

---

## Uninstallation

### If Installed via EXE:
1. Delete the application folder:
   ```powershell
   Remove-Item -Path "$env:LOCALAPPDATA\ConnectionsMonitor" -Recurse -Force
   ```
2. Delete Start Menu shortcut:
   ```powershell
   Remove-Item -Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Connections Monitor" -Recurse -Force
   ```

### If Running from Source:
Just delete the repository folder.

---

## Getting IPinfo.io Token

1. Visit: https://ipinfo.io/signup
2. Sign up (free account)
3. Copy your token from the dashboard
4. Add to `config.yml`:
   ```yaml
   ipToken: "your_token_here"
   ```

**Free tier:** 50,000 requests/month

---

## Troubleshooting

### "Node.js not found"
Install Node.js from: https://nodejs.org/
- Choose "Install for current user only" (no admin needed)
- Make sure "Add to PATH" is checked

### "Cannot run scripts"
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### "npm not found"
Close and reopen PowerShell after installing Node.js.

### "Application won't start"
Check Node.js version (must be 18+):
```powershell
node --version
```

---

## Development

### Project Structure

```
connections-monitor/
├── src/
│   └── scanner.js          # Main application
├── install.ps1             # Installer script
├── build-installer-exe.ps1 # Builds the EXE installer
├── config.yml              # Configuration file
├── package.json            # Dependencies
└── README.md               # This file
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the application |
| `npm run install-app` | Run the installer wizard |
| `npm run build-installer` | Build the EXE installer |

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

This tool is for educational and monitoring purposes only. Ensure you have permission to monitor network activity on the systems you use it on.

---

## Support

- **Issues:** https://github.com/Paryx-games/connections-monitor/issues
- **Discussions:** https://github.com/Paryx-games/connections-monitor/discussions

---

**Enjoy monitoring your network connections! 🚀**