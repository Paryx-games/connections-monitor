import { exec } from 'child_process';
import chalk from 'chalk';
import fetch from 'node-fetch';
import fs from 'fs';
import yaml from 'js-yaml';
import dns from 'dns';
import { promisify } from 'util';

const dnsReverse = promisify(dns.reverse);
const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));

// Caches and storage
const seenConnections = new Map();
const connectionStats = new Map();
const historicalData = [];
const dnsCache = new Map();
const geoCache = new Map();
const processCache = new Map();

// Stats
let stats = {
  totalTCP: 0,
  totalUDP: 0,
  totalBandwidth: 0,
  timestamp: Date.now()
};

let isFirstRun = true;
let isScanning = false;

// Utility: Get chalk color
function getColor(colorName) {
  if (colorName?.startsWith('#')) {
    return chalk.hex(colorName);
  }
  const colors = {
    red: chalk.red, magenta: chalk.magenta, cyan: chalk.cyan,
    yellowBright: chalk.yellowBright, blueBright: chalk.blueBright,
    greenBright: chalk.greenBright, whiteBright: chalk.whiteBright,
    green: chalk.green, yellow: chalk.yellow, white: chalk.white,
  };
  return colors[colorName] || chalk.white;
}

// Utility: Format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + sizes[i];
}

// Build header
function buildHeader() {
  const enabledColumns = Object.keys(config.columns).filter(col => config.columns[col]);
  const columns = config.columnOrder
    ? config.columnOrder.filter(col => enabledColumns.includes(col))
    : enabledColumns;
  const widths = config.columnWidths || {};

  const headerParts = columns.map(col => {
    const width = widths[col] || 10;
    return ['Bytes', 'Age'].includes(col) ? col.padStart(width) : col.padEnd(width);
  });

  return chalk.bold(headerParts.join(''));
}

// Format bytes for display
function formatBytes(bytes) {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + sizes[i];
}

// Resolve IP to hostname using DNS
async function resolveHostname(ip) {
  if (!config.resolveDNS) return null;

  // Check cache first
  if (dnsCache.has(ip)) {
    return dnsCache.get(ip);
  }

  // Skip local IPs
  if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null;
  }

  try {
    const hostnames = await dnsReverse(ip);
    const hostname = hostnames[0] || null;
    dnsCache.set(ip, hostname);
    return hostname;
  } catch (error) {
    dnsCache.set(ip, null);
    return null;
  }
}

// Detect if connection is through VPN
function detectVPN(procName, foreign) {
  const vpnProcesses = ['openvpn', 'wireguard', 'nordvpn', 'expressvpn', 'pia', 'protonvpn', 'tunnelbear', 'windscribe'];
  const vpnPorts = [1194, 1723, 500, 4500, 51820];

  const isVPNProcess = vpnProcesses.some(vpn => procName.toLowerCase().includes(vpn));
  const isVPNPort = vpnPorts.some(port => foreign.includes(`:${port}`));

  return isVPNProcess || isVPNPort;
}

// Detect port knocking attempts
function detectPortKnock(ip, port) {
  const now = Date.now();
  const threshold = 5000; // 5 seconds window
  const knockThreshold = 5; // 5 different ports in quick succession

  if (!portKnockDetector.has(ip)) {
    portKnockDetector.set(ip, []);
  }

  const knocks = portKnockDetector.get(ip);
  knocks.push({ port, timestamp: now });

  // Clean old knocks
  const recentKnocks = knocks.filter(k => now - k.timestamp < threshold);
  portKnockDetector.set(ip, recentKnocks);

  // Check for knock pattern
  const uniquePorts = new Set(recentKnocks.map(k => k.port));
  if (uniquePorts.size >= knockThreshold) {
    return true;
  }

  return false;
}

