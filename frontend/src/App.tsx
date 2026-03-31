/**
 * Red Tetris - Main App Component
 * Sets up routing and global providers
 */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage, GameRoom, NotFoundPage } from "./pages";
import { SocketTest } from "./pages/SocketTest";
import { useSocket, useSingleTab, useBackNavigationDetection } from "@/hooks";
import "./App.css";

function BackNavigationListener() {
  useBackNavigationDetection();
  return null;
}

function AppContent() {
  // Initialize socket connection (currently disabled until backend is ready)
  useSocket();

  return (
    <BrowserRouter>
      <BackNavigationListener />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test-socket" element={<SocketTest />} />
        <Route path="/:room/:playerName" element={<GameRoom />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function DuplicateTabWarning() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "#d32f2f" }}>Red Tetris is already running\!</h1>
      <p>
        Playing in multiple tabs is not supported. Please close this tab and
        return to your active game.
      </p>
    </div>
  );
}

function App() {
  const isDuplicate = useSingleTab();

  if (isDuplicate) return <DuplicateTabWarning />;

  return <AppContent />;
}

export default App;
