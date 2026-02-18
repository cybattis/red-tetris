/**
 * Red Tetris - Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, GameRoom } from './pages';
import { useSocket } from './hooks/index.js';
import './App.css';

function App() {
  // Initialize socket connection (currently disabled until backend is ready)
  useSocket();

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:room/:playerName" element={<GameRoom />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
