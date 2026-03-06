import { Room } from '../classes/Room';
import { Player } from '../classes/Player';
import { Logger } from '../utils/helpers';
import { GameSettings } from '../../../shared/types/game';
import { 
  RoomInfo, 
  RoomPlayer, 
  ROOM_CONFIG,
  JoinRoomEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  RoomStateUpdateEvent,
  HostTransferEvent,
  RoomErrorEvent
} from '../../../shared/types/room';
import { Socket } from 'socket.io';

export class RoomManager {
  private static instance: RoomManager;
  private _rooms: Map<string, Room> = new Map();
  private _playerRooms: Map<string, string> = new Map(); // playerId -> roomId mapping

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

  public getAllRooms(): Room[] {
    return Array.from(this._rooms.values());
  }

  public deleteRoom(roomId: string): boolean {
    const room = this._rooms.get(roomId);
    if (!room) {
      return false;
    }

    // Clean up player mappings
    for (const player of [...room.players, ...room.spectators]) {
      this._playerRooms.delete(player.id);
    }

    // Destroy the room
    room.destroy();
    this._rooms.delete(roomId);
    
    Logger.info(`Room deleted: ${roomId}`);
    return true;
  }

  // Player room operations
  public joinRoom(
    roomId: string, 
    player: Player, 
    socket: Socket
  ): { success: boolean; error?: RoomErrorEvent; roomUpdate?: RoomStateUpdateEvent; playerJoined?: PlayerJoinedEvent } {
    
    // Check if player is already in a room
    const currentRoom = this.getRoomForPlayer(player.id);
    if (currentRoom) {
      if (currentRoom.id === roomId) {
        // Player is already in the requested room
        return { 
          success: true, 
          roomUpdate: { room: currentRoom.toRoomInfo() }
        };
      } else {
        // Player is in a different room, need to leave first
        this.leaveRoom(player.id, socket);
      }
    }

    // Get or create room
    let room = this.getRoom(roomId);
    if (!room) {
      room = this.createRoom(roomId);
    }

    // Try to add player to room
    const result = room.addPlayer(player);
    
    if (!result.success) {
      const errorCode = this.getErrorCode(result.reason!);
      return {
        success: false,
        error: {
          roomId,
          error: result.reason!,
          code: errorCode
        }
      };
    }

    // Update player-room mapping
    this._playerRooms.set(player.id, roomId);

    // Join socket room
    socket.join(roomId);

    // Prepare response events
    const roomUpdate: RoomStateUpdateEvent = { room: room.toRoomInfo() };
    const playerJoined: PlayerJoinedEvent = {
      roomId,
      player: {
        id: player.id,
        name: player.name,
        isHost: room.isHost(player.id),
        isReady: true,
        isSpectator: result.isSpectator || false
      },
      isSpectator: result.isSpectator || false
    };

    Logger.info(`Player ${player.name} joined room ${roomId}${result.isSpectator ? ' as spectator' : ''}`);
    
    return {
      success: true,
      roomUpdate,
      playerJoined
    };
  }

  public leaveRoom(
    playerId: string, 
    socket: Socket
  ): { roomUpdate?: RoomStateUpdateEvent; playerLeft?: PlayerLeftEvent; hostTransfer?: HostTransferEvent; roomDeleted?: boolean } {
    
    const room = this.getRoomForPlayer(playerId);
    if (!room) {
      return {};
    }

    const roomId = room.id;
    
    // Remove player from room
    const removeResult = room.removePlayer(playerId);
    
    // Update player-room mapping
    this._playerRooms.delete(playerId);
    
    // Leave socket room
    socket.leave(roomId);

    const result: any = {
      playerLeft: { roomId, playerId }
    };

    // Handle host transfer
    if (removeResult.wasHost && removeResult.newHost) {
      result.hostTransfer = {
        roomId,
        newHostId: removeResult.newHost.id
      };
    }

    // Check if room should be deleted
    if (room.isEmpty) {
      // Schedule room deletion after cleanup timeout
      setTimeout(() => {
        const currentRoom = this.getRoom(roomId);
        if (currentRoom && currentRoom.isEmpty) {
          this.deleteRoom(roomId);
          result.roomDeleted = true;
        }
      }, ROOM_CONFIG.CLEANUP_TIMEOUT_MS);
    } else {
      // Room still has players, send update
      result.roomUpdate = { room: room.toRoomInfo() };
    }

    Logger.info(`Player ${playerId} left room ${roomId}`);
    
    return result;
  }

  public startGame(roomId: string, hostId: string, gameSettings?: Partial<GameSettings>): { success: boolean; error?: RoomErrorEvent; roomUpdate?: RoomStateUpdateEvent; gameIds?: string[] } {
    console.log(`🎮 RoomManager.startGame() called for room ${roomId} by host ${hostId}`);
    
    const room = this.getRoom(roomId);
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return {
        success: false,
        error: {
          roomId,
          error: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        }
      };
    }

