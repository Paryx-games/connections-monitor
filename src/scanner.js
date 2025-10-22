import { exec } from 'child_process';
import chalk from 'chalk';
import fetch from 'node-fetch';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
const seenConnections = new Map();

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

console.log(buildHeader());

// Takes raw connection data and formats it into a nice colored line for display.
// Applies different colors based on port highlights, TCP states, or UDP protocol.
// Think of this as the painter that makes the output pretty and readable.
function formatLine({ proto, local, foreign, state, pid, procName, geo, bytes, age }) {
  proto = String(proto || '-');
  local = String(local || '-');
  foreign = String(foreign || '-');
  state = String(state || '-');
  pid = String(pid || '-');
  procName = String(procName || '-');
  geo = String(geo || '-');
  bytes = bytes || 0;
  age = age || 0;

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
    Bytes: `${bytes}B`,
    Age: `${age}s`,
  };

  const textParts = columns.map(col => {
    const value = data[col] || '-';
    const width = widths[col] || 10;
    return ['Bytes', 'Age'].includes(col)
      ? value.padStart(width)
      : value.padEnd(width);
  });

  let text = textParts.join('');

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
          }
          const age = Math.floor((Date.now() - seenConnections.get(key)) / 1000);

          const procName = await getProcessName(pid);
          const geo = foreign !== '-'
            ? await getGeo(foreign.split(':')[0])
            : 'Local';
          const bytes = 0;

          console.log(formatLine({
            proto, local, foreign, state, pid, procName, geo, bytes, age
          }));
        } catch (connError) {
        }
      }
    });
  });
}

// Keeps the display fresh by calling getConnections() every few seconds.
// The refresh rate comes from your config file (default is 2 seconds).
setInterval(getConnections, config.refreshInterval || 2000);