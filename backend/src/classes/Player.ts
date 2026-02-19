import { v4 as uuidv4 } from 'uuid';

export class Player {
  public readonly id: string;
  public socketId: string;
  public name: string = '';
  public isHost: boolean = false;
  public isReady: boolean = false;

  constructor(socketId: string) {
    this.id = uuidv4();
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
