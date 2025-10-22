import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { exec } from 'child_process';
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
let searchQuery = '';
let activeFilters = {
    protocol: [],
    port: [],
    process: [],
    country: []
};

// WebSocket server for real-time updates
const wss = new WebSocketServer({ noServer: true });

const server = app.listen(port, () => {
    console.log(`Dashboard server running on http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Broadcast to all connected clients
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(JSON.stringify(data));
        }
    });
}

// API endpoints
app.get('/api/connections', (req, res) => {
    res.json({ connections, isPaused });
});

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

app.post('/api/pause', (req, res) => {
    isPaused = !isPaused;
    broadcast({ type: 'pause', isPaused });
    res.json({ isPaused });
});

app.post('/api/search', (req, res) => {
    searchQuery = req.body.query || '';
    res.json({ success: true });
});

app.post('/api/filter', (req, res) => {
    activeFilters = req.body.filters || activeFilters;
    res.json({ success: true });
});

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
                    c.proto, c.local, c.port, c.foreign, c.state, c.pid, c.procName, c.geo, c.bytes, c.age
                ].join(','))
            ].join('\n');
            fs.writeFileSync(filepath, csv);
        }

        res.json({ success: true, filename });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/block', (req, res) => {
    const { ip } = req.body;

    // Add to blocklist in config
    if (!config.ipFiltering) config.ipFiltering = { enabled: true, blocklist: [], allowlist: [] };
    if (!config.ipFiltering.blocklist.includes(ip)) {
        config.ipFiltering.blocklist.push(ip);
        config.ipFiltering.enabled = true;

        // Save config
        fs.writeFileSync('config.yml', yaml.dump(config));
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'IP already blocked' });
    }
});

// Update connections from scanner
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

            // Keep only last 7 days
            const retention = config.monitoring?.historyRetention || 604800000;
            const cutoff = Date.now() - retention;
            historicalData = historicalData.filter(d => d.timestamp >= cutoff);
        }

        // Broadcast to connected clients
        broadcast({ type: 'connections', connections });
    }

    res.json({ success: true });
});

console.log('Server initialized');