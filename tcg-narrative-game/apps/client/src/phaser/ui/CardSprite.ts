import Phaser from 'phaser';

// ============================================
// CardSprite Component
// ============================================

export interface CardSpriteConfig {
    cardId: string;
    name: string;
    type: string;
    cost: number;
    description: string;
    backstory?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    interactive?: boolean;
    activatable?: boolean;
    silenced?: boolean;
}

export class CardSprite extends Phaser.GameObjects.Container {
    private cardId: string;
    private cardType: string;
    private cardName: string;
    private cardCost: number;
    private cardDescription: string;
    private cardBackstory: string;
    private showingFront: boolean = true;

    private background!: Phaser.GameObjects.Rectangle;
    private costBadge!: Phaser.GameObjects.Container;
    private typeBadge!: Phaser.GameObjects.Container;
    private nameText!: Phaser.GameObjects.Text;
    private descText!: Phaser.GameObjects.Text;
    private backstoryText!: Phaser.GameObjects.Text;
    private hoverLabel: Phaser.GameObjects.Container | null = null;

    private isDragging: boolean = false;
    private originalPosition: { x: number; y: number } = { x: 0, y: 0 };
    private activatable = false;
    private silenced = false;
    private silenceOverlay: Phaser.GameObjects.Container | null = null;

    static readonly DEFAULT_WIDTH = 100;
    static readonly DEFAULT_HEIGHT = 140;

    constructor(scene: Phaser.Scene, config: CardSpriteConfig) {
        const width = config.width || CardSprite.DEFAULT_WIDTH;
        const height = config.height || CardSprite.DEFAULT_HEIGHT;

        super(scene, config.x, config.y);

        this.cardId = config.cardId;
        this.cardType = config.type;
        this.cardName = config.name;
        this.cardCost = config.cost;
        this.cardDescription = config.description;
        this.cardBackstory = config.backstory || 'No backstory available.';
        this.activatable = config.activatable === true;
        this.silenced = config.silenced === true;
        this.originalPosition = { x: config.x, y: config.y };

        this.createCard(width, height);
        this.setActivatable(this.activatable);
        this.setSilenced(this.silenced);

        if (config.interactive !== false) {
            this.enableInteraction();
        }

        scene.add.existing(this);
    }

    private createCard(width: number, height: number): void {
        const compact = width < 70;
        // Background
        this.background = this.scene.add.rectangle(
            0, 0, width, height,
            this.getTypeColor(),
            0.95
        ).setStrokeStyle(2, 0xffffff);
        this.add(this.background);

        // Cost badge (top left)
        this.costBadge = this.createCostBadge(width, height, compact);
        this.add(this.costBadge);

        // Type badge (top right)
        this.typeBadge = this.createTypeBadge(width, height, compact);
        this.add(this.typeBadge);

        // Card name
        this.nameText = this.scene.add.text(0, -height / 2 + (compact ? 20 : 35), this.cardName, {
            fontSize: compact ? '8px' : '11px',
            color: '#ffffff',
            fontStyle: 'bold',
            wordWrap: { width: width - (compact ? 6 : 10) },
            align: 'center',
        }).setOrigin(0.5, 0);
        this.add(this.nameText);

        // Description (front)
        this.descText = this.scene.add.text(0, 15, this.cardDescription, {
            fontSize: compact ? '7px' : '9px',
            color: '#cccccc',
            wordWrap: { width: width - 10 },
            align: 'center',
        }).setOrigin(0.5, 0);
        this.descText.setVisible(!compact);
        this.add(this.descText);

        // Backstory (hidden initially)
        this.backstoryText = this.scene.add.text(0, -height / 2 + 35, this.cardBackstory, {
            fontSize: '9px',
            color: '#aaaaaa',
            fontStyle: 'italic',
            wordWrap: { width: width - 10 },
            align: 'center',
        }).setOrigin(0.5, 0).setVisible(false);
        this.add(this.backstoryText);

        this.setSize(width, height);
    }

