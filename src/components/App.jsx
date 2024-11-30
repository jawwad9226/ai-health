import React, { useState, useEffect } from 'react';
import Terminal from './Terminal';
import '../styles/App.css';

const App = () => {
    const [terminalHistory, setTerminalHistory] = useState([]);
    const [aiMessages, setAiMessages] = useState([]);
    const [theme, setTheme] = useState('dark');
    const [userInput, setUserInput] = useState('');

    useEffect(() => {
        // Listen for PowerShell output
        window.electron.on('ps-output', (output) => {
            setTerminalHistory(prev => [...prev, { type: 'output', content: output }]);
        });

        // Listen for errors
        window.electron.on('ps-error', (error) => {
            setTerminalHistory(prev => [...prev, { type: 'error', content: error }]);
            // Automatically analyze errors with AI
            window.electron.send('analyze-error', error);
        });

        // Listen for AI responses
        window.electron.on('ai-response', (response) => {
            setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
        });

        return () => {
            window.electron.removeAllListeners('ps-output');
            window.electron.removeAllListeners('ps-error');
            window.electron.removeAllListeners('ai-response');
        };
    }, []);

    const handleCommand = (command) => {
        setTerminalHistory(prev => [...prev, { type: 'command', content: command }]);
        window.electron.send('execute-command', command);
    };

    const handleAiChat = (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        setAiMessages(prev => [...prev, { role: 'user', content: userInput }]);
        window.electron.send('chat-with-ai', userInput);
        setUserInput('');
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className={`app-container ${theme}`}>
            <div className="header">
                <span className="logo-text">AI Terminal</span>
                <button className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </div>
            
            <div className="main-content">
                <div className="terminal-section">
                    <div className="terminal-header">
                        <span className="terminal-title">PowerShell Terminal</span>
                    </div>
                    <Terminal onCommand={handleCommand} theme={theme} />
                </div>

                <div className="ai-section">
                    <div className="ai-header">
                        <span className="ai-title">AI Assistant</span>
                    </div>
                    <div className="ai-messages">
                        {aiMessages.map((message, index) => (
                            <div key={index} className={`message ${message.role}`}>
                                <span className="message-icon">
                                    {message.role === 'assistant' ? '🤖' : '👤'}
                                </span>
                                <div className="message-content">{message.content}</div>
                            </div>
                        ))}
                    </div>
                    <form className="ai-input" onSubmit={handleAiChat}>
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Ask AI anything..."
                            className="ai-input-field"
                        />
                        <button type="submit" className="ai-send-button">Send</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default App;