// Check if connection should be filtered
function shouldFilterConnection(proto, port, procName, country, ip) {
  if (!config.connectionFiltering?.enabled && !config.ipFiltering?.enabled) {
    return false;
  }

  // IP filtering
  if (config.ipFiltering?.enabled) {
    if (config.ipFiltering.allowlist.length > 0) {
      if (!config.ipFiltering.allowlist.includes(ip)) {
        return true; // Not in allowlist, filter it
      }
    }
    if (config.ipFiltering.blocklist.includes(ip)) {
      return true; // In blocklist, filter it
    }
  }

  // Connection filtering
  if (config.connectionFiltering?.enabled) {
    if (config.connectionFiltering.protocols.length > 0) {
      if (!config.connectionFiltering.protocols.includes(proto)) {
        return true;
      }
    }
    if (config.connectionFiltering.ports.length > 0) {
      if (!config.connectionFiltering.ports.includes(parseInt(port))) {
        return true;
      }
    }
    if (config.connectionFiltering.processes.length > 0) {
      if (!config.connectionFiltering.processes.some(p => procName.toLowerCase().includes(p.toLowerCase()))) {
        return true;
      }
    }
    if (config.connectionFiltering.countries.length > 0) {
      if (!config.connectionFiltering.countries.includes(country)) {
        return true;
      }
    }
  }

  return false;
}

