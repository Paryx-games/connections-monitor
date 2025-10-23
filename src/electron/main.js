import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Wait for server to be ready
async function waitForServer(url, maxAttempts = 30, delayMs = 500) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`${url}/health`, { timeout: 2000 });
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
}

async function createWindow() {
    // Load config to get the dashboard port
    let port = 3000;
    try {
        const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
        port = config.dashboard?.port || 3000;
    } catch (e) {
        console.log('Could not load config, using default port 3000');
    }

    const dashboardUrl = `http://localhost:${port}`;

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        frame: true,
        title: 'Connections Monitor Dashboard',
        backgroundColor: '#0f1419',
        show: false // Don't show until ready
    });

    // Show loading page
    mainWindow.loadURL(`data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: white;
                    }
                    .loader {
                        text-align: center;
                    }
                    .spinner {
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid #4fc3f7;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    h2 { margin-bottom: 10px; font-size: 24px; }
                    p { opacity: 0.8; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="loader">
                    <div class="spinner"></div>
                    <h2>Loading Dashboard...</h2>
                    <p>Waiting for server...</p>
                </div>
            </body>
        </html>
    `);

    // Show window once loaded
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Wait for server to be ready
    console.log('Waiting for dashboard server...');
    const serverReady = await waitForServer(dashboardUrl);

    if (serverReady) {
        console.log('Server ready, loading dashboard...');
        try {
            await mainWindow.loadURL(dashboardUrl);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            showErrorPage(mainWindow, dashboardUrl);
        }
    } else {
        console.error('Server failed to start within timeout');
        showErrorPage(mainWindow, dashboardUrl);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function showErrorPage(window, dashboardUrl) {
    window.loadURL(`data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: white;
                        text-align: center;
                        padding: 20px;
                    }
                    .error {
                        background: rgba(244, 67, 54, 0.2);
                        padding: 40px;
                        border-radius: 15px;
                        border: 2px solid #f44336;
                        max-width: 600px;
                    }
                    h1 { margin-bottom: 20px; font-size: 32px; }
                    p { margin: 10px 0; font-size: 16px; opacity: 0.9; }
                    code { 
                        background: rgba(0, 0, 0, 0.3); 
                        padding: 5px 10px; 
                        border-radius: 5px;
                        font-family: 'Courier New', monospace;
                    }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>⚠️ Connection Failed</h1>
                    <p>Could not connect to dashboard server at:</p>
                    <p><code>${dashboardUrl}</code></p>
                    <br>
                    <p>Please make sure the server is running.</p>
                    <p>Try restarting the application.</p>
                </div>
            </body>
        </html>
    `);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});