    private createCostBadge(width: number, height: number, compact: boolean): Phaser.GameObjects.Container {
        const radius = compact ? 9 : 14;
        const container = this.scene.add.container(-width / 2 + radius + 2, -height / 2 + radius + 2);

        const bg = this.scene.add.circle(0, 0, radius, 0xe94560);
        const text = this.scene.add.text(0, 0, String(this.cardCost), {
            fontSize: compact ? '9px' : '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        container.add([bg, text]);
        return container;
    }

    private createTypeBadge(cardWidth: number, cardHeight: number, compact: boolean): Phaser.GameObjects.Container {
        const badgeWidth = compact ? 27 : 40;
        const badgeHeight = compact ? 12 : 16;
        const container = this.scene.add.container(cardWidth / 2 - badgeWidth / 2 - 2, -cardHeight / 2 + badgeHeight / 2 + 2);

        const typeLabel = this.getShortTypeName();
        const bg = this.scene.add.rectangle(0, 0, badgeWidth, badgeHeight, this.getTypeColor(), 1)
            .setStrokeStyle(1, 0xffffff);
        const text = this.scene.add.text(0, 0, typeLabel, {
            fontSize: compact ? '6px' : '8px',
            color: '#ffffff',
        }).setOrigin(0.5);

        container.add([bg, text]);
        return container;
    }

    private getTypeColor(): number {
        switch (this.cardType) {
            case 'PROTAGONIST': return 0xe94560;
            case 'PERSONAJE':
            case 'CHARACTER': return 0x3498db;
            case 'ITEM': return 0xf39c12;
            case 'LOCATION': return 0x9b59b6;
            case 'TOKEN':
            case 'QUICK_EVENT': return 0x22c55e;
            case 'EVENT':
            case 'EVENT_KEY': return 0x2ecc71;
            case 'CLIMAX_EVENT': return 0xffd166;
            case 'PLOT_TWIST_EVENT': return 0x4ecdc4;
            case 'EVENT_FINAL': return 0xffd700;
            case 'FILLER': return 0x7f8c8d;
            default: return 0x555555;
        }
    }

    private getShortTypeName(): string {
        switch (this.cardType) {
            case 'PROTAGONIST': return 'PROT';
            case 'PERSONAJE':
            case 'CHARACTER': return 'PERS';
            case 'ITEM': return 'ITEM';
            case 'LOCATION': return 'LOC';
            case 'TOKEN':
            case 'QUICK_EVENT': return 'QEV';
            case 'EVENT':
            case 'EVENT_KEY': return 'EVT';
            case 'CLIMAX_EVENT': return 'CLX';
            case 'PLOT_TWIST_EVENT': return 'PLOT';
            case 'EVENT_FINAL': return 'FINAL';
            case 'FILLER': return 'FILL';
            default: return 'CARD';
        }
    }

    // ============================================
    // Interaction
    // ============================================

    private enableInteraction(): void {
        this.setInteractive({ draggable: true, useHandCursor: true });

        // Hover effects
        this.on('pointerover', () => {
            if (!this.isDragging) {
                this.scene.tweens.add({
                    targets: this,
                    scale: 1.05,
                    y: this.y - 8,
                    duration: 130,
                    ease: 'Sine.Out',
                });
                this.background.setStrokeStyle(3, 0x4ecdc4);
                this.showHoverName();
                this.setDepth(10); // Bring to front slightly
            }
        });

        this.on('pointerout', () => {
            if (!this.isDragging) {
                this.scene.tweens.add({
                    targets: this,
                    scale: 1,
                    y: this.originalPosition.y,
                    duration: 130,
                    ease: 'Sine.Out',
                });
                this.background.setStrokeStyle(2, 0xffffff);
                this.hideHoverName();
                this.setDepth(0);
            }
        });

        // Drag events - handled via scene.input too, but here for local state
        this.scene.input.setDraggable(this);

        this.on('dragstart', () => {
            this.isDragging = true;
            this.originalPosition = { x: this.x, y: this.y };
            this.scene.tweens.killTweensOf(this);
            this.setScale(1.1);
            this.setDepth(100);
            this.background.setStrokeStyle(3, 0xe94560);
            this.scene.events.emit('hand-card-drag-start', this);
            this.hideHoverName();
        });

        this.on('dragend', () => {
            // Slight delay prevents pointerup from firing as a valid tap immediately
            this.scene.time.delayedCall(50, () => {
                this.isDragging = false;
            });
            this.setScale(1);
            this.setDepth(0);
            this.background.setStrokeStyle(2, 0xffffff);
            this.scene.events.emit('hand-card-drag-end', this);
        });

        // Pointer events for Click vs Drag differentiation
        let pointerDownTime = 0;
        let startX = 0;
        let startY = 0;

        this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            pointerDownTime = pointer.time;
            startX = pointer.x;
            startY = pointer.y;
        });

        this.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const dist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);

