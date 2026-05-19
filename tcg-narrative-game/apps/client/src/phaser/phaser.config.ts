import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';

export const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scene: [BootScene, MenuScene, BattleScene],
    scale: {
        mode: Phaser.Scale.RESIZE
    },
    physics: {
        default: 'arcade'
    }
};
