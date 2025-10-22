# 🚀 Connections Monitor - Advanced Features Guide

This document covers all the advanced features added to the Connections Monitor.

## 📊 Core Monitoring Features

### Real Bandwidth Tracking
The monitor now tracks real bandwidth usage for each connection:
- **Bytes transferred** per connection
- **Bandwidth rate** (bytes per second)
- **Total bandwidth** across all connections

### Connection Statistics
Real-time statistics displayed in the terminal:
- Total TCP connections
- Total UDP connections
- Overall connection count
- Aggregate bandwidth usage

Enable/disable in `config.yml`:
```yaml
monitoring:
  showStats: true
```

### Top Talkers
Displays the top 5 processes by connection count at the bottom of the terminal output.

Configure in `config.yml`:
```yaml
monitoring:
  showTopTalkers: true
  topTalkersCount: 5  # Adjust the number displayed
```

### DNS Resolution
Resolve IP addresses to hostnames for easier identification.

**Note:** This may slow down monitoring due to DNS lookups.

```yaml
resolveDNS: false  # Set to true to enable
```

## 🚨 Alert System

### Webhook Support
Send alerts to Discord, Slack, or custom webhooks when specific conditions are met.

```yaml
alerts:
  enabled: true
  webhooks:
    - url: "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"
    - url: "https://hooks.slack.com/services/YOUR_WEBHOOK_HERE"
```

The system automatically detects webhook type (Discord/Slack) and formats messages appropriately.

### Alert Conditions

```yaml
alerts:
  conditions:
    # Alert on suspicious ports
    suspiciousPorts: [23, 135, 139, 445, 3389]
    
    # Alert on new foreign connections
    newForeignConnections: true
    
    # Alert when connection count exceeds threshold
    maxConnections: 500
    
    # Alert on high bandwidth usage (bytes per second)
    maxBandwidth: 10485760  # 10 MB/s
```

## 🔍 Filtering

### IP Filtering

**Allowlist** - Only show specific IPs:
```yaml
ipFiltering:
  enabled: true
  allowlist:
    - "192.168.1.1"
    - "8.8.8.8"
```

**Blocklist** - Hide specific IPs:
```yaml
ipFiltering:
  enabled: true
  blocklist:
    - "suspicious.ip.here"
    - "10.0.0.50"
```

### Connection Filtering

Filter by protocol, port, process, or country:

```yaml
connectionFiltering:
  enabled: true
  protocols: ['TCP']  # Only show TCP
  ports: [80, 443, 8080]  # Only these ports
  processes: ['chrome.exe', 'firefox.exe']  # Only these processes
  countries: ['US', 'GB']  # Only these countries
```

## 🔐 Security Features

### Port Knock Detection
Automatically detects port knocking attempts (5+ different ports accessed from the same IP within 5 seconds).

Alerts are displayed in the terminal:
```
[!] Port knock detected from 192.168.1.100
```

### VPN Detection
Identifies connections through VPN software:
- Detects common VPN processes (OpenVPN, WireGuard, NordVPN, etc.)
- Identifies VPN-specific ports (1194, 1723, 500, 4500, 51820)
- Marks VPN connections with `[VPN]` prefix

### Connection Blocking (Flagging)
Flags suspicious connections based on port:
```yaml
alerts:
  conditions:
    suspiciousPorts: [23, 135, 139, 445, 3389]
```

Flagged connections are highlighted in **red** with `[!]` prefix.

## 📈 Dashboard

### Enabling the Dashboard

```yaml
dashboard:
  enabled: true  # Enable Electron dashboard
  port: 3000  # Dashboard server port
```

### Running the Dashboard

```bash
# Terminal 1: Start the dashboard server
node src/server.js

# Terminal 2: Start the scanner in dashboard mode
npm start

# Terminal 3: Start Electron window
npm run dashboard
```

Or use the combined command:
```bash
npm run dashboard
```

### Dashboard Features

#### 1. **Search Bar**
Real-time search across all connection fields:
- Protocol
- IP addresses
- Process names
- Geographic location

