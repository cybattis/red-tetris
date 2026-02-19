import { Player } from './Player';
import { PieceType } from '../types/piece';
import { GameSettings, GameState } from '@shared/types/game';

export class Game {
  private readonly _id: string;
  private readonly _player: Player;
  private readonly _settings: GameSettings;
  private readonly _seed: number;
  private readonly _pieces: PieceType[] = [];

  public state: GameState;

  constructor(
    id: string,
    player: Player,
    settings: GameSettings,
    state: string,
    seed: number,
  ) {
    this._id = id;
    this._settings = settings;
    this._seed = seed;

    this._pieces = []; // InitBag
    this.state = 'waiting';
  }
}
