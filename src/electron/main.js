import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
    // Load config to get the dashboard port
    let port = 3000;
    try {
        const config = yaml.load(fs.readFileSync('config.yml', 'utf8'));
        port = config.dashboard?.port || 3000;
    } catch (e) {
        console.log('Could not load config, using default port 3000');
    }

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
        icon: path.join(__dirname, 'icon.png') // Optional: add icon later
    });

    // Load from the server instead of file
    const dashboardUrl = `http://localhost:${port}`;

    // Show loading message
    mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
            <head>
                <style>
                    body { 
                        margin: 0; 
                        padding: 0; 
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
                </style>
            </head>
            <body>
                <div class="loader">
                    <div class="spinner"></div>
                    <h2>Loading Dashboard...</h2>
                    <p>Connecting to server at ${dashboardUrl}</p>
                    <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">If this takes too long, make sure the server is running</p>
                </div>
            </body>
        </html>
    `);

    // Wait a moment for server to be ready, then load dashboard
    setTimeout(() => {
        mainWindow.loadURL(dashboardUrl).catch(err => {
            console.error('Failed to load dashboard:', err);
            mainWindow.loadURL(`data:text/html;charset=utf-8,
                <html>
                    <head>
                        <style>
                            body { 
                                margin: 0; 
                                padding: 0; 
                                display: flex; 
                                justify-content: center; 
                                align-items: center; 
                                height: 100vh; 
                                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                color: white;
                                text-align: center;
                            }
                            .error {
                                background: rgba(244, 67, 54, 0.2);
                                padding: 30px;
                                border-radius: 10px;
                                border: 2px solid #f44336;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="error">
                            <h1>⚠️ Connection Failed</h1>
                            <p>Could not connect to dashboard server</p>
                            <p>Please make sure the server is running:</p>
                            <p><code>npm run dashboard</code></p>
                        </div>
                    </body>
                </html>
            `);
        });
    }, 2000);

    // Remove dev tools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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