import Phaser from 'phaser';

export interface CardInfo {
    id: string;
    name: string;
    type: string;
    cost: number;
    description: string;
    backstory?: string;
    image?: string;
    typeLabel?: string;
    archetypeLabel?: string;
    likes?: string[];
    dislikes?: string[];
    requirementsText?: string[];
    effectsText?: string[];
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
    private closeCallback: () => void;

    private nameText!: Phaser.GameObjects.Text;
    private typeText!: Phaser.GameObjects.Text;
    private descText!: Phaser.GameObjects.Text;
    private loreText!: Phaser.GameObjects.Text;
    private imageText!: Phaser.GameObjects.Text;
    private idText!: Phaser.GameObjects.Text;
    private navLeft!: Phaser.GameObjects.Container;
    private navRight!: Phaser.GameObjects.Container;

    constructor(scene: Phaser.Scene, config: CardDetailOverlayConfig) {
        super(scene, 0, 0);
        this.cards = config.cards.length > 0 ? config.cards : [{
            id: 'empty',
            name: 'Sin carta',
            type: 'N/A',
            cost: 0,
            description: 'No hay datos disponibles.',
        }];
        this.currentIndex = Phaser.Math.Clamp(config.startIndex, 0, this.cards.length - 1);
        this.closeCallback = config.onClose;

        const { width, height } = scene.scale;
        this.background = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.86)
            .setInteractive();
        this.add(this.background);

        const panelWidth = Math.min(width * 0.92, 760);
        const panelHeight = Math.min(height * 0.88, 520);
        const panel = scene.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x07090f, 0.98)
            .setStrokeStyle(3, 0xffffff);
        this.add(panel);

        const compact = width < 700;
        const artWidth = compact ? Math.min(panelWidth - 70, 240) : 230;
        const artHeight = compact ? 170 : 320;
        const artX = compact ? width / 2 : width / 2 - panelWidth / 2 + artWidth / 2 + 40;
        const artY = compact ? height / 2 - panelHeight / 2 + 130 : height / 2;

        const cardVisualBg = scene.add.rectangle(artX, artY, artWidth, artHeight, 0x111827, 1)
            .setStrokeStyle(3, 0xffffff);
        this.add(cardVisualBg);

        this.imageText = scene.add.text(artX, artY, '', {
            fontSize: compact ? '18px' : '24px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: artWidth - 24 },
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(this.imageText);

        const infoX = compact ? width / 2 - panelWidth / 2 + 34 : artX + artWidth / 2 + 42;
        const infoY = compact ? artY + artHeight / 2 + 28 : height / 2 - panelHeight / 2 + 52;
        const infoWidth = compact ? panelWidth - 68 : panelWidth - artWidth - 108;

        this.nameText = scene.add.text(infoX, infoY, '', {
            fontSize: compact ? '22px' : '30px',
            color: '#ffffff',
            fontStyle: 'bold',
            wordWrap: { width: infoWidth },
        });
        this.add(this.nameText);

        this.typeText = scene.add.text(infoX, infoY + (compact ? 42 : 54), '', {
            fontSize: '15px',
            color: '#4ecdc4',
            wordWrap: { width: infoWidth },
        });
        this.add(this.typeText);

        this.idText = scene.add.text(infoX, infoY + (compact ? 68 : 82), '', {
            fontSize: '11px',
            color: '#8d96a8',
            wordWrap: { width: infoWidth },
        });
        this.add(this.idText);

        const descLabel = scene.add.text(infoX, infoY + (compact ? 96 : 122), 'EFECTO', {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.add(descLabel);

        this.descText = scene.add.text(infoX, infoY + (compact ? 116 : 146), '', {
            fontSize: '14px',
            color: '#d7dee9',
            wordWrap: { width: infoWidth },
            lineSpacing: 4,
        });
        this.add(this.descText);

        const loreLabel = scene.add.text(infoX, infoY + (compact ? 200 : 250), 'LORE', {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.add(loreLabel);

        this.loreText = scene.add.text(infoX, infoY + (compact ? 220 : 274), '', {
            fontSize: '13px',
            color: '#aeb8c8',
            fontStyle: 'italic',
            wordWrap: { width: infoWidth },
            lineSpacing: 3,
        });
        this.add(this.loreText);

        const closeBtn = scene.add.text(width / 2 + panelWidth / 2 - 34, height / 2 - panelHeight / 2 + 20, 'X', {
            fontSize: '26px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.close());
        this.add(closeBtn);

        this.createNavButtons(width, height, panelWidth);
        this.setupInput();
        this.updateContent();

        scene.add.existing(this);
        this.setDepth(3000);
    }

    private createNavButtons(width: number, height: number, panelWidth: number): void {
        this.navLeft = this.scene.add.container(width / 2 - panelWidth / 2 + 34, height / 2);
        const bgLeft = this.scene.add.circle(0, 0, 25, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff);
        const arrowLeft = this.scene.add.text(0, 0, '<', { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
        this.navLeft.add([bgLeft, arrowLeft]);
        this.navLeft.setSize(50, 50).setInteractive({ useHandCursor: true });
        this.navLeft.on('pointerdown', () => this.prevCard());
        this.add(this.navLeft);

        this.navRight = this.scene.add.container(width / 2 + panelWidth / 2 - 34, height / 2);
        const bgRight = this.scene.add.circle(0, 0, 25, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff);
        const arrowRight = this.scene.add.text(0, 0, '>', { fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
        this.navRight.add([bgRight, arrowRight]);
        this.navRight.setSize(50, 50).setInteractive({ useHandCursor: true });
        this.navRight.on('pointerdown', () => this.nextCard());
        this.add(this.navRight);

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

        keyLeft?.on('down', () => this.prevCard());
        keyRight?.on('down', () => this.nextCard());
        keyEsc?.on('down', () => this.close());
    }

    private close(): void {
        this.scene.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.scene.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.scene.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.closeCallback();
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

        this.nameText.setText(card.name.toUpperCase());
        this.typeText.setText(`${card.typeLabel || card.type}${card.archetypeLabel ? ` | ${card.archetypeLabel}` : ''} | COSTO ${card.cost}`);
        this.idText.setText(`ID: ${card.id}`);
        const likes = card.likes?.length ? `\nLe gusta: ${card.likes.join(', ')}` : '';
        const dislikes = card.dislikes?.length ? `\nNo le gusta: ${card.dislikes.join(', ')}` : '';
        const requirements = card.requirementsText?.length ? `\n\nRequisitos:\n${card.requirementsText.join('\n')}` : '';
        const effects = card.effectsText?.length ? `\n\nEfectos:\n${card.effectsText.join('\n')}` : '';
        this.descText.setText(`${card.description || 'Sin descripcion.'}${likes}${dislikes}${requirements}${effects}`);
        this.loreText.setText(card.backstory || 'Sin lore cargado.');
        this.imageText.setText(card.image ? `IMAGEN\n${card.image}` : `IMAGEN\n${card.name}`);

        this.navLeft.setAlpha(this.currentIndex > 0 ? 1 : 0.25);
        this.navRight.setAlpha(this.currentIndex < this.cards.length - 1 ? 1 : 0.25);
    }
}
