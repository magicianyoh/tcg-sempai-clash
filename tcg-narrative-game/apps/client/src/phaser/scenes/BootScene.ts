import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load assets placeholder
        // this.load.image('card_shonen_1', 'assets/cards/shonen1.png');
        // For now, we will draw graphics
    }

    create() {
        this.scene.start('BattleScene'); // Jump straight to battle for MVP
    }
}