            // If dragging logic didn't takeover (or just finished), checking dist helps
            if (dist < 10) {
                if (pointer.rightButtonReleased()) {
                    this.flip();
                } else {
                    const sourceEvent = pointer.event as (MouseEvent & PointerEvent & { ctrlKey?: boolean; metaKey?: boolean; pointerType?: string });
                    const isDetailTap = sourceEvent.ctrlKey === true
                        || sourceEvent.metaKey === true
                        || sourceEvent.pointerType === 'touch'
                        || this.scene.scale.width < 760;
                    this.emit('card-tapped', this.cardId, isDetailTap);
                }
            }
        });
    }

    /**
     * Flip between front (stats) and back (backstory)
     */
    flip(): void {
        this.showingFront = !this.showingFront;

        if (this.showingFront) {
            this.scene.tweens.add({
                targets: this,
                scaleX: 0,
                duration: 100,
                ease: 'Sine.In',
                onComplete: () => {
                    this.nameText.setVisible(true);
                    this.descText.setVisible(true);
                    this.costBadge.setVisible(true);
                    this.typeBadge.setVisible(true);
                    this.backstoryText.setVisible(false);
                    this.background.setFillStyle(this.getTypeColor());
                    this.scene.tweens.add({ targets: this, scaleX: 1, duration: 120, ease: 'Back.Out' });
                },
            });
        } else {
            this.scene.tweens.add({
                targets: this,
                scaleX: 0,
                duration: 100,
                ease: 'Sine.In',
                onComplete: () => {
                    this.nameText.setVisible(true);
                    this.descText.setVisible(false);
                    this.costBadge.setVisible(false);
                    this.typeBadge.setVisible(false);
                    this.backstoryText.setVisible(true);
                    this.background.setFillStyle(0x2c3e50);
                    this.scene.tweens.add({ targets: this, scaleX: 1, duration: 120, ease: 'Back.Out' });
                },
            });
        }
    }

    /**
     * Reset card to original position
     */
    resetPosition(): void {
        this.setPosition(this.originalPosition.x, this.originalPosition.y);
    }

    /**
     * Set highlight state for activatable events
     */
    setActivatable(activatable: boolean): void {
        this.activatable = activatable;
        if (activatable) {
            if (!this.scene.tweens.isTweening(this.background)) {
                this.scene.tweens.add({
                    targets: this.background,
                    alpha: { from: 0.7, to: 1 },
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                });
            }
            this.background.setStrokeStyle(3, 0x4ecdc4);
        } else {
            this.scene.tweens.killTweensOf(this.background);
            this.background.setAlpha(1);
            this.background.setStrokeStyle(2, 0xffffff);
        }
    }

    private showHoverName(): void {
        if (this.hoverLabel || this.scene.scale.width < 760) return;
        const labelWidth = Math.max(this.width + 22, Math.min(230, this.cardName.length * 8 + 34));
        const container = this.scene.add.container(0, -this.height / 2 - 22);
        const bg = this.scene.add.rectangle(0, 0, labelWidth, 30, 0x020609, 0.96)
            .setStrokeStyle(2, 0x4ecdc4, 0.85);
        const text = this.scene.add.text(0, 0, this.cardName, {
            fontSize: '15px',
            color: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: labelWidth - 18 },
        }).setOrigin(0.5);
        container.add([bg, text]);
        container.setAlpha(0).setScale(0.92);
        this.add(container);
        this.hoverLabel = container;
        this.scene.tweens.add({
            targets: container,
            alpha: 1,
            y: container.y - 8,
            scale: 1,
            duration: 150,
            ease: 'Back.Out',
        });
    }

    private hideHoverName(): void {
        if (!this.hoverLabel) return;
        const label = this.hoverLabel;
        this.hoverLabel = null;
        this.scene.tweens.add({
            targets: label,
            alpha: 0,
            y: label.y + 6,
            scale: 0.94,
            duration: 120,
            ease: 'Sine.In',
            onComplete: () => label.destroy(),
        });
    }

    setSilenced(silenced: boolean): void {
        this.silenced = silenced;
        if (this.silenceOverlay) {
            this.scene.tweens.killTweensOf(this.silenceOverlay);
            this.silenceOverlay.destroy();
            this.silenceOverlay = null;
        }
        if (!silenced) {
            this.setAlpha(1);
            return;
        }

        const overlay = this.scene.add.container(0, 0);
        const shade = this.scene.add.rectangle(0, 0, this.width, this.height, 0x05070c, 0.58);
        const slash = this.scene.add.rectangle(0, 0, this.width * 1.2, 5, 0xe94560, 0.95)
            .setAngle(-24);
        const label = this.scene.add.text(0, 0, 'SILENCIADA', {
            fontSize: '11px',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#e94560',
            padding: { x: 5, y: 3 },
        }).setOrigin(0.5);
        overlay.add([shade, slash, label]);
        overlay.setAlpha(0.86);
        this.add(overlay);
        this.silenceOverlay = overlay;
        this.scene.tweens.add({
            targets: overlay,
            alpha: { from: 0.66, to: 0.95 },
            duration: 520,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
        });
    }

    playDetailFocus(): void {
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.08,
            duration: 75,
            ease: 'Sine.In',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: this,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    duration: 120,
                    ease: 'Back.Out',
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: this,
                            scaleX: 1,
                            scaleY: 1,
                            duration: 90,
                            ease: 'Sine.Out',
                        });
                    },
                });
            },
        });
    }

    // ============================================
    // Getters
    // ============================================

    getCardId(): string {
        return this.cardId;
    }

    getCardType(): string {
        return this.cardType;
    }

    getCardName(): string {
        return this.cardName;
    }

    getCost(): number {
        return this.cardCost;
    }

    getOriginalPosition(): { x: number; y: number } {
        return this.originalPosition;
    }
}