    console.log(`🔍 Found room ${roomId}, checking if ${hostId} is host`);
    if (!room.isHost(hostId)) {
      console.log(`❌ ${hostId} is not host of room ${roomId}`);
      return {
        success: false,
        error: {
          roomId,
          error: 'Only host can start the game',
          code: 'NOT_HOST'
        }
      };
    }

    console.log(`✅ ${hostId} is host, calling room.startGame()`);
    const startResult = room.startGame(gameSettings);
    if (!startResult.success) {
      console.log(`❌ room.startGame() failed: ${startResult.reason}`);
      const errorCode = this.getErrorCode(startResult.reason!);
      return {
        success: false,
        error: {
          roomId,
          error: startResult.reason!,
          code: errorCode
        }
      };
    }

    console.log(`✅ room.startGame() succeeded with ${startResult.gameIds?.length} games`);
    return {
      success: true,
      roomUpdate: { room: room.toRoomInfo() },
      gameIds: startResult.gameIds
    };
  }

  public resetGame(roomId: string, hostId: string): { success: boolean; error?: RoomErrorEvent; roomUpdate?: RoomStateUpdateEvent } {
    const room = this.getRoom(roomId);
    if (!room) {
      return {
        success: false,
        error: {
          roomId,
          error: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        }
      };
    }

    if (!room.isHost(hostId)) {
      return {
        success: false,
        error: {
          roomId,
          error: 'Only host can reset the game',
          code: 'NOT_HOST'
        }
      };
    }

    const resetResult = room.resetGame();
    if (!resetResult.success) {
      const errorCode = this.getErrorCode(resetResult.reason!);
      return {
        success: false,
        error: {
          roomId,
          error: resetResult.reason!,
          code: errorCode
        }
      };
    }

    return {
      success: true,
      roomUpdate: { room: room.toRoomInfo() }
    };
  }

  // Utility methods
  private getErrorCode(reason: string): RoomErrorEvent['code'] {
    if (reason.includes('full') || reason.includes('spectators')) return 'ROOM_FULL';
    if (reason.includes('not found')) return 'ROOM_NOT_FOUND';
    if (reason.includes('already')) return 'PLAYER_EXISTS';
    if (reason.includes('progress')) return 'GAME_IN_PROGRESS';
    if (reason.includes('host')) return 'NOT_HOST';
    return 'ROOM_NOT_FOUND'; // Default
  }

  public getRoomStats(): { totalRooms: number; activePlayers: number; waitingRooms: number; playingRooms: number } {
    const rooms = this.getAllRooms();
    return {
      totalRooms: rooms.length,
      activePlayers: rooms.reduce((sum, room) => sum + room.playerCount + room.spectatorCount, 0),
      waitingRooms: rooms.filter(room => room.state === 'waiting').length,
      playingRooms: rooms.filter(room => room.state === 'playing').length
    };
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
      this.deleteRoom(roomId);
      cleanedCount++;
    }

    if (cleanedCount > 0) {
      Logger.info(`Cleaned up ${cleanedCount} empty rooms`);
    }

    return cleanedCount;
  }

  // Parse room and player from URL path like "/room123/player1"
  public static parseRoomUrl(path: string): { roomId: string; playerName: string } | null {
    // Remove leading slash and split by slash
    const parts = path.replace(/^\/+/, '').split('/');
    
    if (parts.length !== 2) {
      return null;
    }

    const [roomId, playerName] = parts;
    
    // Validate room ID (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(roomId)) {
      return null;
    }

    // Validate player name (alphanumeric, 2-15 chars)
    if (!/^[a-zA-Z0-9_-]{2,15}$/.test(playerName)) {
      return null;
    }

    return { roomId, playerName };
  }

  public findRoomByPlayerId(playerId: string): Room | null {
    for (const room of this._rooms.values()) {
      if (room.isPlayer(playerId)) {
        return room;
      }
    }
    return null;
  }

  public handleGameEnd(roomId: string, playerId: string, reason: string): { success: boolean; error?: RoomErrorEvent; roomUpdate?: RoomStateUpdateEvent } {
    const room = this.getRoom(roomId);
    if (!room) {
      return {
        success: false,
        error: {
          roomId,
          error: 'Room not found',
          code: 'ROOM_NOT_FOUND'
        }
      };
    }

    // Handle the game ending for this player
    const result = room.handlePlayerGameEnd(playerId, reason);
    if (!result.success) {
      const errorCode = this.getErrorCode(result.reason!);
      return {
        success: false,
        error: {
          roomId,
          error: result.reason!,
          code: errorCode
        }
      };
    }

    return {
      success: true,
      roomUpdate: {
        room: room.toRoomInfo()
      }
    };
  }
}