// Send webhook alert
async function sendAlert(alertType, data) {
  if (!config.alerts?.enabled || !config.alerts.webhooks?.length) {
    return;
  }

  for (const webhook of config.alerts.webhooks) {
    try {
      let payload;
      const url = webhook.url || webhook;

      // Detect webhook type and format accordingly
      if (url.includes('discord.com')) {
        payload = {
          content: `**Alert: ${alertType}**\n\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\``
        };
      } else if (url.includes('slack.com')) {
        payload = {
          text: `*Alert: ${alertType}*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``
        };
      } else {
        // Generic JSON webhook
        payload = {
          alertType,
          timestamp: new Date().toISOString(),
          data
        };
      }

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Silently fail webhook errors
    }
  }
}

// Check alert conditions
function checkAlerts(connections) {
  if (!config.alerts?.enabled) return;

  const conditions = config.alerts.conditions || {};

  // Check connection count
  if (conditions.maxConnections && connections.length > conditions.maxConnections) {
    sendAlert('High Connection Count', {
      current: connections.length,
      threshold: conditions.maxConnections
    });
  }

  // Check bandwidth
  if (conditions.maxBandwidth && stats.totalBandwidth > conditions.maxBandwidth) {
    sendAlert('High Bandwidth Usage', {
      current: formatBytes(stats.totalBandwidth),
      threshold: formatBytes(conditions.maxBandwidth)
    });
  }

  // Check suspicious ports
  if (conditions.suspiciousPorts?.length) {
    connections.forEach(conn => {
      const port = conn.port;
      if (conditions.suspiciousPorts.includes(parseInt(port))) {
        sendAlert('Suspicious Port Detected', {
          port,
          process: conn.procName,
          foreign: conn.foreign
        });
      }
    });
  }
}

// Takes raw connection data and formats it into a nice colored line for display.
// Applies different colors based on port highlights, TCP states, or UDP protocol.
// Think of this as the painter that makes the output pretty and readable.
function formatLine({ proto, local, foreign, state, pid, procName, geo, bytes, age, isVPN, isBlocked, hostname }) {
  proto = String(proto || '-');
  local = String(local || '-');
  foreign = String(foreign || '-');
  state = String(state || '-');
  pid = String(pid || '-');
  procName = String(procName || '-');
  geo = String(geo || '-');
  bytes = bytes || 0;
  age = age || 0;

  if (isVPN) procName = `[VPN] ${procName}`;
  if (isBlocked) state = `[!] ${state}`;
  if (hostname && config.resolveDNS) foreign = hostname;

  let port = '-';
  if (local.includes(']:')) {
    port = local.split(']:')[1];
  } else if (local.includes(':')) {
    port = local.split(':').pop();
  }

  const enabledColumns = Object.keys(config.columns).filter(col => config.columns[col]);
  const columns = config.columnOrder
    ? config.columnOrder.filter(col => enabledColumns.includes(col))
    : enabledColumns;
  const widths = config.columnWidths || {};

  const data = {
    Proto: proto,
    Local: local,
    Port: port,
    Foreign: foreign,
    State: state,
    PID: pid,
    Process: procName,
    Geo: geo,
    Bytes: formatBytes(bytes),
    Age: `${age}s`,
  };

  const textParts = columns.map(col => {
    let value = String(data[col] || '-');
    const width = widths[col] || 10;
    if (config.truncateOverflow && value.length > width) {
      value = value.substring(0, width - 2) + '..';
    }
    return ['Bytes', 'Age'].includes(col) ? value.padStart(width) : value.padEnd(width);
  });

  let text = textParts.join('');

  if (isBlocked) return chalk.red(text);
  if (config.highlightedPorts && config.highlightedPorts[port]) {
    return getColor(config.highlightedPorts[port])(text);
  }

  if (proto === 'TCP') {
    const tcpColors = config.colors?.tcp || {};
    const stateLower = state.toLowerCase();
    if (stateLower.includes('listening')) return getColor(tcpColors.listening || 'green')(text);
    if (stateLower.includes('established')) return getColor(tcpColors.established || 'yellow')(text);
    if (stateLower.includes('close_wait')) return getColor(tcpColors.close_wait || 'red')(text);
    if (stateLower.includes('time_wait')) return getColor(tcpColors.time_wait || 'magenta')(text);
    return getColor(tcpColors.other || 'white')(text);
  }

  if (proto === 'UDP') return getColor(config.colors?.udp || 'cyan')(text);
  return text;
}

// Get process name with caching
async function getProcessName(pid) {
  if (processCache.has(pid)) {
    return processCache.get(pid);
  }

  return new Promise(resolve => {
    exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { timeout: 2000 }, (err, output) => {
      if (err || !output.trim()) {
        processCache.set(pid, 'Unknown');
        return resolve('Unknown');
      }
      const match = output.match(/^"(.+?)",/);
      const name = match ? match[1] : 'Unknown';
      processCache.set(pid, name);
      resolve(name);
    });
  });
}

// Batch get process names (parallel)
async function batchGetProcessNames(pids) {
  const uniquePids = [...new Set(pids)];
  const promises = uniquePids.map(pid => getProcessName(pid));
  return Promise.all(promises);
}

// Get geolocation with caching
async function getGeo(ip) {
  if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Local';
  }

  if (geoCache.has(ip)) {
    return geoCache.get(ip);
  }

  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json?token=${config.ipToken}`, { timeout: 5000 });
    if (!res.ok) {
      geoCache.set(ip, 'Unknown');
      return 'Unknown';
    }

    const data = await res.json();
    const city = data.city || '';
    const region = data.region || '';
    const country = data.country || '';
    const org = data.org || '';

    const parts = [];
    if (city) parts.push(city);
    if (region && region !== city) parts.push(region);
    if (country) parts.push(country);

    const location = parts.join(', ') || 'Unknown';

    const geoData = (data.city || data.region || data.org) ? {
      display: location,
      city, region, country, org,
      loc: data.loc || null
    } : location;

    geoCache.set(ip, geoData);
    return geoData;
  } catch (error) {
    geoCache.set(ip, 'Unknown');
    return 'Unknown';
  }
}

// Resolve hostname with caching
async function resolveHostname(ip) {
  if (!config.resolveDNS) return null;
  if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return null;
  }

  if (dnsCache.has(ip)) {
    return dnsCache.get(ip);
  }

  try {
    const hostnames = await dnsReverse(ip);
    const hostname = hostnames[0] || null;
    dnsCache.set(ip, hostname);
    return hostname;
  } catch (error) {
    dnsCache.set(ip, null);
    return null;
  }
}

// VPN detection
function detectVPN(procName, foreign) {
  const vpnProcesses = ['openvpn', 'wireguard', 'nordvpn', 'expressvpn', 'pia', 'protonvpn'];
  const vpnPorts = [1194, 1723, 500, 4500, 51820];
  const isVPNProcess = vpnProcesses.some(vpn => procName.toLowerCase().includes(vpn));
  const isVPNPort = vpnPorts.some(port => foreign.includes(`:${port}`));
  return isVPNProcess || isVPNPort;
}

// Check if should filter
function shouldFilterConnection(proto, port, procName, country, ip) {
  if (!config.connectionFiltering?.enabled && !config.ipFiltering?.enabled) return false;

  if (config.ipFiltering?.enabled) {
    if (config.ipFiltering.allowlist.length > 0 && !config.ipFiltering.allowlist.includes(ip)) {
      return true;
    }
    if (config.ipFiltering.blocklist.includes(ip)) return true;
  }

  if (config.connectionFiltering?.enabled) {
    if (config.connectionFiltering.protocols.length > 0 && !config.connectionFiltering.protocols.includes(proto)) {
      return true;
    }
    if (config.connectionFiltering.ports.length > 0 && !config.connectionFiltering.ports.includes(parseInt(port))) {
      return true;
    }
    if (config.connectionFiltering.processes.length > 0) {
      if (!config.connectionFiltering.processes.some(p => procName.toLowerCase().includes(p.toLowerCase()))) {
        return true;
      }
    }
    if (config.connectionFiltering.countries.length > 0 && !config.connectionFiltering.countries.includes(country)) {
      return true;
    }
  }

  return false;
}

// Send webhook alert
async function sendAlert(alertType, data) {
  if (!config.alerts?.enabled || !config.alerts.webhooks?.length) return;

  const promises = config.alerts.webhooks.map(async webhook => {
    try {
      const url = webhook.url || webhook;
      let payload;

      if (url.includes('discord.com')) {
        payload = { content: `**Alert: ${alertType}**\n\`\`\`\n${JSON.stringify(data, null, 2)}\n\`\`\`` };
      } else if (url.includes('slack.com')) {
        payload = { text: `*Alert: ${alertType}*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\`` };
      } else {
        payload = { alertType, timestamp: new Date().toISOString(), data };
      }

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 5000
      });
    } catch (error) {
      // Silent fail
    }
  });

  await Promise.allSettled(promises);
}

