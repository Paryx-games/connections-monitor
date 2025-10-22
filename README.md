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

- **Node.js** (version 14 or higher)
- **Windows** with PowerShell (for network data retrieval)
- **IPinfo.io Account**: Required for geographic data (free tier available)

## Installation

Choose one of the following installation methods:

### Option 1: MSI Installer (Recommended for Windows)

> [!TIP]
> This is recommended for Windows as it will do everything for you.

1. Download the latest MSI installer from the [Releases](https://github.com/yourusername/connections-monitor/releases) page.
2. Run the MSI file and follow the installation wizard.
3. Launch the application from the Start menu or desktop shortcut.

### Option 2: Zip Folder Download (not recommended)

> [!WARNING]
> This is not recommended unless you know what you are doing.

1. Download the latest ZIP file from the [Releases](https://github.com/yourusername/connections-monitor/releases) page.
2. Extract the ZIP file to a folder of your choice.
3. Open a command prompt or PowerShell in the extracted folder.
4. Proceed to the "Configuration" section below.

### Option 3: Git Clone (For Developers)

> [!CAUTION]
> We will not provide help if you build from the source. Only use this if you are actively contributing to our project.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Paryx-games/connections-monitor.git
   cd connections-monitor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. Proceed to the "Configuration" section below.

## Configuration

1. Open `config.yml` in a text editor.
2. Get your IPinfo token from [https://ipinfo.io/account/token](https://ipinfo.io/account/token) (free tier available).
3. Replace `"abc123cba"` with your actual token.
4. Optionally, adjust other settings like `refreshInterval`, `highlightedPorts`, `colors`, `columns`, etc.

## Running the Application

- **If installed via MSI**: Launch from the Start menu or desktop shortcut.
- **If downloaded as ZIP or cloned**: Run `node scanner.js` in the application folder.

The output will display a real-time table of network connections.

## Configuration

Edit `config.yml` to customize settings:

```yaml
# this is a rough representation, visit config.yml for all the settings
ipToken: "abc123cba"

refreshInterval: 2000

highlightedPorts:
  '3389': '#FF0000'
  '445': '#800080'

colors:
  tcp:
    listening: 'green'
    established: 'yellow'
    other: 'white'
  udp: 'cyan'


logErrors: true

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

columnOrder: ['Proto', 'Local', 'Port', 'Foreign', 'State', 'PID', 'Process', 'Geo', 'Bytes', 'Age']
```

## Usage

Run the application:

```bash
node scanner.js
```

The output will display a table with the following columns:
- **Proto**: Protocol (TCP or UDP)
- **Local**: Local address and port
- **Foreign**: Remote address and port (or '-' for UDP)
- **State**: Connection state (TCP only)
- **PID**: Process ID
- **Process**: Process name
- **Geo**: Geographic location (country)
- **Bytes**: Data transferred (placeholder, currently 0)
- **Age**: Time since connection was first seen

## Color Coding

- **Risky Ports**: Highlighted in colors (e.g., RDP in red, SMB in magenta)
- **TCP States**:
  - Listening: Green
  - Established: Yellow
  - Others: White
- **UDP**: Cyan

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for educational and monitoring purposes only. Ensure you have permission to monitor network activity on the systems you use it on.