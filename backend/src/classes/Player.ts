export class Player implements Player {
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

  public toJSON(): {
    id: string;
    name: string;
    isHost: boolean;
    isSpectator: boolean;
  } {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isSpectator: this.isSpectator,
    };
  }
}
