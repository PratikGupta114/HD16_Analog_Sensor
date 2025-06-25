import React, { useState, useEffect, useRef } from 'react';
import './SensorDisplay.css';

const NUM_SENSORS = 16;
const MAX_SENSOR_VALUE = 1023;
const WS_URL = 'ws://localhost:8080'; // Make sure this matches your backend WebSocket server
const RECONNECT_DELAY = 3000; // milliseconds

enum ConnectionStatus {
    CONNECTING = 'Connecting...',
    CONNECTED = 'Connected',
    DISCONNECTED = 'Disconnected',
    RECONNECTING = 'Re-connecting...'
}

enum UsbStatus {
    NA = 'N/A', // When server is not connected
    CONNECTED = 'Connected',
    DISCONNECTED = 'Disconnected'
}

interface SensorDisplayProps {}

const SensorDisplay: React.FC<SensorDisplayProps> = () => {
    const [sensorData, setSensorData] = useState<number[]>(Array(NUM_SENSORS).fill(0));
    const [serverConnectionStatus, setServerConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
    const [usbStatus, setUsbStatus] = useState<UsbStatus>(UsbStatus.NA);
    const [serialPortName, setSerialPortName] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimerId = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Update USB status whenever server connection status changes
        if (serverConnectionStatus === ConnectionStatus.CONNECTED) {
            // If server is connected, USB status depends on messages from backend.
            // It will be updated by onmessage. If no message received yet, it might stay N/A or a default.
            // Let's default to N/A until a serial_status message is received.
            // setUsbStatus(UsbStatus.NA); // This will be quickly overwritten by serial_status message if backend sends one on connect.
        } else {
            setUsbStatus(UsbStatus.NA);
            setSerialPortName(null); // Clear port name if server is not connected
        }
    }, [serverConnectionStatus]);

    const connect = () => {
        if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket already open or connecting.');
            return;
        }

        if (reconnectTimerId.current) {
            clearTimeout(reconnectTimerId.current);
            reconnectTimerId.current = null;
        }

        if (serverConnectionStatus !== ConnectionStatus.RECONNECTING && serverConnectionStatus !== ConnectionStatus.CONNECTING) {
            setServerConnectionStatus(ConnectionStatus.CONNECTING);
        }
        console.log(`Attempting to connect to WebSocket: ${WS_URL}`);
        setUsbStatus(UsbStatus.NA); // Default USB status to N/A during connection attempts

        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
            console.log('Connected to WebSocket server');
            setServerConnectionStatus(ConnectionStatus.CONNECTED);
            // USB status will be set by the first serial_status message from the backend.
            if (reconnectTimerId.current) {
                clearTimeout(reconnectTimerId.current);
                reconnectTimerId.current = null;
            }
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data as string);
                if (message.type === 'serial_status') {
                    console.log('Received serial_status:', message);
                    setSerialPortName(message.portName || null);
                    if (message.status === 'connected') {
                        setUsbStatus(UsbStatus.CONNECTED);
                    } else if (message.status === 'disconnected') {
                        setUsbStatus(UsbStatus.DISCONNECTED);
                    } else {
                        setUsbStatus(UsbStatus.NA); // Should not happen if server sends valid messages
                    }
                } else if (Array.isArray(message) && message.length === NUM_SENSORS && message.every(val => typeof val === 'number')) {
                    setSensorData(message);
                } else {
                    // console.warn('Received unhandled or malformed data from WebSocket:', message);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.current.onclose = (event) => {
            console.log('Disconnected from WebSocket server. Code:', event.code, 'Reason:', event.reason);
            setServerConnectionStatus(ConnectionStatus.DISCONNECTED); // This will trigger useEffect to set USB N/A
            if (event.code !== 1000) {
                attemptReconnect();
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (serverConnectionStatus !== ConnectionStatus.RECONNECTING) {
                setServerConnectionStatus(ConnectionStatus.RECONNECTING); // This will trigger useEffect
            }
            if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
                // onclose will usually be called, which handles full DISCONNECTED state and reconnect logic
            }
        };
    };

    const attemptReconnect = () => {
        if (reconnectTimerId.current) {
            return;
        }
        console.log(`Attempting to reconnect in ${RECONNECT_DELAY / 1000} seconds...`);
        setServerConnectionStatus(ConnectionStatus.RECONNECTING); // This will trigger useEffect
        reconnectTimerId.current = setTimeout(() => {
            reconnectTimerId.current = null;
            connect();
        }, RECONNECT_DELAY);
    };

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimerId.current) {
                clearTimeout(reconnectTimerId.current);
            }
            if (ws.current) {
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onclose = null;
                ws.current.onerror = null;
                if (ws.current.readyState === WebSocket.OPEN) {
                    console.log('Closing WebSocket connection on component unmount');
                    ws.current.close(1000, "Component unmounting");
                }
                ws.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    let serverStatusClass = '';
    switch (serverConnectionStatus) {
        case ConnectionStatus.CONNECTED:
            serverStatusClass = 'connected';
            break;
        case ConnectionStatus.DISCONNECTED:
            serverStatusClass = 'disconnected';
            break;
        case ConnectionStatus.CONNECTING:
        case ConnectionStatus.RECONNECTING:
            serverStatusClass = 're-connecting';
            break;
    }

    let usbStatusClass = '';
    let usbStatusText = `(${serialPortName || '-'}) ${usbStatus}`;
    if (usbStatus === UsbStatus.NA) usbStatusText = UsbStatus.NA; // Don't show port name if N/A

    switch (usbStatus) {
        case UsbStatus.CONNECTED:
            usbStatusClass = 'connected';
            break;
        case UsbStatus.DISCONNECTED:
            usbStatusClass = 'disconnected';
            break;
        case UsbStatus.NA:
            usbStatusClass = 'not-applicable';
            break;
    }

    return (
        <div className="sensor-display-container">
            <div className="status-indicators">
                <div className="status-indicator">
                    Server: <span className={serverStatusClass}>
                        {serverConnectionStatus}
                    </span>
                </div>
                <div className="status-indicator">
                    USB/Serial: <span className={usbStatusClass}>
                        {usbStatusText}
                    </span>
                </div>
            </div>
            <div className="bars-container">
                {sensorData.map((value, index) => (
                    <div key={index} className="bar-wrapper">
                        <div className="bar-value">{value}</div>
                        <div className="bar">
                            <div
                                className="bar-fill"
                                style={{
                                    height: `${(value / MAX_SENSOR_VALUE) * 100}%`,
                                    backgroundColor: 'hsla(202.5, 70%, 50%, 0.7)'
                                }}
                            ></div>
                        </div>
                        <div className="bar-label">S{index + 1}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SensorDisplay; 