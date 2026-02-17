/**
 * Red Tetris - Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Future routes will be added here */}
        {/* <Route path="/game" element={<GamePage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
