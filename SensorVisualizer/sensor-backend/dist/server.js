"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const serialport_1 = require("serialport");
const parser_readline_1 = require("@serialport/parser-readline");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
const HTTP_PORT = 8080;
// IMPORTANT: Replace with your actual serial port path and baud rate
const SERIAL_PORT_PATH = '/dev/ttyUSB0'; // Or '/dev/ttyACM0', 'COM3', etc.
const BAUD_RATE = 115200;
const RECONNECT_INTERVAL = 5000; // Try to reconnect every 5 seconds
let port = null;
let parser = null;
let reconnectTimer = null;
function broadcastMessage(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}
function broadcastSerialStatus(status) {
    const message = {
        type: 'serial_status',
        status: status,
        portName: SERIAL_PORT_PATH
    };
    console.log(`Broadcasting serial status: ${status} for port ${SERIAL_PORT_PATH}`);
    broadcastMessage(message);
}
function setupParserAndEvents() {
    if (!port)
        return;
    parser = port.pipe(new parser_readline_1.ReadlineParser({ delimiter: '\r\n' }));
    parser.on('data', (line) => {
        console.log(`Data: ${line}`); // Potentially too verbose for regular operation
        const values = line.trim().split(' ').map(Number);
        if (values.length === 16 && values.every(v => !isNaN(v) && v >= 0 && v <= 1023)) {
            broadcastMessage(values); // Send sensor data
        }
        else {
            console.warn('Received malformed data:', line); // Only log if debugging needed
        }
    });
    port.on('error', (err) => {
        console.error(`SerialPort Error on ${SERIAL_PORT_PATH}:`, err.message);
        // The 'close' event will usually follow and trigger reconnection logic and status broadcast.
    });
    port.on('open', () => {
        console.log(`Serial port ${SERIAL_PORT_PATH} opened successfully.`);
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        broadcastSerialStatus('connected');
    });
    port.on('close', (err) => {
        if (err) {
            console.warn(`Serial port ${SERIAL_PORT_PATH} closed due to error: ${err.message}. This often indicates a physical disconnection or device issue.`);
        }
        else {
            console.log(`Serial port ${SERIAL_PORT_PATH} closed.`);
        }
        port = null;
        parser = null;
        broadcastSerialStatus('disconnected');
        if (!reconnectTimer) {
            console.log(`Will attempt to reconnect to ${SERIAL_PORT_PATH} in ${RECONNECT_INTERVAL / 1000} seconds...`);
            reconnectTimer = setTimeout(attemptSerialConnection, RECONNECT_INTERVAL);
        }
    });
}
function attemptSerialConnection() {
    if (port && port.isOpen) {
        console.log(`Serial port ${SERIAL_PORT_PATH} is already open.`);
        return;
    }
    console.log(`Attempting to open serial port: ${SERIAL_PORT_PATH} at ${BAUD_RATE} baud`);
    try {
        port = new serialport_1.SerialPort({
            path: SERIAL_PORT_PATH,
            baudRate: BAUD_RATE,
            autoOpen: true,
        });
        setupParserAndEvents();
    }
    catch (error) {
        console.error(`Failed to create or immediately open serial port ${SERIAL_PORT_PATH}:`, error.message);
        // The 'close' event (if the port was briefly instantiated) or lack of 'open' will lead to retries.
        // This direct catch is for synchronous errors during new SerialPort().
        if (!reconnectTimer) {
            console.log(`Retrying connection to ${SERIAL_PORT_PATH} in ${RECONNECT_INTERVAL / 1000} seconds due to instantiation error...`);
            reconnectTimer = setTimeout(attemptSerialConnection, RECONNECT_INTERVAL);
        }
    }
}
wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket server.');
    // Send current serial port status to the newly connected client
    const currentSerialStatus = (port && port.isOpen) ? 'connected' : 'disconnected';
    ws.send(JSON.stringify({
        type: 'serial_status',
        status: currentSerialStatus,
        portName: SERIAL_PORT_PATH
    }));
    ws.on('message', (message) => {
        console.log('Received WebSocket message: %s', message);
    });
    ws.on('close', () => {
        console.log('Client disconnected from WebSocket server.');
    });
    ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
    });
});
server.listen(HTTP_PORT, () => {
    console.log(`HTTP and WebSocket server started on port ${HTTP_PORT}`);
    attemptSerialConnection();
});
function gracefulShutdown() {
    console.log('Shutting down server...');
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
    }
    wss.clients.forEach(client => {
        client.close();
    });
    if (port && port.isOpen) {
        port.close((err) => {
            if (err) {
                console.error('Error closing serial port during shutdown:', err);
            }
            else {
                console.log('Serial port closed during shutdown.');
            }
            server.close(() => {
                console.log('HTTP server closed.');
                process.exit(0);
            });
        });
    }
    else {
        server.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
    }
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
