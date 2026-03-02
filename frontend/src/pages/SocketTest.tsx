import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const enum LogType {
  Sent = 'sent',
  Received = 'received',
  Status = 'status',
}

interface LogEntry {
  type: LogType;
  message: string;
  timestamp: string;
}

export function SocketTest() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [eventName, setEventName] = useState('ping');
  const [eventData, setEventData] = useState('{}');
  const [isConnected, setIsConnected] = useState(false);

  // Predefined templates only
  const templates: Record<string, string> = {
    custom: '{}',
    room: '{"action": "join", "room": "testRoom"}',
    settings: '{"mode": "classic", "difficulty": "hard"}',
    game: '{"action": "start"}',
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setEventName(type === 'custom' ? '' : type);
    setEventData(templates[type] || '{}');
  };

  const addLog = (type: LogType, message: string) => {
    setLogs((prev) => [
      { type, message, timestamp: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  };

  const connect = () => {
    if (socket) return;

    // Adjust URL if your backend runs on a different port/host
    const newSocket = io('ws://localhost:8000', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      addLog(LogType.Status, `Connected with ID: ${newSocket.id}`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      addLog(LogType.Status, 'Disconnected');
    });

    newSocket.onAny((event, ...args) => {
      addLog(LogType.Received, `Event: ${event} | Data: ${JSON.stringify(args)}`);
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const emitEvent = () => {
    if (!socket || !isConnected) {
      addLog(LogType.Status, 'Error: Not connected');
      return;
    }

    try {
      const parsedData = JSON.parse(eventData);
      socket.emit(eventName, parsedData);
      addLog(LogType.Sent, `Event: ${eventName} | Data: ${eventData}`);
    } catch (e) {
      addLog(LogType.Status, 'Error: Invalid JSON data');
    }
  };

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>WebSocket Tester</h1>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={connect} disabled={isConnected}>Connect</button>
        <button onClick={disconnect} disabled={!isConnected} style={{ marginLeft: '10px' }}>Disconnect</button>
        <span style={{ marginLeft: '10px' }}>
          Status: <strong style={{ color: isConnected ? 'green' : 'red' }}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </strong>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Controls */}
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px' }}>
          <h3>Emit Event</h3>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Message Type:</label>
            <select
              onChange={handleTypeChange}
              style={{ width: '100%', padding: '5px' }}
              defaultValue="custom"
            >
              <option value="custom">Custom</option>
              <option value="room">Room</option>
              <option value="settings">Settings</option>
              <option value="game">Game</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Event Name:</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block' }}>Data (JSON):</label>
            <textarea
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              rows={5}
              style={{ width: '100%' }}
            />
          </div>
          <button onClick={emitEvent} disabled={!isConnected}>Send</button>
        </div>

        {/* Logs */}
        <div style={{ flex: 2, border: '1px solid #ccc', padding: '10px', height: '400px', overflowY: 'auto' }}>
          <h3>Logs</h3>
          <button onClick={() => setLogs([])}>Clear Logs</button>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {logs.map((log, index) => (
              <li key={index} style={{
                padding: '5px',
                borderBottom: '1px solid #eee',
                color: log.type === LogType.Sent ? 'blue' : log.type === LogType.Received ? 'green' : 'gray'
              }}>
                <span style={{ fontSize: '0.8em', marginRight: '10px' }}>[{log.timestamp}]</span>
                <strong>{log.type.toUpperCase()}:</strong> {log.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
