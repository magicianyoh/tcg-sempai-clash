import Phaser from 'phaser';
import { BattleScene } from './phaser/scenes/BattleScene';

// Get match ID from URL
const params = new URLSearchParams(window.location.search);
const matchId = params.get('matchId') || localStorage.getItem('currentMatchId');

if (!matchId) {
    alert('No match ID found!');
    window.location.href = '/match.html';
}

// Store globally for scenes to access
(window as any).matchId = matchId;
(window as any).token = localStorage.getItem('token');
(window as any).username = localStorage.getItem('username');

// Phaser config
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0a0a0f',
    scene: [BattleScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};

new Phaser.Game(config);
