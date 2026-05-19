import Phaser from 'phaser';
// Mock for HUD
export class HUD extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
    }
}