// Display stats
function displayStats() {
  if (!config.monitoring?.showStats) return;
  const statLine = chalk.bold.cyan(
    `Stats: TCP=${stats.totalTCP} | UDP=${stats.totalUDP} | Total=${stats.totalTCP + stats.totalUDP} | Bandwidth=${formatBytes(stats.totalBandwidth)}/s`
  );
  console.log('\n' + statLine);
}

// Display top talkers
function displayTopTalkers() {
  if (!config.monitoring?.showTopTalkers) return;

  const count = config.monitoring.topTalkersCount || 5;
  const processTalkers = new Map();

  for (const [key, data] of connectionStats) {
    const proc = data.procName;
    if (!processTalkers.has(proc)) {
      processTalkers.set(proc, { connections: 0, bytes: 0 });
    }
    const current = processTalkers.get(proc);
    current.connections++;
    current.bytes += data.bytes || 0;
  }

  const topTalkers = Array.from(processTalkers.entries())
    .sort((a, b) => b[1].connections - a[1].connections)
    .slice(0, count)
    .map(([proc, data]) => `${proc}(${data.connections})`)
    .join(', ');

  if (topTalkers) {
    console.log(chalk.bold.yellow(`Top Talkers: ${topTalkers}`));
  }
}

// Send to dashboard
async function sendToDashboard(connections) {
  if (!config.dashboard?.enabled) return;

  try {
    await fetch(`http://localhost:${config.dashboard.port}/api/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connections }),
      timeout: 3000
    });
  } catch (error) {
    // Silent fail
  }
}

// Main connection getter - OPTIMIZED
async function getConnections() {
  if (isScanning) return; // Prevent overlapping scans
  isScanning = true;

  try {
    const execOptions = { timeout: 10000, maxBuffer: 10 * 1024 * 1024 };

    // Get netstat output
    const stdout = await new Promise((resolve, reject) => {
      exec('netstat -ano', execOptions, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });

    // Parse connections
    const allConnections = [];
    const lines = stdout.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Active') || trimmed.startsWith('Proto')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 4) continue;

      const proto = parts[0].toUpperCase();
      if (proto !== 'TCP' && proto !== 'UDP') continue;

      const local = parts[1];
      const foreign = parts[2];
      const state = proto === 'TCP' ? parts[3] : '-';
      const pid = proto === 'TCP' ? parts[4] : parts[3];

      if (!local || !pid) continue;

      const localParts = local.split(':');
      const foreignParts = foreign.split(':');

      allConnections.push({
        proto,
        state: proto === 'TCP' ? state : '-',
        local,
        foreign: foreignParts.length > 1 ? foreign : '-',
        localAddress: localParts.slice(0, -1).join(':') || '0.0.0.0',
        localPort: parseInt(localParts[localParts.length - 1]) || 0,
        foreignIp: foreignParts.length > 1 ? foreignParts.slice(0, -1).join(':') : null,
        foreignPort: foreignParts.length > 1 ? foreignParts[foreignParts.length - 1] : null,
        pid: parseInt(pid) || 0
      });
    }

    // Reset stats
    stats = { totalTCP: 0, totalUDP: 0, totalBandwidth: 0, timestamp: Date.now() };

    // Batch process: Get all unique PIDs and IPs first
    const uniquePids = [...new Set(allConnections.map(c => c.pid))];
    const uniqueIps = [...new Set(allConnections.map(c => c.foreignIp).filter(Boolean))];

    // Batch fetch process names (parallel)
    await Promise.all(uniquePids.map(pid => getProcessName(pid)));

    // Batch fetch geo data (parallel, but limit to 10 at a time to avoid rate limits)
    const uncachedIps = uniqueIps.filter(ip => !geoCache.has(ip) && ip !== '0.0.0.0');
    const batchSize = 10;
    for (let i = 0; i < uncachedIps.length; i += batchSize) {
      const batch = uncachedIps.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(ip => getGeo(ip)));
    }

    // Process connections
    const displayedConnections = [];

    for (const conn of allConnections) {
      try {
        const key = `${conn.proto}-${conn.local}-${conn.foreign}-${conn.pid}`;

        if (!seenConnections.has(key)) {
          seenConnections.set(key, Date.now());
          if (!isFirstRun && config.alerts?.enabled && config.alerts.conditions?.newForeignConnections && conn.foreign !== '-') {
            sendAlert('New Foreign Connection', { proto: conn.proto, foreign: conn.foreign, pid: conn.pid });
          }
        }

        const age = Math.floor((Date.now() - seenConnections.get(key)) / 1000);
        const procName = processCache.get(conn.pid) || 'Unknown';
        const geoData = conn.foreignIp ? (geoCache.get(conn.foreignIp) || 'Unknown') : 'Local';
        const geo = typeof geoData === 'object' ? geoData.display : geoData;
        const geoFull = typeof geoData === 'object' ? geoData : null;
        const hostname = conn.foreignIp && config.resolveDNS ? (dnsCache.get(conn.foreignIp) || null) : null;

        if (conn.proto === 'TCP') stats.totalTCP++;
        else stats.totalUDP++;

        const isVPN = detectVPN(procName, conn.foreign);
        const suspiciousPorts = config.alerts?.conditions?.suspiciousPorts || [];
        const isBlocked = suspiciousPorts.includes(conn.localPort);

        connectionStats.set(key, { procName, bytes: 0, proto: conn.proto });

        if (shouldFilterConnection(conn.proto, conn.localPort, procName, geo, conn.foreignIp)) {
          continue;
        }

        const connectionData = {
          proto: conn.proto,
          local: conn.local,
          foreign: conn.foreign,
          state: conn.state,
          pid: String(conn.pid),
          procName,
          geo,
          bytes: 0,
          age,
          isVPN,
          isBlocked,
          hostname,
          port: conn.localPort,
          geoFull
        };

        displayedConnections.push(connectionData);

        if (!isFirstRun && !config.dashboard?.enabled) {
          console.log(formatLine(connectionData));
        }
      } catch (connError) {
        // Skip connection errors
      }
    }

    // Display output
    if (!isFirstRun && !config.dashboard?.enabled) {
      console.clear();
      console.log(buildHeader());
      displayedConnections.forEach(conn => console.log(formatLine(conn)));
      displayStats();
      displayTopTalkers();
    }

    // Send to dashboard
    if (config.dashboard?.enabled) {
      await sendToDashboard(displayedConnections);
    }

    // First run complete
    if (isFirstRun) {
      if (!config.dashboard?.enabled) {
        console.clear();
        console.log(chalk.green.bold('✓ Ready! Monitoring connections in real-time...\n'));
      }
      isFirstRun = false;
    }

  } catch (error) {
    if (!isFirstRun) {
      console.error(chalk.red('Error fetching connections:'), error.message);
    }
  } finally {
    isScanning = false;
  }
}

// Start monitoring
console.clear();
if (config.dashboard?.enabled) {
  console.log(chalk.cyan.bold('⚡ Starting dashboard scanner...\n'));
} else {
  console.log(chalk.cyan.bold('⚡ Connections Monitor\n'));
  console.log(chalk.yellow('Loading initial data...'));
}

// Run first scan
getConnections();

// Set up interval
setInterval(getConnections, config.refreshInterval || 2000);