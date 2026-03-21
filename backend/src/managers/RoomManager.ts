import { Room } from '../classes/Room';
import { Player } from '../classes/Player';
import { Logger } from '../utils/helpers';
import { DEFAULT_SETTINGS, GameAction, GameSettings } from '@shared/types/game';
import { RoomErrorEvent, RoomResults, RoomInfo } from '@shared/types/room';
import { Socket } from 'socket.io';
import { PlayerJoinedEvent, RoomLeaveEvent } from '@shared/types/socket';
import { RoomWorkerManager } from './RoomWorkerManager';
import { randomUUID } from 'node:crypto';

export class RoomManager {
  private static instance: RoomManager;
  private readonly _rooms: Map<string, Room> = new Map();
  private readonly _playerRooms: Map<string, string> = new Map(); // playerId -> roomId mapping
  private readonly _roomWorkers = RoomWorkerManager.getInstance();

  private constructor() {
    Logger.info('RoomManager initialized');
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  // Room operations
  // --------------------------------------------------------------
  public createRoom(roomId: string): Room {
    if (this._rooms.has(roomId)) {
      return this._rooms.get(roomId)!;
    }

    const room = new Room(roomId);
    this._rooms.set(roomId, room);
    Logger.info(`Room created: ${roomId}`);
    return room;
  }

  public getRoom(roomId: string): Room | null {
    return this._rooms.get(roomId) || null;
  }

  public getRoomForPlayer(playerId: string): Room | null {
    const roomId = this._playerRooms.get(playerId);
    return roomId ? this.getRoom(roomId) : null;
  }

  public joinRoom(
    roomId: string,
    player: Player,
    socket: Socket,
  ): RoomResults<{ roomInfo: RoomInfo; playerJoined?: PlayerJoinedEvent }> {
    // Check if player is already in a room
    const currentRoom = this.getRoomForPlayer(player.id);
    if (currentRoom) {
      if (currentRoom.id === roomId) {
        // Player is already in the requested room
        Logger.info(
          `Player ${player.name} (${player.id}) attempted to join room ${roomId} but is already in that room`,
        );
        return {
          success: true,
          data: { roomInfo: currentRoom.toRoomInfo() },
        };
      } else {
        // Player is in a different room, need to leave first
        Logger.info(
          `Player ${player.name} (${player.id}) is in room ${currentRoom.id}, leaving to join ${roomId}`,
        );
        this.leaveRoom(player.id, socket);
      }
    }

    // Get or create room
    let room = this.getRoom(roomId);
    room ??= this.createRoom(roomId);

    // Try to add player to room
    const result = room.addPlayer(player);

    if (!result.success) {
      const errorCode = this.getErrorCode(result.reason!);
      return {
        success: false,
        error: {
          roomId,
          reason: result.reason!,
          code: errorCode,
        },
      };
    }

    // Update player-room mapping
    this._playerRooms.set(player.id, roomId);

    // Join socket room
    socket.join(roomId);

    // Prepare response events
    const playerJoined: PlayerJoinedEvent = {
      player: {
        id: player.id,
        name: player.name,
        isHost: room.isHost(player.id),
        isSpectator: result.isSpectator || false,
      },
    };

    return {
      success: true,
      data: {
        roomInfo: room.toRoomInfo(),
        playerJoined,
      },
    };
  }

  public leaveRoom(playerId: string, socket: Socket): RoomResults<RoomLeaveEvent> {
    const room = this.getRoomForPlayer(playerId);
    if (!room) {
      return {
        success: true,
        data: {},
      };
    }

    const roomId = room.id;

    // Remove player from room
    const removeResult = room.removePlayer(playerId);
    // Update player-room mapping
    this._playerRooms.delete(playerId);
    // Leave socket room
    socket.leave(roomId);

    Logger.info(`Player ${playerId} left room ${roomId}`);

    // Check if room should be deleted
    if (room.isEmpty) {
      if (process.env.USE_ROOM_WORKERS === '1') {
        void this._roomWorkers.stopRoom(roomId);
      }
      this.deleteRoom(room);
      return {
        success: true,
        data: {
          roomId: room.id,
          roomDeleted: true,
        },
      };
    }

    let result: RoomLeaveEvent = {
      roomInfo: room.toRoomInfo(),
      playerLeft: {
        playerId,
      },
    };

    // Handle host transfer
    if (removeResult.wasHost && removeResult.newHost) {
      result.hostTransfer = {
        newHostId: removeResult.newHost.id,
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  public deleteRoom(room: Room): boolean {
    // Clean up player mappings
    for (const player of [...room.players, ...room.spectators]) {
      this._playerRooms.delete(player.id);
    }

    // Destroy the room
    room.destroy();
    this._rooms.delete(room.id);

    Logger.info(`Room deleted: ${room.id}`);
    return true;
  }

  // Game operations
  // --------------------------------------------------------------
  public async startGame(
    roomId: string,
    hostId: string,
    gameSettings?: Partial<GameSettings>,
  ): Promise<RoomResults<{ roomInfo: RoomInfo; gameIds: string[] }>> {
    Logger.debug(`RoomManager.startGame() called for room ${roomId} by host ${hostId}`);

    const room = this.getRoom(roomId);
    if (!room) {
      return {
        success: false,
        error: {
          roomId,
          reason: 'Room not found',
          code: 'ROOM_NOT_FOUND',
        },
      };
    }

    if (!room.isHost(hostId)) {
      return {
        success: false,
        error: {
          roomId,
          reason: 'Only host can start the game',
          code: 'NOT_HOST',
        },
      };
    }

    if (process.env.USE_ROOM_WORKERS !== '1') {
      const startResult = room.startGame(gameSettings);
      if (!startResult.success) {
        return startResult;
      }

      return {
        success: true,
        data: {
          gameIds: startResult.data.gameIds,
          roomInfo: room.toRoomInfo(),
        },
      };
    }

    const settings: GameSettings = {
      ...DEFAULT_SETTINGS,
      ...gameSettings,
    };

    const players = room.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: room.isHost(player.id),
      isSpectator: false,
      socketId: player.socketId,
    }));

    const assignments = players.map((player) => ({
      playerId: player.id,
      gameId: randomUUID(),
    }));

    try {
      await this._roomWorkers.initRoom(roomId, players, settings, assignments);
    } catch (error) {
      Logger.error(`Failed to initialize worker room ${roomId}:`, error);
      return {
        success: false,
        error: {
          roomId,
          reason: 'Failed to initialize game worker',
          code: 'UNKNOWN_ERROR',
        },
      };
    }

    room.markGameStarted();

    return {
      success: true,
      data: {
        gameIds: assignments.map((assignment) => assignment.gameId),
        roomInfo: room.toRoomInfo(),
      },
    };
  }

  public findRoomByPlayerId(playerId: string): Room | null {
    for (const room of this._rooms.values()) {
      if (room.isPlayer(playerId)) {
        return room;
      }
    }
    return null;
  }

  public async handlePlayerInput(playerId: string, input: GameAction): Promise<boolean> {
    const room = this.findRoomByPlayerId(playerId);
    if (room) {
      if (process.env.USE_ROOM_WORKERS === '1') {
        await this._roomWorkers.forwardPlayerInput(room.id, playerId, input);
        return true;
      }

      room.handlePlayerInput(playerId, input);
      return true;
    }
    return false;
  }

  // Utility method
  // --------------------------------------------------------------

  /**
   * Maps error reason strings to standardized error codes for client-side handling.
   * @param reason
   * @private
   */
  private getErrorCode(reason: string): RoomErrorEvent['code'] {
    if (reason.includes('full') || reason.includes('spectators')) return 'ROOM_FULL';
    if (reason.includes('not found')) return 'ROOM_NOT_FOUND';
    if (reason.includes('already')) return 'PLAYER_EXISTS';
    if (reason.includes('progress')) return 'GAME_IN_PROGRESS';
    if (reason.includes('host')) return 'NOT_HOST';
    return 'ROOM_NOT_FOUND'; // Default
  }

  // Cleanup methods
  public cleanupEmptyRooms(): number {
    let cleanedCount = 0;
    const roomsToDelete = [];

    for (const [roomId, room] of this._rooms.entries()) {
      if (room.isEmpty) {
        roomsToDelete.push(roomId);
      }
    }

    for (const roomId of roomsToDelete) {
      const room = this._rooms.get(roomId);
      this.deleteRoom(room!);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      Logger.info(`Cleaned up ${cleanedCount} empty rooms`);
    }

    return cleanedCount;
  }
}
