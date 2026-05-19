import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        this.add.text(100, 100, 'Menu Scene', { fontSize: '32px', color: '#fff' });
    }
}
