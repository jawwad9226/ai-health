import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const themes = {
    dark: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#7aa2f7',
        selection: 'rgba(122, 162, 247, 0.3)',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0'
    },
    light: {
        background: '#ffffff',
        foreground: '#2e3440',
        cursor: '#5e81ac',
        selection: 'rgba(94, 129, 172, 0.3)',
        black: '#3b4252',
        red: '#bf616a',
        green: '#a3be8c',
        yellow: '#ebcb8b',
        blue: '#5e81ac',
        magenta: '#b48ead',
        cyan: '#88c0d0',
        white: '#e5e9f0',
        brightBlack: '#4c566a',
        brightRed: '#bf616a',
        brightGreen: '#a3be8c',
        brightYellow: '#ebcb8b',
        brightBlue: '#5e81ac',
        brightMagenta: '#b48ead',
        brightCyan: '#8fbcbb',
        brightWhite: '#eceff4'
    }
};

const Terminal = ({ onCommand, theme = 'dark' }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const commandBuffer = useRef('');
    const fitAddonRef = useRef(null);

    useEffect(() => {
        // Initialize terminal
        xtermRef.current = new XTerm({
            cursorBlink: true,
            fontFamily: 'Consolas, monospace',
            fontSize: 14,
            lineHeight: 1.2,
            theme: themes[theme],
            allowTransparency: true,
            rendererType: 'canvas',
            scrollback: 5000,
            cursorStyle: 'bar'
        });

        fitAddonRef.current = new FitAddon();
        xtermRef.current.loadAddon(fitAddonRef.current);

        // Open terminal
        xtermRef.current.open(terminalRef.current);
        fitAddonRef.current.fit();

        // Write initial prompt
        xtermRef.current.write('$ ');

        // Handle input
        xtermRef.current.onData(data => {
            const char = data.charCodeAt(0);
            const printable = !char || (char > 31 && char < 127);

            if (data === '\r') { // Enter
                const command = commandBuffer.current;
                if (command.trim()) {
                    xtermRef.current.write('\r\n');
                    onCommand(command.trim());
                }
                commandBuffer.current = '';
                xtermRef.current.write('\r\n$ ');
            } else if (char === 127) { // Backspace
                if (commandBuffer.current.length > 0) {
                    commandBuffer.current = commandBuffer.current.slice(0, -1);
                    xtermRef.current.write('\b \b');
                }
            } else if (printable) {
                commandBuffer.current += data;
                xtermRef.current.write(data);
            }
        });

        // Handle resize
        const handleResize = () => {
            if (fitAddonRef.current) {
                fitAddonRef.current.fit();
            }
        };

        window.addEventListener('resize', handleResize);

        // PowerShell output handlers
        window.electron.on('ps-output', (output) => {
            if (xtermRef.current) {
                xtermRef.current.write(`${output}\r\n$ `);
            }
        });

        window.electron.on('ps-error', (error) => {
            if (xtermRef.current) {
                xtermRef.current.write(`\x1b[31m${error}\x1b[0m\r\n$ `);
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            window.electron.removeAllListeners('ps-output');
            window.electron.removeAllListeners('ps-error');
            if (xtermRef.current) {
                xtermRef.current.dispose();
            }
        };
    }, [onCommand]);

    // Update theme when it changes
    useEffect(() => {
        if (xtermRef.current) {
            xtermRef.current.options.theme = themes[theme];
        }
    }, [theme]);

    return (
        <div 
            ref={terminalRef} 
            style={{ 
                width: '100%', 
                height: '100%',
                padding: '0.5rem'
            }} 
        />
    );
};

export default Terminal;
