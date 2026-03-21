import { Socket } from 'socket.io';
import { Logger } from '../utils/helpers';
import { GameModeUpdateEvent, GameSettingsUpdateEvent, PlayerInputEvent } from '@shared/types/socket';
import { RoomManager } from '../managers/RoomManager';

export function wsGameHandler(socket: Socket) {
  const roomManager = RoomManager.getInstance();

  socket.on('PLAYER_INPUT', async (payload: PlayerInputEvent) => {
    const { playerId, input } = payload;
    Logger.debug(`Received PLAYER_INPUT from ${playerId}:`, payload);
    try {
      if (!(await roomManager.handlePlayerInput(playerId, input))) {
        Logger.error(`No active game found for player ${playerId} when processing input:`, payload);
      }
    } catch (error) {
      Logger.error(`Failed to process PLAYER_INPUT for player ${playerId}:`, error);
    }
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
