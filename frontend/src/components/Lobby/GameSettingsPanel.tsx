import { Panel } from '../UI/Panel';
import { Slider } from '../UI/Slider';
import { Toggle } from '../UI/Toggle';
import { Button } from '../UI/Button';
import styles from './GameSettingsPanel.module.css';

export interface GameSettings {
  boardWidth: number;
  boardHeight: number;
  gravity: number;
  nextPieceCount: number;
  ghostPiece: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  boardWidth: 10,
  boardHeight: 20,
  gravity: 1,
  nextPieceCount: 1,
  ghostPiece: true,
};

export interface GameSettingsConfig {
  boardWidth: { min: number; max: number; step: number };
  boardHeight: { min: number; max: number; step: number };
  gravity: { min: number; max: number; step: number };
  nextPieceCount: { min: number; max: number; step: number };
}

export interface GameSettingsPanelProps {
  settings: GameSettings;
  onSettingChange: (key: keyof GameSettings, value: number | boolean) => void;
  onResetToDefault?: () => void;
  disabled?: boolean;
  config?: Partial<GameSettingsConfig>;
  title?: string;
  className?: string;
}

const DEFAULT_CONFIG: GameSettingsConfig = {
  boardWidth: { min: 5, max: 15, step: 1 },
  boardHeight: { min: 16, max: 24, step: 1 },
  gravity: { min: 0.5, max: 5, step: 0.5 },
  nextPieceCount: { min: 0, max: 9, step: 1 },
};

export function GameSettingsPanel({
  settings,
  onSettingChange,
  onResetToDefault,
  disabled = false,
  config = {},
  title = 'Game Settings',
  className = '',
}: GameSettingsPanelProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const panelClassName = [styles.settingsPanel, className].filter(Boolean).join(' ');

  return (
    <Panel title={title} className={panelClassName}>
      <div className={styles.settingsGrid}>
        <div className={styles.settingCard}>
          <Slider
            label="Board Width"
            min={mergedConfig.boardWidth.min}
            max={mergedConfig.boardWidth.max}
            step={mergedConfig.boardWidth.step}
            value={settings.boardWidth}
            onChange={(value) => onSettingChange('boardWidth', value)}
            disabled={disabled}
            suffix=" cols"
          />
        </div>

        <div className={styles.settingCard}>
          <Slider
            label="Board Height"
            min={mergedConfig.boardHeight.min}
            max={mergedConfig.boardHeight.max}
            step={mergedConfig.boardHeight.step}
            value={settings.boardHeight}
            onChange={(value) => onSettingChange('boardHeight', value)}
            disabled={disabled}
            suffix=" rows"
          />
        </div>

        <div className={styles.settingCard}>
          <Slider
            label="Gravity"
            min={mergedConfig.gravity.min}
            max={mergedConfig.gravity.max}
            step={mergedConfig.gravity.step}
            value={settings.gravity}
            onChange={(value) => onSettingChange('gravity', value)}
            disabled={disabled}
            suffix="×"
          />
        </div>

        <div className={styles.settingCard}>
          <Slider
            label="Next Pieces"
            min={mergedConfig.nextPieceCount.min}
            max={mergedConfig.nextPieceCount.max}
            step={mergedConfig.nextPieceCount.step}
            value={settings.nextPieceCount}
            onChange={(value) => onSettingChange('nextPieceCount', value)}
            disabled={disabled}
          />
        </div>

        <div className={styles.settingCard}>
          <Toggle
            label="Ghost Piece"
            value={settings.ghostPiece}
            onChange={(value) => onSettingChange('ghostPiece', value)}
            disabled={disabled}
          />
        </div>

        {onResetToDefault && (
          <div className={styles.settingCard}>
            <Button
              variant="ghost"
              size="small"
              onClick={onResetToDefault}
              disabled={disabled}
              className={styles.resetButton}
            >
              Reset to Default
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default GameSettingsPanel;
