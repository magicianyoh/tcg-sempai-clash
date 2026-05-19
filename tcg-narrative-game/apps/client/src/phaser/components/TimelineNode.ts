import Phaser from 'phaser';
// Mock for Timeline Node
export class TimelineNode extends Phaser.GameObjects.Container {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
    }
}
