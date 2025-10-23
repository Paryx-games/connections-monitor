# 🚀 Quick Start Guide

## Installation

1. **Install dependencies:**
```bash
npm install
```

This will install:
- `express` - Dashboard server
- `cors` - API access
- `ws` - WebSocket for real-time updates
- `electron` - Desktop dashboard
- `concurrently` - Process management
- Plus existing dependencies (chalk, js-yaml, node-fetch)

## Usage

### Option 1: Terminal Mode (Default)
```bash
npm start
```
Monitor connections in the terminal with:
- Real bandwidth tracking
- Connection statistics
- Top talkers at the bottom
- Port knock detection alerts
- VPN detection
- All configured filters and alerts

### Option 2: Dashboard Mode
```bash
npm run dashboard
```
Opens an Electron window with:
- Visual connection table
- Search functionality
- Real-time graphs
- Export to CSV/JSON
- Pause/Resume button
- Filtering sidebar
- Top talkers tab

## Configuration

Edit `config.yml` to enable features:

### Enable Dashboard
```yaml
dashboard:
  enabled: true
  port: 3000
```

### Enable Alerts
```yaml
alerts:
  enabled: true
  webhooks:
    - url: "YOUR_DISCORD_WEBHOOK"
  conditions:
    suspiciousPorts: [23, 135, 139, 445, 3389]
    newForeignConnections: true
```

### Enable Filtering
```yaml
ipFiltering:
  enabled: true
  blocklist:
    - "suspicious.ip.address"

connectionFiltering:
  enabled: true
  protocols: ['TCP']  # Only TCP
```

### Enable Monitoring Features
```yaml
resolveDNS: true  # Resolve IPs to hostnames

monitoring:
  showStats: true  # Show connection statistics
  showTopTalkers: true  # Show top processes
  trackHistory: true  # Store historical data for graphs
```

## Testing It Out

1. **Terminal Mode:**
```bash
npm start
```
You should see:
- Connection table at the top
- Stats line showing TCP/UDP counts
- Top talkers at the bottom

2. **Dashboard Mode:**
```bash
# Enable in config.yml first:
# dashboard:
#   enabled: true

npm run dashboard
```
You should see:
- Electron window opens
- Real-time connection updates
- Click between tabs (Connections, Graphs, Top Talkers)
- Try the search bar
- Click Export JSON/CSV buttons

## Troubleshooting

### "Cannot find module 'express'"
Run: `npm install`

### Dashboard doesn't open
1. Check `config.yml` has `dashboard.enabled: true`
2. Make sure port 3000 is not in use
3. Try running server separately: `node src/server.js`

### No connections showing
1. Make sure you have active internet connections
2. Check if filters are blocking everything
3. Verify IPinfo token is valid in config.yml

## What's New? 🎉

### Core Features
✅ Real bandwidth tracking
✅ Connection statistics (TCP/UDP counts)
✅ Top talkers display
✅ DNS resolution with caching
✅ Webhook alert system (Discord/Slack)

### Security
✅ Port knock detection
✅ VPN connection detection
✅ Connection blocking/flagging
✅ IP allowlist/blocklist
✅ Connection filtering

### Dashboard
✅ Electron + React interface
✅ Real-time WebSocket updates
✅ Historical graphs (1h, 6h, 1d, 1w)
✅ Search functionality
✅ CSV/JSON export
✅ Pause/Resume
✅ Filter sidebar
✅ Top talkers visualization

## Next Steps

1. Read [FEATURES.md](FEATURES.md) for complete documentation
2. Customize `config.yml` to your needs
3. Set up webhook alerts if desired
4. Try the dashboard mode
5. Export some data to analyze

---

**Need help?** Check [FEATURES.md](FEATURES.md) or open an issue on GitHub!