import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
const app = express();
const port = config.dashboard?.port || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'electron')));

// Store connection data
let connections = [];
let historicalData = [];
let isPaused = false;

// WebSocket server for real-time updates
const wss = new WebSocketServer({ noServer: true });

const server = app.listen(port, () => {
    console.log(chalk.green(`✓ Dashboard server running on http://localhost:${port}`));
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Broadcast to all connected WebSocket clients
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            try {
                client.send(message);
            } catch (error) {
                // Client disconnected
            }
        }
    });
}

// API: Get connections
app.get('/api/connections', (req, res) => {
    res.json({ connections, isPaused });
});

// API: Get history
app.get('/api/history', (req, res) => {
    const timeframe = req.query.timeframe || '1h';
    const now = Date.now();
    let cutoff = now;

    switch (timeframe) {
        case '1h': cutoff = now - 3600000; break;
        case '6h': cutoff = now - 21600000; break;
        case '1d': cutoff = now - 86400000; break;
        case '1w': cutoff = now - 604800000; break;
        default: cutoff = now - 3600000;
    }

    const filtered = historicalData.filter(d => d.timestamp >= cutoff);
    res.json(filtered);
});

// API: Get stats
app.get('/api/stats', (req, res) => {
    const tcpCount = connections.filter(c => c.proto === 'TCP').length;
    const udpCount = connections.filter(c => c.proto === 'UDP').length;
    const totalBandwidth = connections.reduce((sum, c) => sum + (c.bytes || 0), 0);

    res.json({
        tcpCount,
        udpCount,
        totalConnections: connections.length,
        totalBandwidth
    });
});

// API: Toggle pause
app.post('/api/pause', (req, res) => {
    isPaused = !isPaused;
    broadcast({ type: 'pause', isPaused });
    res.json({ isPaused });
});

// API: Export data
app.post('/api/export', (req, res) => {
    const format = req.body.format || 'json';
    const exportPath = config.dashboard?.export?.exportPath || './exports';

    // Create exports directory if it doesn't exist
    if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `connections_${timestamp}.${format}`;
    const filepath = path.join(exportPath, filename);

    try {
        if (format === 'json') {
            fs.writeFileSync(filepath, JSON.stringify(connections, null, 2));
        } else if (format === 'csv') {
            const headers = ['Proto', 'Local', 'Port', 'Foreign', 'State', 'PID', 'Process', 'Geo', 'Bytes', 'Age'];
            const csv = [
                headers.join(','),
                ...connections.map(c => [
                    c.proto || '-',
                    c.local || '-',
                    c.port || '-',
                    c.foreign || '-',
                    c.state || '-',
                    c.pid || '-',
                    `"${(c.procName || '-').replace(/"/g, '""')}"`, // Escape quotes in CSV
                    `"${(c.geo || '-').replace(/"/g, '""')}"`,
                    c.bytes || 0,
                    c.age || 0
                ].join(','))
            ].join('\n');
            fs.writeFileSync(filepath, csv);
        }

        res.json({ success: true, filename });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Block IP
app.post('/api/block', (req, res) => {
    const { ip } = req.body;

    if (!ip) {
        return res.status(400).json({ success: false, message: 'IP address required' });
    }

    // Initialize ipFiltering if not exists
    if (!config.ipFiltering) {
        config.ipFiltering = { enabled: true, blocklist: [], allowlist: [] };
    }

    if (!config.ipFiltering.blocklist.includes(ip)) {
        config.ipFiltering.blocklist.push(ip);
        config.ipFiltering.enabled = true;

        // Save config
        try {
            fs.writeFileSync('config.yml', yaml.dump(config));
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    } else {
        res.json({ success: false, message: 'IP already blocked' });
    }
});

// API: Update connections from scanner (main data ingestion endpoint)
app.post('/api/update', (req, res) => {
    if (!isPaused) {
        connections = req.body.connections || [];

        // Store historical data point
        if (config.monitoring?.trackHistory) {
            const dataPoint = {
                timestamp: Date.now(),
                tcpCount: connections.filter(c => c.proto === 'TCP').length,
                udpCount: connections.filter(c => c.proto === 'UDP').length,
                totalBandwidth: connections.reduce((sum, c) => sum + (c.bytes || 0), 0)
            };

            historicalData.push(dataPoint);

            // Keep only data within retention period
            const retention = config.monitoring?.historyRetention || 604800000;
            const cutoff = Date.now() - retention;
            historicalData = historicalData.filter(d => d.timestamp >= cutoff);
        }

        // Broadcast to connected WebSocket clients
        broadcast({ type: 'connections', connections });
    }

    res.json({ success: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Import chalk dynamically (ES module)
import('chalk').then(chalkModule => {
    const chalk = chalkModule.default;
    console.log(chalk.cyan.bold('\n⚡ Dashboard Server Started\n'));
    console.log(chalk.green(`✓ Server running on http://localhost:${port}`));
    console.log(chalk.yellow(`✓ WebSocket server ready`));
    console.log(chalk.gray(`\nWaiting for scanner data...\n`));
}).catch(() => {
    console.log('\n⚡ Dashboard Server Started\n');
    console.log(`✓ Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    server.close(() => {
        process.exit(0);
    });
});