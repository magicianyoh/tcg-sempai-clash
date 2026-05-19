import Phaser from 'phaser';

export interface CardInfo {
    id: string;
    name: string;
    type: string;
    cost: number;
    description: string;
    backstory?: string;
}

export interface CardDetailOverlayConfig {
    cards: CardInfo[];
    startIndex: number;
    onClose: () => void;
}

export class CardDetailOverlay extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Rectangle;
    private cards: CardInfo[];
    private currentIndex: number;

    // UI References
    private nameText!: Phaser.GameObjects.Text;
    private typeText!: Phaser.GameObjects.Text;
    private descText!: Phaser.GameObjects.Text;
    private loreText!: Phaser.GameObjects.Text;
    private titleText!: Phaser.GameObjects.Text;
    private navLeft!: Phaser.GameObjects.Container;
    private navRight!: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, config: CardDetailOverlayConfig) {
        super(scene, 0, 0);
        this.cards = config.cards;
        this.currentIndex = config.startIndex;

        // Ensure index is valid
        if (this.currentIndex < 0) this.currentIndex = 0;
        if (this.currentIndex >= this.cards.length) this.currentIndex = this.cards.length - 1;

        const { width, height } = scene.scale;

        // 0. Blocker / Backdrop
        this.background = scene.add.rectangle(
            width / 2, height / 2,
            width, height,
            0x000000,
            0.85
        ).setInteractive(); // Block clicks below
        this.add(this.background);

        // 1. Main Panel
        const panelWidth = Math.min(width * 0.85, 650);
        const panelHeight = Math.min(height * 0.85, 450);

        const panel = scene.add.rectangle(
            width / 2, height / 2,
            panelWidth, panelHeight,
            0x1a1a2e
        ).setStrokeStyle(3, 0x4ecdc4);
        this.add(panel);

        // 2. Card Visual (Left side placeholder)
        const leftX = width / 2 - panelWidth / 4;
        const cardVisualBg = scene.add.rectangle(
            leftX, height / 2,
            220, 300,
            0x333333
        ).setStrokeStyle(4, 0xffffff);
        this.add(cardVisualBg);

        this.nameText = scene.add.text(leftX, height / 2, '', {
            fontSize: '22px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 200 }
        }).setOrigin(0.5);
        this.add(this.nameText);

        // 3. Info Text (Right side)
        const rightX = width / 2 + 20;
        const textStartY = height / 2 - panelHeight / 2 + 60;

        // Title & Type
        this.titleText = scene.add.text(rightX, textStartY, '', {
            fontSize: '32px',
            color: '#4ecdc4',
            fontStyle: 'bold'
        });
        this.add(this.titleText);

        this.typeText = scene.add.text(rightX, textStartY + 45, '', {
            fontSize: '20px',
            color: '#e94560'
        });
        this.add(this.typeText);

        // Description
        const descLabel = scene.add.text(rightX, textStartY + 100, 'EFECTO:', {
            fontSize: '14px', color: '#888888'
        });
        this.add(descLabel);

        this.descText = scene.add.text(rightX, textStartY + 125, '', {
            fontSize: '16px', color: '#cccccc',
            wordWrap: { width: panelWidth / 2 - 40 }
        });
        this.add(this.descText);

        // Backstory
        const loreLabel = scene.add.text(rightX, textStartY + 200, 'LORE:', {
            fontSize: '14px', color: '#888888'
        });
        this.add(loreLabel);

        this.loreText = scene.add.text(rightX, textStartY + 225, '', {
            fontSize: '14px', color: '#aaaaaa', fontStyle: 'italic',
            wordWrap: { width: panelWidth / 2 - 40 }
        });
        this.add(this.loreText);

        // 4. Close Button
        const closeBtn = scene.add.text(width / 2 + panelWidth / 2 - 40, height / 2 - panelHeight / 2 + 20, 'X', {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            this.close(config.onClose);
        });
        this.add(closeBtn);

        // 5. Navigation Buttons
        this.createNavButtons(width, height, panelWidth);

        // 6. Keyboard Input
        this.setupInput();

        // Initial Render
        this.updateContent();

        scene.add.existing(this);
        this.setDepth(2000);
    }

    private createNavButtons(width: number, height: number, panelWidth: number): void {
        // Left Arrow
        this.navLeft = this.scene.add.container(width / 2 - panelWidth / 2 - 40, height / 2);
        const bgLeft = this.scene.add.circle(0, 0, 25, 0xffffff, 0.1).setStrokeStyle(2, 0xffffff);
        const arrowLeft = this.scene.add.text(0, 0, '<', { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
        this.navLeft.add([bgLeft, arrowLeft]);
        this.navLeft.setSize(50, 50);
        this.navLeft.setInteractive({ useHandCursor: true });
        this.navLeft.on('pointerdown', () => this.prevCard());
        this.add(this.navLeft);

        // Right Arrow
        this.navRight = this.scene.add.container(width / 2 + panelWidth / 2 + 40, height / 2);
        const bgRight = this.scene.add.circle(0, 0, 25, 0xffffff, 0.1).setStrokeStyle(2, 0xffffff);
        const arrowRight = this.scene.add.text(0, 0, '>', { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
        this.navRight.add([bgRight, arrowRight]);
        this.navRight.setSize(50, 50);
        this.navRight.setInteractive({ useHandCursor: true });
        this.navRight.on('pointerdown', () => this.nextCard());
        this.add(this.navRight);

        // Swipe Detection
        this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.background.setData('startX', pointer.x);
        });
        this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const startX = this.background.getData('startX');
            const diff = pointer.x - startX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) this.prevCard();
                else this.nextCard();
            }
        });
    }

    private setupInput(): void {
        const keyLeft = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        const keyRight = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        const keyEsc = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        if (keyLeft) keyLeft.on('down', () => this.prevCard());
        if (keyRight) keyRight.on('down', () => this.nextCard());
        if (keyEsc) keyEsc.on('down', () => this.close(this.closeCallback));
    }

    private closeCallback: () => void = () => { };

    // Hack to store the callback because setupInput scope
    private close(cb: () => void): void {
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
            this.scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
            this.scene.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        }
        cb();
        this.destroy();
    }

    private prevCard(): void {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateContent();
        }
    }

    private nextCard(): void {
        if (this.currentIndex < this.cards.length - 1) {
            this.currentIndex++;
            this.updateContent();
        }
    }

    private updateContent(): void {
        const card = this.cards[this.currentIndex];
        if (!card) return;

        this.nameText.setText(card.name);
        this.titleText.setText(card.name.toUpperCase());
        this.typeText.setText(`${card.type} | Costo: ${card.cost}`);
        this.descText.setText(card.description);
        this.loreText.setText(card.backstory || '...');

        // Update navigation visibility
        this.navLeft.setAlpha(this.currentIndex > 0 ? 1 : 0.3);
        this.navRight.setAlpha(this.currentIndex < this.cards.length - 1 ? 1 : 0.3);
    }
}
