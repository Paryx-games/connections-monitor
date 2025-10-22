import { exec } from 'child_process';
import chalk from 'chalk';
import fetch from 'node-fetch';
import fs from 'fs';
import yaml from 'js-yaml';
import dns from 'dns';
import { promisify } from 'util';

const dnsReverse = promisify(dns.reverse);
const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
const seenConnections = new Map();
const connectionStats = new Map();
const bandwidth = new Map();
const historicalData = [];
const dnsCache = new Map();
const portKnockDetector = new Map();

// Global stats
let stats = {
  totalTCP: 0,
  totalUDP: 0,
  totalBandwidth: 0,
  timestamp: Date.now()
};

// Converts a color name like 'red' or a hex value like '#ff0000' into a chalk color function.
// This lets us use both predefined color names and custom hex colors from the config.
function getColor(colorName) {
  if (colorName.startsWith('#')) {
    return chalk.hex(colorName);
  }

  const colors = {
    red: chalk.red,
    magenta: chalk.magenta,
    cyan: chalk.cyan,
    yellowBright: chalk.yellowBright,
    blueBright: chalk.blueBright,
    greenBright: chalk.greenBright,
    whiteBright: chalk.whiteBright,
    green: chalk.green,
    yellow: chalk.yellow,
    white: chalk.white,
  };

  return colors[colorName] || chalk.white;
}

// Builds the header row that appears at the top of the output table.
// Uses config settings to determine which columns to show and how wide they should be.
function buildHeader() {
  const enabledColumns = Object.keys(config.columns).filter(col => config.columns[col]);
  const columns = config.columnOrder
    ? config.columnOrder.filter(col => enabledColumns.includes(col))
    : enabledColumns;
  const widths = config.columnWidths || {};

  const headerParts = columns.map(col => {
    const width = widths[col] || 10;
    return ['Bytes', 'Age'].includes(col)
      ? col.padStart(width)
      : col.padEnd(width);
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

  // Add VPN indicator
  if (isVPN) {
    procName = `[VPN] ${procName}`;
  }

  // Add blocked indicator
  if (isBlocked) {
    state = `[!] ${state}`;
  }

  // Use hostname if available
  if (hostname && config.resolveDNS) {
    foreign = hostname;
  }

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

    // Truncate if enabled and value exceeds width
    if (config.truncateOverflow && value.length > width) {
      value = value.substring(0, width - 2) + '..';
    }

    return ['Bytes', 'Age'].includes(col)
      ? value.padStart(width)
      : value.padEnd(width);
  });

  let text = textParts.join('');

  // Highlight blocked connections in red
  if (isBlocked) {
    return chalk.red(text);
  }

  if (config.highlightedPorts && config.highlightedPorts[port]) {
    return getColor(config.highlightedPorts[port])(text);
  }

  if (proto === 'TCP') {
    const tcpColors = config.colors?.tcp || {};
    const stateLower = state.toLowerCase();

    if (stateLower.includes('listening')) {
      return getColor(tcpColors.listening || 'green')(text);
    } else if (stateLower.includes('established')) {
      return getColor(tcpColors.established || 'yellow')(text);
    } else if (stateLower.includes('close_wait')) {
      return getColor(tcpColors.close_wait || 'red')(text);
    } else if (stateLower.includes('time_wait')) {
      return getColor(tcpColors.time_wait || 'magenta')(text);
    } else {
      return getColor(tcpColors.other || 'white')(text);
    }
  }

  if (proto === 'UDP') {
    return getColor(config.colors?.udp || 'cyan')(text);
  }

  return text;
}

// Looks up what program is using a specific process ID.
// Uses Windows' tasklist command to find the process name, returns 'Unknown' if it can't find it.
async function getProcessName(pid) {
  return new Promise(resolve => {
    exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, (err, output) => {
      if (err || !output.trim()) {
        return resolve('Unknown');
      }
      const match = output.match(/^"(.+?)",/);
      resolve(match ? match[1] : 'Unknown');
    });
  });
}

