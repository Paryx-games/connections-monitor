# Connections Monitor

A Node.js application that monitors and displays active TCP and UDP network connections on Windows systems in real-time. It provides detailed information including process names, geographic locations of remote IPs, connection states, and more.

> [!NOTE]
> We accept pull requests and issues so long as they follow our guidelines.

> [!IMPORTANT]
> It may take a few days to implement or merge pull requests due to maintainers being busy or other important issues or priorities.

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

### Quick Start

1. **Download** the latest release from [Releases](https://github.com/Paryx-games/connections-monitor/releases)
2. **Unzip** the files to any folder
3. **Configure** your IPinfo.io token in `config.yml`
4. **Run** the application (see below)

### For Developers: Clone from Source

> [!CAUTION]

```powershell
# Clone the repository
git clone https://github.com/Paryx-games/connections-monitor.git
cd connections-monitor
```
> [!TIP]
> If you're cloning this repo, ensure you've installed Node.js first and have all dependencies installed.

```powershell
# Install dependencies
npm install
```

**Configure**

Edit config.yml and add your IPinfo.io token

**Run the script**
```
npm start
```

---

## Configuration

Edit [`config.yml`](CONFIG.YML) to customize settings:

```yaml
# Get your IP token from https://ipinfo.io/account/token
# Sign up if needed, this will access Geo info
ipToken: "abc123cba"

# Refresh interval in milliseconds (default: 2000)
# Smaller is faster but uses more CPU
refreshInterval: 2000

# Highlighted ports: object mapping ports to custom hex colors
highlightedPorts:
  '21': '#FFFF00'       # FTP - Yellow
  '22': '#FFA500'       # SSH - Orange
  '23': '#FF0000'       # Telnet - Red
  '25': '#800080'       # SMTP - Purple
  '53': '#00FFFF'       # DNS - Cyan
  '80': '#FFFFFF'       # HTTP - White
  '110': '#FFFF00'      # POP3 - Yellow
  '135': '#00FFFF'      # RPC - Cyan
  '139': '#FFFF00'      # NetBIOS - Yellow
  '143': '#800080'      # IMAP - Purple
  '443': '#008000'      # HTTPS - Green
  '445': '#800080'      # SMB - Purple
  '993': '#FFFF00'      # IMAPS - Yellow
  '995': '#FFFF00'      # POP3S - Yellow
  '3389': '#FF0000'     # RDP - Red

# Colors for TCP/UDP states: object mapping states to color names
colors:
  tcp:
    listening: 'green'
    established: 'yellow'
    close_wait: 'red'
    time_wait: 'magenta'
    other: 'white'
  udp: 'cyan'

# Columns to display: object with column names as keys and true/false to enable
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

# Column widths: object mapping column names to widths
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

# Column order: array specifying the order of columns (must match columns array)
columnOrder: ['Proto', 'Local', 'Port', 'Foreign', 'State', 'PID', 'Process', 'Geo', 'Bytes', 'Age']
```

---

## Running the Application

### Option 1: Using the batch file
```
run.bat
```

### Option 2: Using Node directly
```
node src/scanner.js
```

### Option 3: Using npm (if cloned from source)
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

- **Highlighted Ports**: Highlighted in colors (RDP=red, SMB=purple, SSH=orange)
- **TCP States**:
  - Listening: Green
  - Established: Yellow
  - Others: White
- **UDP**: Cyan

---

## Getting IPinfo.io Token

1. Visit: https://ipinfo.io/signup
2. Sign up (free account)
3. Copy your token from the dashboard
4. Add to `config.yml`:
   ```yaml
   ipToken: "abc123cba" # replace with your actual token
   ```

**Free tier:** 50,000 requests/month, no credit card required

**Paid tier:** Unlimited requests, but not required for free usage

---

## Troubleshooting

### "Node.js not found"
Install Node.js from: https://nodejs.org/
- Choose "Install for current user only" (no admin needed)
- Make sure "Add to PATH" is checked

### "node is not recognized"
Close and reopen your terminal after installing Node.js, or restart your computer.

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

> [!WARNING]
> Please keep the structure like this to keep the scripts working correctly.

```
connections-monitor/
├── src/
│   └── scanner.js          # You can put other files here
├── run.bat                 # Batch file to run the app
├── config.yml              # Configuration file
├── package.json            # Dependencies
└── README.md               # This file
```

> [!IMPORTANT]
> DO NOT change [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), [run.bat](run.bat), or [README.md](README.md)

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the application |
| `npm install` | Install dependencies |

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. Do not attempt to change the license.

---

## Disclaimer

This tool is for educational and monitoring purposes only. Ensure you have permission to monitor network activity on the systems you use it on.

---

## Support

- **Issues:** https://github.com/Paryx-games/connections-monitor/issues
- **Discussions:** https://github.com/Paryx-games/connections-monitor/discussions

---

**Enjoy monitoring your network connections!**