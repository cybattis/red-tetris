# RED-TETRIS

A real-time multiplayer Tetris game featuring a React frontend and Node.js backend, containerized with Docker.

## Overview

RED-TETRIS is a competitive Tetris implementation designed for real-time multiplayer gameplay. The project is split into two main services:
- **Frontend**: A React application using TypeScript and Vite.
- **Backend**: A Node.js socket server handling game logic and player synchronization.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Socket.io (implied)
- **Infrastructure**: Docker, Docker Compose

## Prerequisites

- Docker
- Docker Compose

## Project Structure

- `backend/` - Node.js server source code
- `frontend/` - React application source code
- `docs/` - Project documentation (`strategy.md`, `subject.md`)
- `docker-compose.yml` - Development orchestration
- `docker-compose-prod.yml` - Production orchestration

## Development

To start the application in development mode with hot-reloading:

1. Build and start the containers:
   ```bash
   docker-compose up --build
   ```

2. Access the application:
   - Frontend: `http://localhost:8000`
   - Backend API: `http://localhost:3000`

## Production

To run the application in production mode:

1. Build and start using the production compose file:
   ```bash
   docker-compose -f docker-compose-prod.yml up --build -d
   ```

2. The application will be served optimized for performance.

## Manual Setup (Non-Docker)

If you prefer running services locally without Docker:

**Backend:**
```bash
cd backend
npm install
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Documentation

detailed project requirements and implementation strategy can be found in the `docs/` directory.