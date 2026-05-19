import Phaser from 'phaser';

export type SlotPosition = 'top' | 'left' | 'right' | 'bottom';
export type SlotType = 'CHARACTER' | 'ITEM' | 'LOCATION' | 'EVENT';

export interface FieldSlotConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    position: SlotPosition;
    slotId: string; // e.g., "p1_block0_top"
}

export class FieldSlot extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Rectangle;
    private label: Phaser.GameObjects.Text;
    private glow: Phaser.GameObjects.Graphics;

    private slotPosition: SlotPosition;
    private slotId: string;
    private isOccupied: boolean = false;
    private currentCardId: string | null = null;

    constructor(scene: Phaser.Scene, config: FieldSlotConfig) {
        super(scene, config.x, config.y);

        this.slotPosition = config.position;
        this.slotId = config.slotId;

        // 1. Glow graphic (behind bg)
        this.glow = scene.add.graphics();
        this.add(this.glow);

        // 2. Background
        this.background = scene.add.rectangle(
            0, 0,
            config.width, config.height,
            0x1a1a2e,
            0.6
        ).setStrokeStyle(2, 0x666666);
        this.add(this.background);

        // 3. Label (e.g. "SLOT")
        this.label = scene.add.text(0, 0, 'VACÍO', {
            fontSize: '10px',
            color: '#444444',
            align: 'center'
        }).setOrigin(0.5);
        this.add(this.label);

        this.setSize(config.width, config.height);

        // Setup interaction
        this.setInteractive({ dropZone: true });

        // Data for phaser's drop system
        this.setData('isSlot', true);
        this.setData('slotPosition', this.slotPosition);
        this.setData('slotId', this.slotId);

        scene.add.existing(this);
    }

    // ============================================
    // State Management
    // ============================================

    setOccupied(isOccupied: boolean, cardId?: string): void {
        this.isOccupied = isOccupied;
        this.currentCardId = cardId || null;
        this.label.setVisible(!isOccupied);

        // Update visual state if occupied
        if (isOccupied) {
            this.background.setStrokeStyle(2, 0x4ecdc4);
            this.background.setFillStyle(0x1a1a2e, 0); // Transparent to show card bg
        } else {
            this.background.setStrokeStyle(2, 0x666666);
            this.background.setFillStyle(0x1a1a2e, 0.6);
        }
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

    // ============================================
    // Visual Feedback
    // ============================================

    highlightValid(): void {
        if (this.isOccupied) return;

        this.background.setStrokeStyle(3, 0x00ff00);
        this.glow.clear();
        this.glow.fillStyle(0x00ff00, 0.3);
        this.glow.fillRect(
            -this.width / 2 - 5,
            -this.height / 2 - 5,
            this.width + 10,
            this.height + 10
        );
    }

    highlightInvalid(): void {
        if (this.isOccupied) return;

        this.background.setStrokeStyle(3, 0xff0000);
    }

    resetHighlight(): void {
        if (this.isOccupied) {
            this.background.setStrokeStyle(2, 0x4ecdc4);
        } else {
            this.background.setStrokeStyle(2, 0x666666);
        }
        this.glow.clear();
    }
}
