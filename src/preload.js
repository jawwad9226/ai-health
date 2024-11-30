const { contextBridge, ipcRenderer } = require('electron');

// Expose environment variables safely
contextBridge.exposeInMainWorld('env', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    USE_GEMINI: process.env.USE_GEMINI === 'true',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
});

// Expose protected IPC APIs to renderer
contextBridge.exposeInMainWorld('electron', {
    // Send messages to main process
    send: (channel, data) => {
        const validChannels = ['init-powershell', 'execute-command', 'init-ai', 'analyze-command'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    // Receive messages from main process
    on: (channel, func) => {
        const validChannels = ['ps-ready', 'ps-error', 'ps-output', 'ai-response'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    // Remove listeners
    removeAllListeners: (channel) => {
        const validChannels = ['ps-ready', 'ps-error', 'ps-output', 'ai-response'];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    }
});
