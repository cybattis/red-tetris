import { randomUUID } from 'node:crypto';

export class Player {
  public readonly id: string;
  public socketId: string;
  public name: string = '';
  public isHost: boolean = false;
  public isReady: boolean = false;

  constructor(socketId: string) {
    this.id = socketId; // Use socket ID as player ID for consistency
    this.socketId = socketId;
  }

  public toJSON(): {
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
  } {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isReady: this.isReady,
    };
  }
}
