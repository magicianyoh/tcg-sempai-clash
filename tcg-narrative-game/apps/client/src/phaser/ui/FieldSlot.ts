import Phaser from 'phaser';

export type SlotPosition = 'top' | 'left' | 'right' | 'bottom';
export type SlotType = 'CHARACTER' | 'ITEM' | 'LOCATION' | 'EVENT';

export interface FieldSlotConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    position: SlotPosition;
    slotId: string;
}

export class FieldSlot extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Rectangle;
    private glow: Phaser.GameObjects.Graphics;

    private slotPosition: SlotPosition;
    private slotId: string;
    private isOccupied = false;
    private currentCardId: string | null = null;

    constructor(scene: Phaser.Scene, config: FieldSlotConfig) {
        super(scene, config.x, config.y);

        this.slotPosition = config.position;
        this.slotId = config.slotId;

        this.glow = scene.add.graphics();
        this.glow.setData('slotChrome', true);
        this.add(this.glow);

        this.background = scene.add.rectangle(
            0,
            0,
            config.width,
            config.height,
            0x000000,
            0.35
        ).setStrokeStyle(3, 0xffffff);
        this.background.setData('slotChrome', true);
        this.add(this.background);

        this.setSize(config.width, config.height);
        this.setInteractive({ dropZone: true });
        this.setData('isSlot', true);
        this.setData('slotPosition', this.slotPosition);
        this.setData('slotId', this.slotId);

        scene.add.existing(this);
    }

    setOccupied(isOccupied: boolean, cardId?: string): void {
        this.isOccupied = isOccupied;
        this.currentCardId = cardId || null;

        if (isOccupied) {
            this.background.setStrokeStyle(2, 0x4ecdc4);
            this.background.setFillStyle(0x000000, 0);
        } else {
            this.background.setStrokeStyle(3, 0xffffff);
            this.background.setFillStyle(0x000000, 0.35);
        }
        this.glow.clear();
    }

    isEmpty(): boolean {
        return !this.isOccupied;
    }

    getSlotPosition(): SlotPosition {
        return this.slotPosition;
    }

    getCardId(): string | null {
        return this.currentCardId;
    }

    highlightValid(): void {
        if (this.isOccupied) return;

        this.background.setStrokeStyle(5, 0x4ecdc4);
        this.glow.clear();
        this.glow.fillStyle(0x4ecdc4, 0.35);
        this.glow.fillRect(
            -this.width / 2 - 5,
            -this.height / 2 - 5,
            this.width + 10,
            this.height + 10
        );
    }

    highlightInvalid(): void {
        if (this.isOccupied) return;
        this.background.setStrokeStyle(5, 0xe94560);
    }

    resetHighlight(): void {
        if (this.isOccupied) {
            this.background.setStrokeStyle(2, 0x4ecdc4);
        } else {
            this.background.setStrokeStyle(3, 0xffffff);
        }
        this.glow.clear();
    }

    pulse(color = 0xffd166): void {
        this.scene.tweens.add({
            targets: this,
            scale: { from: 1, to: 1.12 },
            duration: 180,
            yoyo: true,
            repeat: 2,
        });
        this.glow.clear();
        this.glow.fillStyle(color, 0.42);
        this.glow.fillRect(
            -this.width / 2 - 7,
            -this.height / 2 - 7,
            this.width + 14,
            this.height + 14
        );
        this.scene.time.delayedCall(720, () => this.resetHighlight());
    }
}
