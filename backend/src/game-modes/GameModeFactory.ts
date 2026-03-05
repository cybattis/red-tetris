/**
 * Game Mode Factory
 * Creates appropriate game mode strategy instances
 */

import { GameMode } from '../../../shared/types/game.js';
import { GameModeStrategy } from './GameModeStrategy.js';
import { DefaultGameMode } from './modes/DefaultGameMode.js';
import { SprintMode } from './modes/SprintMode.js';

export class GameModeFactory {
  /**
   * Creates a game mode strategy instance based on the specified mode
   * @param mode - The game mode to create
   * @returns The appropriate strategy instance
   */
  static createStrategy(mode: GameMode): GameModeStrategy {
    switch (mode) {
      case GameMode.Classic:
        return new DefaultGameMode(GameMode.Classic);
        
      case GameMode.Invisible:
        // Invisible mode uses default game logic - invisibility is handled frontend-side
        return new DefaultGameMode(GameMode.Invisible);
        
      case GameMode.Sprint:
        return new SprintMode();
        
      default:
        // Default to classic mode if unknown mode is provided
        console.warn(`Unknown game mode: ${mode}. Defaulting to Classic.`);
        return new DefaultGameMode(GameMode.Classic);
    }
  }

  /**
   * Get all available game modes
   * @returns Array of all supported game modes
   */
  static getAllModes(): GameMode[] {
    return [GameMode.Classic, GameMode.Invisible, GameMode.Sprint];
  }

  /**
   * Validate if a game mode is supported
   * @param mode - The mode to validate
   * @returns True if the mode is supported
   */
  static isValidMode(mode: GameMode): boolean {
    return GameModeFactory.getAllModes().includes(mode);
  }
}
