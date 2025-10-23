# Connections Monitor

Real-time network connection monitoring for Windows. See what's connecting to your system, where it's coming from, and which programs are responsible.

> [!IMPORTANT]  
> This tool is for authorized network monitoring only. Do not use for unauthorized surveillance, hacking, or illegal activities. Always respect privacy laws and obtain proper authorization before monitoring network traffic.

---

## What It Does

- Monitors active TCP and UDP connections in real-time
- Shows which programs are making connections
- Displays geographic location of remote IPs
- Color-codes ports and states to highlight potential risks
- Tracks how long connections have been active
- **Real bandwidth tracking** and connection statistics
- **Top talkers** display showing most active processes
- **DNS resolution** to resolve IPs to hostnames
- **Webhook alerts** for Discord, Slack, and custom endpoints
- **Port knock detection** for security monitoring
- **VPN detection** to identify VPN connections
- **Advanced filtering** by IP, protocol, port, process, country
- **Electron dashboard** with React for visual monitoring
- **Historical graphs** with configurable timeframes
- **Export functionality** (CSV/JSON)
- Fully configurable through a simple YAML file

---

## Requirements

- Node.js v18 or higher
- Windows with PowerShell 5.1+
- IPinfo.io account (free tier available)

> [!TIP]  
> Download Node.js from [nodejs.org](https://nodejs.org/). The LTS version is recommended.

---

## Installation

### For Regular Users

1. Download the latest release from [Releases](https://github.com/Paryx-games/connections-monitor/releases)
2. Extract to any folder
3. Get your free API token from [ipinfo.io/signup](https://ipinfo.io/signup)
4. Open `config.yml` and add your token
5. Run `run.bat`

> [!NOTE]  
> The first run takes a moment to fetch geolocation data for your active connections.

### For Developers

> [!WARNING]  
> Only clone from source if you plan to contribute or customize the code. Regular users should download releases.

```bash
git clone https://github.com/Paryx-games/connections-monitor.git
cd connections-monitor
npm install
```

Edit `config.yml` with your IPinfo token, then run:

```bash
npm start
```

> [!CAUTION]  
> When contributing, do not modify `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, or `run.bat`. See our [contribution guidelines](CONTRIBUTING.md) for details.

---

## Configuration

Edit `config.yml` to customize behavior:

### API Token

```yaml
ipToken: "your_token_here"
```

Get your token from [ipinfo.io/account/token](https://ipinfo.io/account/token). Free accounts get 50,000 requests per month.

### Refresh Rate

```yaml
refreshInterval: 2000
```

How often to update in milliseconds. Lower values = faster updates but more CPU usage.

> [!TIP]  
> Set to 5000 (5 seconds) on slower systems or to reduce API usage.

### Port Highlighting

Highlight specific ports with custom colors:

```yaml
highlightedPorts:
  '22': '#FFA500'     # SSH - Orange
  '23': '#FF0000'     # Telnet - Red
  '443': '#008000'    # HTTPS - Green
  '3389': '#FF0000'   # RDP - Red
```

> [!NOTE]  
> Port highlights override state-based colors. Use red for high-risk ports.

### State Colors

```yaml
colors:
  tcp:
    listening: 'green'
    established: 'yellow'
    close_wait: 'red'
    time_wait: 'magenta'
    other: 'white'
  udp: 'cyan'
```

### Columns

Toggle columns on/off:

```yaml
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
```

Adjust column widths:

```yaml
columnWidths:
  Process: 35
  Local: 25
```

Change column order:

```yaml
columnOrder: ['Proto', 'Port', 'Process', 'Foreign', 'State', 'Geo', 'Age']
```

> [!TIP]  
> Disable the Bytes column if you don't need it. It currently shows 0B as a placeholder.

---

## Usage

### Starting the Monitor

**Terminal Mode (Default):**
```bash
# Windows batch file (easiest)
run.bat

# Direct Node.js
node src/scanner.js

# NPM script (if installed from source)
npm start
```

**Dashboard Mode:**
```bash
# Run dashboard with visual interface
npm run dashboard

# This starts:
# 1. Dashboard server (port 3000)
# 2. Electron window with React interface
# 3. Scanner feeding data to dashboard
```

> [!TIP]
> See [FEATURES.md](FEATURES.md) for complete documentation of all advanced features.

### Understanding Output

The monitor displays a table with these columns:

| Column | Description |
|--------|-------------|
| Proto | Protocol (TCP or UDP) |
| Local | Your computer's address and port |
| Port | Local port number |
| Foreign | Remote address and port |
| State | Connection status (TCP only) |
| PID | Process ID |
| Process | Program name |
| Geo | Country code of remote IP |
| Bytes | Data transferred (placeholder) |
| Age | How long the connection has been active |

### Color Coding

Colors help you spot issues quickly:

- **Green**: Listening ports (your computer waiting for connections)
- **Yellow**: Established connections (currently active)
- **Red**: High-risk ports or closing connections
- **Magenta**: Time-wait state
- **Orange**: SSH connections
- **Purple**: Mail or SMB ports
- **Cyan**: All UDP traffic

> [!NOTE]  
> Red connections should be investigated if unexpected. They often indicate risky services like RDP or Telnet.

---

## Troubleshooting

### Node.js Not Found

```bash
node --version
```

If this fails, install Node.js from [nodejs.org](https://nodejs.org/). Make sure "Add to PATH" is checked during installation.

> [!TIP]  
> Restart your terminal or computer after installing Node.js.

### Cannot Run Scripts

If PowerShell blocks the script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

> [!WARNING]  
> Only bypass execution policy for trusted scripts. This setting resets when you close PowerShell.

### Application Won't Start

Check Node.js version:

```bash
node --version
```

Must be v18 or higher. If correct, verify dependencies:

```bash
npm install
```

Check that `config.yml` has a valid IPinfo token.

### Unknown Values

**Process shows "Unknown"**: The process may have ended, or you need admin rights to see it.

**Geo shows "Unknown"**: The IP is private/local, or you've hit IPinfo rate limits.

### Too Many API Requests

> [!CAUTION]  
> Free IPinfo accounts allow 50k requests/month. If you hit the limit:
> - Increase `refreshInterval` to 5000+ milliseconds
> - Monitor during specific time periods only
> - Consider a paid plan for unlimited requests

---

## Development

### Project Structure

```
connections-monitor/
├── src/
│   └── scanner.js          # Main application
├── run.bat                 # Windows launcher
├── config.yml              # Configuration
├── package.json            # Dependencies
├── LICENSE                 # MIT License
├── CONTRIBUTING.md         # How to contribute
├── CODE_OF_CONDUCT.md      # Community standards
└── README.md               # This file
```

> [!IMPORTANT]  
> Keep this structure intact for scripts to work correctly.

### Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run the application |
| `npm install` | Install dependencies |
| `node src/scanner.js` | Run directly |

### Contributing

> [!TIP]  
> Before contributing:
> 1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
> 2. Review [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
> 3. Test changes thoroughly on Windows
> 4. Keep dependencies updated in `package.json`

---

## Contributing

We welcome pull requests and issues! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add my feature'`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

> [!NOTE]  
> Pull requests may take a few days to review. Maintainers balance this project with other priorities.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

> [!CAUTION]  
> Do not modify or remove the license. It protects both contributors and users.

---

## Support

- **Bug Reports**: [Open an Issue for "Bug Report"](https://github.com/Paryx-games/connections-monitor/issues)
- **Feature Requests**: [Open an Issue for "Feature Request"](https://github.com/Paryx-games/connections-monitor/issues)
- **Questions**: Check this README first, then ask in Issues

> [!TIP]  
> Search existing issues before opening new ones to avoid duplicates.

---

## Credits

- Built by [Paryx](https://github.com/Paryx-games)
- Geolocation data from [IPinfo.io](https://ipinfo.io)
- Terminal colors by [chalk](https://github.com/chalk/chalk)

---

**Happy monitoring. Stay secure.**