// Figures out where in the world an IP address is coming from.
// Calls the ipinfo.io API to get the country code, or returns 'Local' for local addresses.
async function getGeo(ip) {
  try {
    if (!ip || ip === '0.0.0.0' || ip === '127.0.0.1') {
      return 'Local';
    }

    const res = await fetch(`https://ipinfo.io/${ip}/json?token=${config.ipToken}`);
    if (!res.ok) {
      return 'Unknown';
    }

    const data = await res.json();
    return data.country || 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

// Get bandwidth statistics for a connection
function getBandwidth(key, bytesIn, bytesOut) {
  const now = Date.now();
  const prevData = bandwidth.get(key) || { bytesIn: 0, bytesOut: 0, timestamp: now };

  const timeDiff = (now - prevData.timestamp) / 1000; // seconds
  const inDiff = Math.max(0, bytesIn - prevData.bytesIn);
  const outDiff = Math.max(0, bytesOut - prevData.bytesOut);

  bandwidth.set(key, { bytesIn, bytesOut, timestamp: now });

  return {
    totalBytes: bytesIn + bytesOut,
    bytesPerSec: timeDiff > 0 ? (inDiff + outDiff) / timeDiff : 0
  };
}

// Display connection statistics
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

  // Aggregate by process
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

  // Sort by connections
  const topTalkers = Array.from(processTalkers.entries())
    .sort((a, b) => b[1].connections - a[1].connections)
    .slice(0, count)
    .map(([proc, data]) => `${proc}(${data.connections})`)
    .join(', ');

  if (topTalkers) {
    console.log(chalk.bold.yellow(`Top Talkers: ${topTalkers}`));
  }
}

// Save historical data
function saveHistoricalData(connections) {
  if (!config.monitoring?.trackHistory) return;

  const dataPoint = {
    timestamp: Date.now(),
    tcpCount: stats.totalTCP,
    udpCount: stats.totalUDP,
    bandwidth: stats.totalBandwidth,
    topProcesses: Array.from(connectionStats.entries())
      .map(([key, data]) => ({ process: data.procName, connections: 1 }))
      .slice(0, 10)
  };

  historicalData.push(dataPoint);

  // Clean old data based on retention policy
  const retention = config.monitoring.historyRetention || 604800000; // 7 days
  const cutoff = Date.now() - retention;
  while (historicalData.length > 0 && historicalData[0].timestamp < cutoff) {
    historicalData.shift();
  }
}

// The main function that grabs all active network connections from your system.
// Runs PowerShell commands to get TCP and UDP connections, then enriches each one
// with process names, geolocation, and age tracking before displaying them.
async function getConnections() {
  const psTCP = 'Get-NetTCPConnection | Select-Object State,LocalAddress,LocalPort,RemoteAddress,RemotePort,OwningProcess | ConvertTo-Json -Compress';
  const psUDP = 'Get-NetUDPEndpoint | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress';

  exec(`powershell -Command "${psTCP}"`, async (err, tcpOut) => {
    if (err) return;

    exec(`powershell -Command "${psUDP}"`, async (err2, udpOut) => {
      if (err2) return;

      let tcp = [];
      let udp = [];

      try {
        tcp = JSON.parse(tcpOut);
        if (!Array.isArray(tcp)) tcp = [tcp];
      } catch (e) {
        tcp = [];
      }

      try {
        udp = JSON.parse(udpOut);
        if (!Array.isArray(udp)) udp = [udp];
      } catch (e) {
        udp = [];
      }

      const allConnections = [...tcp, ...udp];
      const displayedConnections = [];

      // Reset stats
      stats = {
        totalTCP: 0,
        totalUDP: 0,
        totalBandwidth: 0,
        timestamp: Date.now()
      };

      // Clear screen and show header
      console.clear();
      console.log(buildHeader());

      for (const conn of allConnections) {
        try {
          const proto = conn.State ? 'TCP' : 'UDP';
          const local = conn.LocalAddress + ':' + conn.LocalPort;
          const foreign = conn.RemoteAddress
            ? conn.RemoteAddress + ':' + conn.RemotePort
            : '-';
          const state = conn.State || '-';
          const pid = String(conn.OwningProcess || '-');

          const key = `${proto}-${local}-${foreign}-${pid}`;
          if (!seenConnections.has(key)) {
            seenConnections.set(key, Date.now());

            // Check for new foreign connection alert
            if (config.alerts?.enabled && config.alerts.conditions?.newForeignConnections && foreign !== '-') {
              sendAlert('New Foreign Connection', { proto, foreign, pid });
            }
          }
          const age = Math.floor((Date.now() - seenConnections.get(key)) / 1000);

          const procName = await getProcessName(pid);
          const foreignIp = foreign !== '-' ? foreign.split(':')[0] : null;
          const foreignPort = foreign !== '-' ? foreign.split(':')[1] : null;
          const geo = foreignIp ? await getGeo(foreignIp) : 'Local';
          const hostname = foreignIp ? await resolveHostname(foreignIp) : null;

          // Bandwidth tracking (simulated for now, real tracking would require performance counters)
          const bw = getBandwidth(key, 0, 0);
          const bytes = bw.totalBytes;

          // Update stats
          if (proto === 'TCP') stats.totalTCP++;
          else stats.totalUDP++;
          stats.totalBandwidth += bw.bytesPerSec;

          // VPN detection
          const isVPN = detectVPN(procName, foreign);

          // Port knock detection
          if (foreignIp && detectPortKnock(foreignIp, conn.LocalPort)) {
            console.log(chalk.red.bold(`[!] Port knock detected from ${foreignIp}`));
          }

          // Check if should be blocked (flagged)
          const suspiciousPorts = config.alerts?.conditions?.suspiciousPorts || [];
          const isBlocked = suspiciousPorts.includes(parseInt(conn.LocalPort));

          // Store connection data
          connectionStats.set(key, { procName, bytes, proto });

          // Check filtering
          const localPort = conn.LocalPort;
          if (shouldFilterConnection(proto, localPort, procName, geo, foreignIp)) {
            continue;
          }

          const connectionData = {
            proto, local, foreign, state, pid, procName, geo, bytes, age, isVPN, isBlocked, hostname
          };

          displayedConnections.push(connectionData);

          console.log(formatLine(connectionData));
        } catch (connError) {
          // Silently skip connection errors
        }
      }

      // Display stats and top talkers at the bottom
      displayStats();
      displayTopTalkers();

      // Check alerts
      checkAlerts(displayedConnections);

      // Save historical data
      saveHistoricalData(displayedConnections);
    });
  });
}

console.clear();
console.log(buildHeader());

// Keeps the display fresh by calling getConnections() every few seconds.
// The refresh rate comes from your config file (default is 2 seconds).
setInterval(getConnections, config.refreshInterval || 2000);