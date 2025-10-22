import { exec } from 'child_process';
import chalk from 'chalk';
import fetch from 'node-fetch';
import fs from 'fs';
import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));

const seenConnections = new Map();

// Function to get chalk color function from color name or hex
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
    cyan: chalk.cyan
  };
  return colors[colorName] || chalk.white;
}

// Function to apply highlight style
function applyHighlight(text, colorName, style) {
  const colorFunc = getColor(colorName);
  if (style === 'highlighted') {
    return chalk.bgBlack(colorFunc(text));
  } else {
    return colorFunc(text);
  }
}

// Function to build header from config
function buildHeader() {
  const enabledColumns = Object.keys(config.columns).filter(col => config.columns[col]);
  const columns = config.columnOrder ? config.columnOrder.filter(col => enabledColumns.includes(col)) : enabledColumns;
  const widths = config.columnWidths || {};
  let headerStr = '';
  for (const col of columns) {
    const width = widths[col] || 10;
    if (col === 'Bytes' || col === 'Age') {
      headerStr += col.padStart(width);
    } else {
      headerStr += col.padEnd(width);
    }
  }
  return chalk.bold(headerStr.trim());
}

const header = buildHeader();

console.log(header);

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
  if (local.includes(']:')) port = local.split(']:')[1];
  else if (local.includes(':')) port = local.split(':').pop();

  const enabledColumns = Object.keys(config.columns).filter(col => config.columns[col]);
  const columns = config.columnOrder ? config.columnOrder.filter(col => enabledColumns.includes(col)) : enabledColumns;
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
    Bytes: String(bytes) + 'B',
    Age: String(age) + 's'
  };

  let textParts = [];
  for (const col of columns) {
    const value = data[col] || '-';
    const width = widths[col] || 10;
    if (col === 'Bytes' || col === 'Age') {
      textParts.push(value.padStart(width));
    } else {
      textParts.push(value.padEnd(width));
    }
  }
  let text = textParts.join('');

  // Apply highlighting for highlighted ports
  if (config.highlightedPorts && config.highlightedPorts[port]) {
    const color = config.highlightedPorts[port];
    text = getColor(color)(text);
  } else if (proto === 'TCP') {
    const tcpColors = config.colors?.tcp || {};
    const stateLower = state.toLowerCase();
    if (stateLower.includes('listening')) {
      text = getColor(tcpColors.listening || 'green')(text);
    } else if (stateLower.includes('established')) {
      text = getColor(tcpColors.established || 'yellow')(text);
    } else if (stateLower.includes('close_wait')) {
      text = getColor(tcpColors.close_wait || 'red')(text);
    } else if (stateLower.includes('time_wait')) {
      text = getColor(tcpColors.time_wait || 'magenta')(text);
    } else {
      text = getColor(tcpColors.other || 'white')(text);
    }
  } else if (proto === 'UDP') {
    text = getColor(config.colors?.udp || 'cyan')(text);
  }

  return text;
}

async function getProcessName(pid) {
  try {
    return new Promise(resolve => {
      exec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, (err, output) => {
        if (err) {
          return resolve('Unknown');
        }
        if (!output.trim()) {
          return resolve('Unknown');
        }
        const match = output.match(/^"(.+?)",/);
        resolve(match ? match[1] : 'Unknown');
      });
    });
  } catch (error) {
    return 'Unknown';
  }
}

async function getGeo(ip) {
  try {
    if (!ip || ip === '0.0.0.0') return 'Local';
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

async function getConnections() {
  try {
    const psTCP = 'Get-NetTCPConnection | Select-Object State,LocalAddress,LocalPort,RemoteAddress,RemotePort,OwningProcess | ConvertTo-Json -Compress';
    const psUDP = 'Get-NetUDPEndpoint | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress';

    exec(`powershell -Command "${psTCP}"`, async (err, tcpOut) => {
      if (err) {
        return;
      }

      exec(`powershell -Command "${psUDP}"`, async (err2, udpOut) => {
        if (err2) {
          return;
        }

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
            const foreign = conn.RemoteAddress ? conn.RemoteAddress + ':' + conn.RemotePort : '-';
            const state = conn.State || '-';
            const pid = String(conn.OwningProcess || '-');
            const key = `${proto}-${local}-${foreign}-${pid}`;

            if (!seenConnections.has(key)) seenConnections.set(key, Date.now());
            const age = Math.floor((Date.now() - seenConnections.get(key)) / 1000);

            const procName = await getProcessName(pid);
            const geo = foreign !== '-' ? await getGeo(foreign.split(':')[0]) : 'Local';
            const bytes = 0; // Placeholder: Real bytes calculation would require additional system calls

            console.log(formatLine({ proto, local, foreign, state, pid, procName, geo, bytes, age }));
          } catch (connError) {
          }
        }
      });
    });
  } catch (error) {
  }
}

setInterval(getConnections, config.refreshInterval || 2000);
