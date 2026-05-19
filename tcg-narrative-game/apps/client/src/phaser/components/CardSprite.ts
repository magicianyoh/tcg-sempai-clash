import Phaser from 'phaser';
// Mock for Card Sprite
export class CardSprite extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        // Add minimal content
        const bg = scene.add.rectangle(0, 0, 100, 150, 0xffffff);
        this.add(bg);
    }
}
