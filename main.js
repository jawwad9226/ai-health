require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let powershellProcess = null;
let isInitializing = false;

// Validate environment variables
const validateEnv = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Warning: GEMINI_API_KEY is not set');
    }
    return {
        GEMINI_API_KEY: apiKey || '',
        USE_GEMINI: process.env.USE_GEMINI === 'true'
    };
};

function createWindow() {
    const envVars = validateEnv();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'src/preload.js'),
            additionalArguments: [
                `--gemini-api-key=${envVars.GEMINI_API_KEY}`,
                `--use-gemini=${envVars.USE_GEMINI}`
            ]
        }
    });

    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self';",
                    "script-src 'self';",
                    "style-src 'self' 'unsafe-inline';",
                    "img-src 'self' data: https:;",
                    "connect-src 'self' https://generativelanguage.googleapis.com;",
                    "font-src 'self';"
                ].join(' ')
            }
        });
    });

    mainWindow.loadFile('dist/index.html');

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            window.env = {
                GEMINI_API_KEY: '${envVars.GEMINI_API_KEY}',
                USE_GEMINI: ${envVars.USE_GEMINI}
            };
        `);
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        cleanupPowerShell();
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    cleanupPowerShell();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

function cleanupPowerShell() {
    if (powershellProcess) {
        try {
            process.kill(powershellProcess.pid);
        } catch (error) {
            console.error('Error killing PowerShell process:', error);
        }
        powershellProcess = null;
    }
}

async function initializePowershell() {
    if (isInitializing) return;
    isInitializing = true;

    try {
        cleanupPowerShell();

        const startPath = process.cwd();
        console.log('Starting PowerShell in:', startPath);

        powershellProcess = spawn('powershell.exe', [
            '-NoProfile',
            '-NoLogo',
            '-ExecutionPolicy', 
            'Bypass'
        ], {
            cwd: startPath,
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        });

        if (!powershellProcess || !powershellProcess.pid) {
            throw new Error('Failed to start PowerShell process');
        }

        console.log('PowerShell process started with PID:', powershellProcess.pid);

        // Set up output handling
        powershellProcess.stdout.on('data', (data) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ps-output', data.toString());
            }
        });

        powershellProcess.stderr.on('data', (data) => {
            console.error('PowerShell stderr:', data.toString());
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ps-error', data.toString());
            }
        });

        powershellProcess.on('error', (error) => {
            console.error('PowerShell process error:', error);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ps-error', error.message);
            }
            cleanupPowerShell();
        });

        powershellProcess.on('exit', (code, signal) => {
            console.log('PowerShell process exited with code:', code, 'signal:', signal);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ps-exit', { code, signal });
            }
            cleanupPowerShell();
        });

        // Change directory to start path
        powershellProcess.stdin.write(`Set-Location "${startPath}"\n`);

        // Send ready event
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ps-ready', true);
        }

    } catch (error) {
        console.error('Error initializing PowerShell:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ps-error', `Failed to initialize PowerShell: ${error.message}`);
        }
        cleanupPowerShell();
    } finally {
        isInitializing = false;
    }
}

ipcMain.on('init-powershell', () => {
    initializePowershell();
});

ipcMain.on('execute-command', (event, command) => {
    if (!powershellProcess || !powershellProcess.pid) {
        console.log('PowerShell not initialized, reinitializing...');
        initializePowershell().then(() => {
            setTimeout(() => {
                if (powershellProcess && powershellProcess.pid) {
                    try {
                        powershellProcess.stdin.write(command + '\n');
                    } catch (error) {
                        console.error('Error executing command:', error);
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('ps-error', `Failed to execute command: ${error.message}`);
                        }
                    }
                }
            }, 1000);
        });
        return;
    }

    try {
        powershellProcess.stdin.write(command + '\n');
    } catch (error) {
        console.error('Error executing command:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ps-error', `Failed to execute command: ${error.message}`);
        }
        initializePowershell();
    }
});
