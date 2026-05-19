import Phaser from 'phaser';
import { FieldSlot, SlotPosition } from './FieldSlot';

// ============================================
// Types
// ============================================

export interface SlotData {
    position: SlotPosition;
    cardId?: string;
    cardType?: string;
}

export interface TimelineBlockConfig {
    x: number;
    y: number;
    blockIndex: number;
    scale?: number;
    isPlayerBlock?: boolean;  // true = left side (Player 1), false = right side (Player 2)
}

// ============================================
// TimelineBlock Component
// ============================================

export class TimelineBlock extends Phaser.GameObjects.Container {
    private slots: Map<SlotPosition, FieldSlot> = new Map();
    private eventOrb: Phaser.GameObjects.Container | null = null;
    private blockIndex: number;
    private isPlayerBlock: boolean;
    private orbGlow: Phaser.GameObjects.Graphics | null = null;
    private glowTween: Phaser.Tweens.Tween | null = null;

    // Sizes matching specific layout needs
    private static readonly SLOT_WIDTH = 80;
    private static readonly SLOT_HEIGHT = 110; // Slightly taller for better card aspect ratio
    private static readonly ORB_RADIUS = 35;
    private static readonly BLOCK_SIZE = 240;

    constructor(scene: Phaser.Scene, config: TimelineBlockConfig) {
        super(scene, config.x, config.y);
        this.blockIndex = config.blockIndex;
        this.isPlayerBlock = config.isPlayerBlock ?? true;

        this.createBackground();
        this.createSlots();
        this.createEventOrb();

        if (config.scale) {
            this.setScale(config.scale);
        }

        scene.add.existing(this);
    }

    private createBackground(): void {
        // Subtle background guide line connecting slots
        const guide = this.scene.add.graphics();
        guide.lineStyle(2, 0x333333, 0.4);
        guide.strokeCircle(0, 0, 90); // Circular guide
        this.add(guide);
    }

    private createSlots(): void {
        const positions: { pos: SlotPosition; x: number; y: number }[] = [
            { pos: 'top', x: 0, y: -90 },
            { pos: 'bottom', x: 0, y: 90 },
            { pos: 'left', x: -95, y: 0 },
            { pos: 'right', x: 95, y: 0 },
        ];

        for (const { pos, x, y } of positions) {
            const slotId = `${this.isPlayerBlock ? 'p1' : 'p2'}_b${this.blockIndex}_${pos}`;

            const slot = new FieldSlot(this.scene, {
                x,
                y,
                width: TimelineBlock.SLOT_WIDTH,
                height: TimelineBlock.SLOT_HEIGHT,
                position: pos,
                slotId: slotId
            });

            this.slots.set(pos, slot);
            this.add(slot);
        }
    }

