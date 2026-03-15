import { Socket } from 'socket.io';
import { GameManager } from '../managers/GameManager';
import { Logger } from '../utils/helpers';
import { GameModeUpdateEvent, GameSettingsUpdateEvent, PlayerInputEvent } from '@shared/types/socket';

export function wsGameHandler(socket: Socket) {
  const gameManager = GameManager.getInstance();

  socket.on('PLAYER_INPUT', (payload: PlayerInputEvent) => {
    const { playerId, input } = payload;
    Logger.debug(`Received PLAYER_INPUT from ${playerId}:`, payload);
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) {
      Logger.error(`No active game found for player ${playerId} when processing input:`, payload);
      return;
    }
    game.setPlayerInput(input);
  });

  // Additional socket event handlers for room management
  socket.on('UPDATE_SETTINGS', (payload: GameSettingsUpdateEvent) => {
    const { roomId, settings } = payload;

    // For now, just broadcast the settings update to the room
    if (roomId && settings) {
      socket.to(roomId).emit('SETTINGS_UPDATED', { settings });
    }
  });

  socket.on('UPDATE_GAME_MODE', (payload: GameModeUpdateEvent) => {
    const { roomId, gameMode } = payload;

    if (roomId && gameMode) {
      socket.to(roomId).emit('GAME_MODE_UPDATED', { gameMode });
    }
  });
}
