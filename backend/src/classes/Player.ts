import type { IPlayer } from '../../../shared/types/player.js';

export class Player implements IPlayer {
  public readonly id: string;
  public socketId: string;
  public name: string = '';
  public isHost: boolean = false;
  public isSpectator: boolean = false;

  constructor(socketId: string, name: string) {
    this.id = socketId;
    this.socketId = socketId;
    this.name = name;
  }

  public toJSON(): IPlayer {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isSpectator: this.isSpectator,
    };
  }
}
