import { GameMode } from "@shared/types/game.ts";

const GAME_MODES: Array<{
  id: GameMode;
  name: string;
  description: string;
}> = [
  {
    id: GameMode.Classic,
    name: "Classic",
    description: "Traditional Tetris gameplay",
  },
  {
    id: GameMode.Sprint,
    name: "Sprint",
    description: "Game speeds up over time",
  },
  {
    id: GameMode.Invisible,
    name: "Invisible",
    description: "Locked pieces disappear from view",
  },
];

export { GAME_MODES };