#### 2. **Connection Table**
Interactive table showing all connections with:
- Color-coded protocols (TCP/UDP)
- VPN indicators
- Blocked/flagged connections
- Sortable columns
- Block IP button for quick blocking

#### 3. **Historical Graphs**
Visualize connection trends over time:
- **Timeframes**: 1h, 6h, 1d, 1w (configurable buttons)
- **Metrics**: TCP count, UDP count, bandwidth usage
- Interactive Chart.js graphs

Configure history tracking:
```yaml
monitoring:
  trackHistory: true
  historyRetention: 604800000  # 7 days in milliseconds
```

#### 4. **Top Talkers Tab**
View top processes by:
- Connection count
- Bandwidth usage

#### 5. **Filtering Sidebar**
Filter connections by:
- Protocol (TCP/UDP)
- Show/hide VPN connections
- Show/hide blocked connections

#### 6. **Pause/Resume**
- **Pause**: Freeze the display to examine connections
- **Resume**: Continue real-time updates

#### 7. **Export Functionality**
Export current connections to:
- **JSON** format
- **CSV** format

Exported files are saved to:
```yaml
dashboard:
  export:
    exportPath: './exports'  # Customize export location
```

#### 8. **Real-time Updates**
WebSocket-based real-time updates for instant connection changes without polling.

#### 9. **Statistics Display**
Header shows live stats:
- TCP connection count
- UDP connection count
- Total connections
- Current bandwidth usage

## 📁 Export Settings

Configure automatic exports:

```yaml
dashboard:
  export:
    enabled: true
    formats: ['csv', 'json']
    autoExport: false  # Auto-export at intervals
    exportInterval: 3600000  # 1 hour
    exportPath: './exports'
```

## 🎨 Dashboard Customization

The dashboard features:
- **No dev console** (F12 disabled)
- **Clean interface** without menu bars
- **Smooth animations** and transitions
- **Dark theme** optimized for monitoring
- **Responsive design** adapts to window size

## 📝 Usage Examples

### Example 1: Security Monitoring Setup
Monitor for suspicious activity with alerts:

```yaml
resolveDNS: true
monitoring:
  showStats: true
  showTopTalkers: true
  trackHistory: true

alerts:
  enabled: true
  webhooks:
    - url: "YOUR_DISCORD_WEBHOOK"
  conditions:
    suspiciousPorts: [23, 135, 139, 445, 3389]
    newForeignConnections: true
    maxConnections: 300

ipFiltering:
  enabled: true
  blocklist:
    - "known.bad.ip"
```

### Example 2: Development Monitoring
Focus on specific applications:

```yaml
connectionFiltering:
  enabled: true
  processes: ['node.exe', 'chrome.exe', 'Code.exe']
  
dashboard:
  enabled: true

monitoring:
  showStats: true
  trackHistory: true
```

### Example 3: Network Analysis
Detailed monitoring with exports:

```yaml
resolveDNS: true

monitoring:
  showStats: true
  showTopTalkers: true
  topTalkersCount: 10
  trackHistory: true

dashboard:
  enabled: true
  export:
    enabled: true
    autoExport: true
    exportInterval: 1800000  # 30 minutes
    formats: ['csv', 'json']
```

## 🔧 Installation of New Dependencies

After pulling the latest changes, install new dependencies:

```bash
npm install
```

New dependencies added:
- `express` - Web server for dashboard
- `cors` - Cross-origin resource sharing
- `ws` - WebSocket support
- `electron` - Desktop application framework
- `concurrently` - Run multiple commands

## 🚀 Quick Start Commands

```bash
# Regular terminal monitoring (no dashboard)
npm start

# Dashboard mode
npm run dashboard

# Install dependencies
npm install
```

## 📊 Performance Considerations

- **DNS Resolution**: Adds latency to connection lookups
- **History Tracking**: Stores data points; adjust `historyRetention` for memory management
- **Refresh Interval**: Lower values = more CPU/API usage
- **Dashboard**: Runs separate server process; minimal overhead

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue or submit a pull request!

---

**Happy monitoring! 🎯**