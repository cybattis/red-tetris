# Red Tetris

**Tetris Network with Red Pelicans Sauce**

## Summary

The objective of this project is to develop a networked multiplayer
Tetris game using a Full Stack JavaScript stack.

Version: 5.2

------------------------------------------------------------------------

# Chapter I --- Foreword

Redpelicans is the sponsor of this project.

------------------------------------------------------------------------

# Chapter II --- Introduction

Build an online multiplayer Tetris game in JavaScript using modern
technologies and asynchronous networking.

------------------------------------------------------------------------

# Chapter III --- Objectives

By building this project, you will:

-   Apply functional programming principles (mandatory)
-   Develop asynchronous client and server logic
-   Implement reactive UI patterns
-   Write industrial-level unit tests

------------------------------------------------------------------------

# Chapter IV --- General Instructions

## Technical Constraints

-   Use latest JavaScript version
-   TypeScript allowed
-   Client-side: no `this` keyword (except Error subclasses)
-   Game logic must use pure functions
-   Server-side must follow OOP with prototypes

## Required Classes (Server)

-   Player
-   Piece
-   Game

## Frontend Rules

-   Modern JS framework (React or Vue)
-   No `<table>`
-   Use Grid or Flexbox
-   No jQuery
-   No Canvas
-   No SVG

## Testing Requirements

-   ≥70% statements, functions, lines
-   ≥50% branches

------------------------------------------------------------------------

# Chapter V --- Mandatory Part

## Tetris Rules

-   Field: 10 columns × 20 rows
-   Same piece sequence for all players
-   Line clear sends (n - 1) penalty lines to opponents
-   Last player alive wins
-   Solo mode supported

## Controls

-   Left/Right: Move
-   Up: Rotate
-   Down: Soft drop
-   Space: Hard drop

## Architecture

-   Client/Server
-   Node.js server
-   HTTP + socket.io
-   SPA client
-   No persistence required

## Game Management

Join via:
http://`<server>`{=html}:`<port>`{=html}/`<room>`{=html}/`<player_name>`{=html}

-   First player = host
-   Host can start/restart
-   No join after game starts
-   Multiple concurrent games supported

## Server Responsibilities

-   Game management
-   Player management
-   Piece distribution
-   Spectrum updates
-   Serve static assets

## Client Responsibilities

-   SPA rendering
-   State management (Redux recommended)
-   socket.io communication

------------------------------------------------------------------------

# Boilerplate

Use provided boilerplate for: - Server startup - Bundling - Testing
pipeline

------------------------------------------------------------------------

# Testing & Security

-   Use .env for secrets
-   Do not commit credentials
-   Maintain required coverage thresholds

------------------------------------------------------------------------

# Bonus Ideas

-   Scoring system
-   Score persistence
-   New game modes
-   Explore FRP

------------------------------------------------------------------------

# Submission

-   Submit via Git repository
-   Game must be fully functional
