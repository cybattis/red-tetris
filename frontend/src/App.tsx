/**
 * Red Tetris - Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, GameRoom } from './pages';
import { SocketTest } from './pages/SocketTest';
import { useSocket } from './hooks/index.js';
import './App.css';

function App() {
  // Initialize socket connection (currently disabled until backend is ready)
  useSocket();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test-socket" element={<SocketTest />} />
        <Route path="/:room/:playerName" element={<GameRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
