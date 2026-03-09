# Project Context: Red Tetris
This is a web-based multiplayer Tetris game. The goal is to build a networked game using a Full Stack JavaScript/TypeScript stack.

## Tech Stack
- **Frontend**: React (Functional only), Redux (State Management), Socket.io-client.
- **Backend**: Node.js, Socket.io.
- **Testing**: Jest (Unit), coverage is mandatory.
- **Styling**: CSS/SCSS (Flexbox or Grid required).

## Technical Constraints (Strict)
1.  **Frontend Rendering**:
    -   **Forbidden**: `<table>`, `<canvas>`, SVG, jQuery.
    -   **Allowed**: Use CSS Grid or Flexbox for the game board.
2.  **Client-Side Logic**:
    -   **No `this` keyword**: Do not use classes or `this` on the client (except for extending Error).
    -   **Pure Functions**: Game logic must be written as pure functions.
3.  **Server-Side Logic**:
    -   **OOP**: Use Object-Oriented Programming (Classes/Prototypes) for Server logic (Player, Piece, Game).
4.  **Testing**:
    -   Minimum 70% coverage for statements, functions, and lines.
    -   Minimum 50% coverage for branches.

## Coding Standards
1.  **TypeScript**: strict typing, no `any`. Define interfaces for all props and state. Use object.
2.  **React**: Functional components only.
3.  **State Management**: Redux is recommended by the subject.
4.  **Comments**: Document complex game logic.

## Behavior
- When generating client code, ensure it is purely functional.
- When generating server code, use classes (`Player`, `Piece`, `Game`).
- Prioritize logic that is easily testable to meet coverage goals.
- Use immutable data patterns where possible.