    private createEventOrb(): void {
        const orb = this.scene.add.container(0, 0);

        // Glow effect (behind orb)
        this.orbGlow = this.scene.add.graphics();
        orb.add(this.orbGlow);

        // Orb background
        const orbBg = this.scene.add.graphics();
        orbBg.fillStyle(0x0a0a12, 1);
        orbBg.lineStyle(3, 0x555555, 1);
        orbBg.fillCircle(0, 0, TimelineBlock.ORB_RADIUS);
        orbBg.strokeCircle(0, 0, TimelineBlock.ORB_RADIUS);
        orb.add(orbBg);

        // Inner lens reflection detail
        const lens = this.scene.add.graphics();
        lens.fillStyle(0xffffff, 0.1);
        lens.fillCircle(-8, -8, 10);
        orb.add(lens);

        // Text
        const orbText = this.scene.add.text(0, 0, 'EVENTO', {
            fontSize: '9px',
            color: '#666666',
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        orb.add(orbText);

        orb.setSize(TimelineBlock.ORB_RADIUS * 2, TimelineBlock.ORB_RADIUS * 2);

        // Interactive drop zone
        orb.setInteractive({ dropZone: true });
        orb.setData('isEventOrb', true);
        orb.setData('isEmpty', true);

        this.eventOrb = orb;
        this.add(orb);
    }

    // ============================================
    // Public Methods
    // ============================================

    getSlot(position: SlotPosition): FieldSlot | undefined {
        return this.slots.get(position);
    }

    /**
     * Place a card visually in a slot
     */
    placeCard(position: SlotPosition, cardId: string, cardName: string, cardType: string): boolean {
        const slot = this.slots.get(position);
        if (!slot || !slot.isEmpty()) {
            return false;
        }

        // Logic handled by slot usually, but here we add the visual representation
        // For now, simpler: we just tell the slot it's occupied and add the content to it.
        slot.setOccupied(true, cardId);

        // Cleanup existing content in slot just in case
        slot.each((child: any) => {
            if (child !== slot['background'] && child !== slot['label'] && child !== slot['glow']) {
                child.destroy();
            }
        });

        const cardBg = this.scene.add.rectangle(
            0, 0,
            TimelineBlock.SLOT_WIDTH - 4,
            TimelineBlock.SLOT_HEIGHT - 4,
            this.getCardColor(cardType),
            1
        ).setStrokeStyle(1, 0xffffff);

        const cardLabel = this.scene.add.text(0, 0, cardName, {
            fontSize: '10px',
            color: '#ffffff',
            wordWrap: { width: TimelineBlock.SLOT_WIDTH - 8 },
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Add click interaction to view details
        cardBg.setInteractive({ useHandCursor: true });
        cardBg.on('pointerdown', () => {
            this.scene.events.emit('card-clicked', cardId);
        });

        slot.add([cardBg, cardLabel]);

        return true;
    }

    /**
     * Place an event card in the central orb
     */
    placeEvent(cardId: string, cardName: string): boolean {
        if (!this.eventOrb) return false;

        this.eventOrb.removeAll(true);

        // Completed orb visual
        const orbBg = this.scene.add.graphics();
        orbBg.fillStyle(0x4ecdc4, 1); // Neon green/blue
        orbBg.lineStyle(3, 0xffffff, 1);
        orbBg.fillCircle(0, 0, TimelineBlock.ORB_RADIUS);
        orbBg.strokeCircle(0, 0, TimelineBlock.ORB_RADIUS);
        this.eventOrb.add(orbBg);

        const cardLabel = this.scene.add.text(0, 0, cardName, {
            fontSize: '9px',
            color: '#000000',
            wordWrap: { width: TimelineBlock.ORB_RADIUS * 1.5 },
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.eventOrb.add(cardLabel);

        // Lens reflection
        const lens = this.scene.add.graphics();
        lens.fillStyle(0xffffff, 0.3);
        lens.fillCircle(-8, -8, 10);
        this.eventOrb.add(lens);

        this.eventOrb.setData('isEmpty', false);
        this.eventOrb.setData('cardId', cardId);
        this.stopGlow();

        // Click interaction
        orbBg.setInteractive({ useHandCursor: true });
        orbBg.on('pointerdown', () => {
            this.scene.events.emit('card-clicked', cardId);
        });

        return true;
    }

    /**
     * Start glowing effect to indicate event can be placed
     */
    startGlow(): void {
        if (!this.orbGlow || this.glowTween || !this.isEventOrbEmpty()) return;

        this.glowTween = this.scene.tweens.add({
            targets: this.orbGlow,
            alpha: { from: 0.2, to: 0.8 },
            scale: { from: 1, to: 1.2 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            onUpdate: () => {
                if (this.orbGlow) {
                    this.orbGlow.clear();
                    this.orbGlow.fillStyle(0x4ecdc4, this.orbGlow.alpha);
                    this.orbGlow.fillCircle(0, 0, TimelineBlock.ORB_RADIUS + 5);
                }
            },
        });
    }

    stopGlow(): void {
        if (this.glowTween) {
            this.glowTween.stop();
            this.glowTween = null;
        }
        if (this.orbGlow) {
            this.orbGlow.clear();
            this.orbGlow.setScale(1);
            this.orbGlow.alpha = 0;
        }
    }

    private getCardColor(cardType: string): number {
        switch (cardType) {
            case 'PROTAGONIST': return 0xe94560; // Red
            case 'PERSONAJE':
            case 'CHARACTER': return 0x3498db;   // Blue
            case 'ITEM': return 0xf39c12;        // Orange
            case 'LOCATION': return 0x9b59b6;    // Purple
            case 'EVENT':
            case 'EVENT_KEY': return 0x2ecc71;   // Green
            case 'EVENT_FINAL': return 0xffd700; // Gold
            default: return 0x555555;
        }
    }

    isSlotEmpty(position: SlotPosition): boolean {
        return this.slots.get(position)?.isEmpty() ?? true;
    }

    isEventOrbEmpty(): boolean {
        return this.eventOrb?.getData('isEmpty') ?? true;
    }

    getEventOrb(): Phaser.GameObjects.Container | null {
        return this.eventOrb;
    }

    getSlotsData(): SlotData[] {
        const data: SlotData[] = [];
        this.slots.forEach((slot, position) => {
            const cardId = slot.getCardId();
            data.push({
                position,
                cardId: cardId || undefined,
                cardType: undefined
            });
        });
        return data;
    }
}
