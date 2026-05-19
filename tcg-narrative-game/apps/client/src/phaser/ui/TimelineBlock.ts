import Phaser from 'phaser';
import { FieldSlot, SlotPosition } from './FieldSlot';

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
    isPlayerBlock?: boolean;
}

export class TimelineBlock extends Phaser.GameObjects.Container {
    private slots: Map<SlotPosition, FieldSlot> = new Map();
    private eventOrb: Phaser.GameObjects.Container | null = null;
    private blockIndex: number;
    private isPlayerBlock: boolean;
    private orbGlow: Phaser.GameObjects.Graphics | null = null;
    private glowTween: Phaser.Tweens.Tween | null = null;

    private static readonly SLOT_WIDTH = 96;
    private static readonly SLOT_HEIGHT = 132;
    private static readonly ORB_RADIUS = 39;
    private static readonly GUIDE_RADIUS = 132;

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
        const guide = this.scene.add.graphics();
        guide.lineStyle(4, 0xffffff, 0.9);
        guide.strokeCircle(0, 0, TimelineBlock.GUIDE_RADIUS);
        this.add(guide);
    }

    private createSlots(): void {
        const offset = TimelineBlock.GUIDE_RADIUS;
        const positions: { pos: SlotPosition; x: number; y: number }[] = [
            { pos: 'top', x: 0, y: -offset },
            { pos: 'bottom', x: 0, y: offset },
            { pos: 'left', x: -offset, y: 0 },
            { pos: 'right', x: offset, y: 0 },
        ];

        for (const { pos, x, y } of positions) {
            const slot = new FieldSlot(this.scene, {
                x,
                y,
                width: TimelineBlock.SLOT_WIDTH,
                height: TimelineBlock.SLOT_HEIGHT,
                position: pos,
                slotId: `${this.isPlayerBlock ? 'self' : 'opp'}_b${this.blockIndex}_${pos}`,
            });

            this.slots.set(pos, slot);
            this.add(slot);
        }
    }

    private createEventOrb(): void {
        const orb = this.scene.add.container(0, 0);

        this.orbGlow = this.scene.add.graphics();
        orb.add(this.orbGlow);

        this.drawEmptyOrb(orb);
        this.eventOrb = orb;
        this.add(orb);
    }

    private drawEmptyOrb(orb: Phaser.GameObjects.Container): void {
        const outer = this.scene.add.graphics();
        outer.lineStyle(4, 0xffffff, 1);
        outer.fillStyle(0x000000, 0.82);
        outer.fillCircle(0, 0, TimelineBlock.ORB_RADIUS);
        outer.strokeCircle(0, 0, TimelineBlock.ORB_RADIUS);
        orb.add(outer);

        const lens = this.scene.add.graphics();
        lens.lineStyle(2, 0xffffff, 0.75);
        lens.fillStyle(0xffffff, 0.12);
        lens.fillCircle(-6, -4, TimelineBlock.ORB_RADIUS * 0.55);
        lens.strokeCircle(-6, -4, TimelineBlock.ORB_RADIUS * 0.55);
        lens.fillStyle(0xffffff, 0.25);
        lens.fillCircle(-16, -14, 7);
        orb.add(lens);

        const label = this.scene.add.text(0, TimelineBlock.ORB_RADIUS + 14, 'Evento\nClave', {
            fontSize: '26px',
            color: '#ffffff',
            fontFamily: 'Georgia, serif',
            align: 'center',
            lineSpacing: 2,
        }).setOrigin(0.5, 0);
        orb.add(label);

        orb.setSize(TimelineBlock.ORB_RADIUS * 2, TimelineBlock.ORB_RADIUS * 2);
        orb.setInteractive({ dropZone: true });
        orb.setData('isEventOrb', true);
        orb.setData('isEmpty', true);
    }

    getSlot(position: SlotPosition): FieldSlot | undefined {
        return this.slots.get(position);
    }

    getSlots(): FieldSlot[] {
        return Array.from(this.slots.values());
    }

    placeCard(position: SlotPosition, cardId: string, cardName: string, cardType: string): boolean {
        const slot = this.slots.get(position);
        if (!slot || !slot.isEmpty()) {
            return false;
        }

        slot.setOccupied(true, cardId);

        slot.each((child: Phaser.GameObjects.GameObject) => {
            if (child.getData('slotChrome') !== true) {
                child.destroy();
            }
        });

        const cardBg = this.scene.add.rectangle(
            0,
            0,
            TimelineBlock.SLOT_WIDTH - 8,
            TimelineBlock.SLOT_HEIGHT - 8,
            this.getCardColor(cardType),
            0.98
        ).setStrokeStyle(2, 0xffffff);

        const typeText = this.scene.add.text(0, -TimelineBlock.SLOT_HEIGHT / 2 + 15, this.getShortTypeName(cardType), {
            fontSize: '10px',
            color: '#0a0a0f',
            backgroundColor: '#ffffff',
            padding: { x: 4, y: 2 },
        }).setOrigin(0.5);

        const cardLabel = this.scene.add.text(0, -20, cardName, {
            fontSize: '12px',
            color: '#ffffff',
            wordWrap: { width: TimelineBlock.SLOT_WIDTH - 18 },
            align: 'center',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const inspectText = this.scene.add.text(0, TimelineBlock.SLOT_HEIGHT / 2 - 20, 'CTRL / TAP', {
            fontSize: '8px',
            color: '#d7f9ff',
            align: 'center',
        }).setOrigin(0.5);

        cardBg.setInteractive({ useHandCursor: true });
        cardBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.scene.events.emit('card-clicked', cardId, pointer, this.blockIndex, position);
        });

        slot.add([cardBg, typeText, cardLabel, inspectText]);
        return true;
    }

    placeEvent(cardId: string, cardName: string): boolean {
        if (!this.eventOrb) return false;

        this.stopGlow();
        this.eventOrb.removeAll(true);

        const orbBg = this.scene.add.graphics();
        orbBg.fillStyle(0x4ecdc4, 1);
        orbBg.lineStyle(4, 0xffffff, 1);
        orbBg.fillCircle(0, 0, TimelineBlock.ORB_RADIUS);
        orbBg.strokeCircle(0, 0, TimelineBlock.ORB_RADIUS);
        this.eventOrb.add(orbBg);

        const cardLabel = this.scene.add.text(0, 0, cardName, {
            fontSize: '10px',
            color: '#001315',
            wordWrap: { width: TimelineBlock.ORB_RADIUS * 1.7 },
            align: 'center',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.eventOrb.add(cardLabel);

        const label = this.scene.add.text(0, TimelineBlock.ORB_RADIUS + 14, 'Evento\nClave', {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Georgia, serif',
            align: 'center',
            lineSpacing: 2,
        }).setOrigin(0.5, 0);
        this.eventOrb.add(label);

        this.eventOrb.setData('isEmpty', false);
        this.eventOrb.setData('cardId', cardId);

        orbBg.setInteractive(new Phaser.Geom.Circle(0, 0, TimelineBlock.ORB_RADIUS), Phaser.Geom.Circle.Contains);
        orbBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.scene.events.emit('card-clicked', cardId, pointer, this.blockIndex, 'event');
        });

        return true;
    }

    startGlow(): void {
        if (!this.orbGlow || this.glowTween || !this.isEventOrbEmpty()) return;

        this.glowTween = this.scene.tweens.add({
            targets: this.orbGlow,
            alpha: { from: 0.25, to: 0.85 },
            duration: 700,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawOrbGlow(0x4ecdc4, this.orbGlow?.alpha ?? 0.5),
        });
    }

    stopGlow(): void {
        if (this.glowTween) {
            this.glowTween.stop();
            this.glowTween = null;
        }
        this.clearEventOrbHighlight();
    }

    highlightEventOrb(valid: boolean): void {
        if (!this.isEventOrbEmpty()) return;
        this.drawOrbGlow(valid ? 0x4ecdc4 : 0xe94560, 0.75);
    }

    clearEventOrbHighlight(): void {
        if (this.orbGlow) {
            this.orbGlow.clear();
            this.orbGlow.alpha = 1;
        }
    }

    clearSlotHighlights(): void {
        this.slots.forEach(slot => slot.resetHighlight());
        this.clearEventOrbHighlight();
    }

    private drawOrbGlow(color: number, alpha: number): void {
        if (!this.orbGlow) return;
        this.orbGlow.clear();
        this.orbGlow.fillStyle(color, alpha);
        this.orbGlow.fillCircle(0, 0, TimelineBlock.ORB_RADIUS + 12);
        this.orbGlow.lineStyle(3, color, 0.95);
        this.orbGlow.strokeCircle(0, 0, TimelineBlock.ORB_RADIUS + 18);
    }

    private getCardColor(cardType: string): number {
        switch (cardType) {
            case 'PROTAGONIST': return 0xe94560;
            case 'PERSONAJE':
            case 'CHARACTER': return 0x3498db;
            case 'ITEM': return 0xf39c12;
            case 'LOCATION': return 0x8e44ad;
            case 'EVENT':
            case 'EVENT_KEY': return 0x2ecc71;
            case 'EVENT_FINAL': return 0xffd166;
            case 'FILLER': return 0x7f8c8d;
            default: return 0x555555;
        }
    }

    private getShortTypeName(cardType: string): string {
        switch (cardType) {
            case 'PROTAGONIST': return 'PROT';
            case 'PERSONAJE':
            case 'CHARACTER': return 'PERS';
            case 'LOCATION': return 'LOC';
            case 'EVENT_FINAL': return 'FINAL';
            case 'EVENT':
            case 'EVENT_KEY': return 'EVT';
            default: return cardType.slice(0, 5);
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
                cardType: undefined,
            });
        });
        return data;
    }
}
