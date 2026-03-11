export class Player {
  public readonly id: string;
  public socketId: string;
  public name: string = '';

  constructor(socketId: string, name?: string) {
    this.id = socketId;
    this.socketId = socketId;
    if (name) {
      this.name = name;
    }
  }

  public toJSON(): {
    id: string;
    name: string;
  } {
    return {
      id: this.id,
      name: this.name,
    };
  }
}
