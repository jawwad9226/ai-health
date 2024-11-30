const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize PowerShell process
let powershell = null;
let mainWindow = null;

// Initialize Gemini AI
let genAI = null;
let model = null;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

const initializePowerShell = () => {
    if (powershell) {
        powershell.kill();
    }

    const currentPath = app.getAppPath();
    console.log('Starting PowerShell in:', currentPath);

    powershell = spawn('powershell.exe', ['-NoProfile', '-NoLogo']);
    console.log('PowerShell process started with PID:', powershell.pid);

    powershell.stdout.on('data', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('ps-output', data.toString());
        }
    });

    powershell.stderr.on('data', (data) => {
        if (mainWindow) {
            mainWindow.webContents.send('ps-error', data.toString());
            // Automatically analyze errors
            analyzeError(data.toString());
        }
    });

    powershell.on('error', (error) => {
        console.error('PowerShell error:', error);
        if (mainWindow) {
            mainWindow.webContents.send('ps-error', error.message);
        }
    });

    powershell.on('exit', (code) => {
        console.log('PowerShell process exited with code:', code);
        if (code !== 0) {
            initializePowerShell();
        }
    });
};

// Initialize AI
const initializeAI = async () => {
    try {
        genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE');
        model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        console.log('AI initialized successfully');
    } catch (error) {
        console.error('Failed to initialize AI:', error);
    }
};

// Analyze errors with AI
const analyzeError = async (error) => {
    try {
        if (!model) {
            await initializeAI();
        }

        const prompt = `Analyze this PowerShell error and explain how to fix it in a clear and concise way:
${error}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        mainWindow.webContents.send('ai-response', response.text());
    } catch (error) {
        console.error('AI analysis error:', error);
        mainWindow.webContents.send('ai-response', 'Sorry, I encountered an error analyzing the command.');
    }
};

// Chat with AI
const chatWithAI = async (message) => {
    try {
        if (!model) {
            await initializeAI();
        }

        const prompt = `You are a helpful PowerShell assistant. Please respond to this question or request:
${message}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        mainWindow.webContents.send('ai-response', response.text());
    } catch (error) {
        console.error('AI chat error:', error);
        mainWindow.webContents.send('ai-response', 'Sorry, I encountered an error processing your message.');
    }
};

// IPC Handlers
ipcMain.on('execute-command', (event, command) => {
    if (powershell && !powershell.killed) {
        powershell.stdin.write(command + '\n');
    } else {
        initializePowerShell();
        powershell.stdin.write(command + '\n');
    }
});

ipcMain.on('analyze-error', async (event, error) => {
    await analyzeError(error);
});

ipcMain.on('chat-with-ai', async (event, message) => {
    await chatWithAI(message);
});

app.whenReady().then(() => {
    createWindow();
    initializePowerShell();
    initializeAI();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (powershell) {
        powershell.kill();
    }
});
