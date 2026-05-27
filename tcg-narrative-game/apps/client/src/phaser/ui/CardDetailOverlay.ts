import Phaser from 'phaser';

export interface CardInfo {
    id: string;
    name: string;
    type: string;
    cost: number;
    costResource?: 'SP' | 'FP';
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
    confirmLabel?: string;
    dismissOnCardTap?: boolean;
}

type ScrollSurface = {
    container: Phaser.GameObjects.Container;
    text: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
    thumb: Phaser.GameObjects.Rectangle;
    mask: Phaser.Display.Masks.GeometryMask;
    viewportY: number;
    viewportHeight: number;
    trackHeight: number;
    offset: number;
    maxOffset: number;
};

const TEXT_COLOR = '#ffffff';
const FONT_FAMILY = '"Segoe UI", Arial, Helvetica, sans-serif';

export class CardDetailOverlay extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Rectangle;
    private cards: CardInfo[];
    private currentIndex: number;
    private closeCallback: () => void;
    private dismissOnCardTap: boolean;

    private cardShell!: Phaser.GameObjects.Container;
    private frontFace!: Phaser.GameObjects.Container;
    private loreFace!: Phaser.GameObjects.Container;
    private nameText!: Phaser.GameObjects.Text;
    private typeText!: Phaser.GameObjects.Text;
    private artBackground!: Phaser.GameObjects.Rectangle;
    private artFrame!: Phaser.GameObjects.Rectangle;
    private artImage: Phaser.GameObjects.Image | null = null;
    private artX = 0;
    private artY = 0;
    private artWidth = 0;
    private artHeight = 0;
    private frontScroll!: ScrollSurface;
    private loreScroll!: ScrollSurface;
    private navLeft!: Phaser.GameObjects.Container;
    private navRight!: Phaser.GameObjects.Container;
    private showingLore = false;
    private compact = false;
    private pendingImageCardId = '';
    private dragSurface: ScrollSurface | null = null;
    private dragPointerId = -1;
    private dragStartY = 0;
    private dragStartOffset = 0;
    private pointerMoveHandler!: (pointer: Phaser.Input.Pointer) => void;
    private pointerUpHandler!: (pointer: Phaser.Input.Pointer) => void;
    private wheelHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
    ) => void;

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
        this.dismissOnCardTap = config.dismissOnCardTap === true;
        scene.data.set('card-detail-open', true);

        const { width, height } = scene.scale;
        const desktopSidebarWidth = width >= 1040 ? Math.min(330, width * 0.27) : 0;
        const usableWidth = width - desktopSidebarWidth;
        const centerX = usableWidth / 2;
        this.compact = usableWidth < 600 || height < 680;
        const panelWidth = Math.min(usableWidth - (this.compact ? 28 : 52), this.compact ? 410 : 460);
        const panelHeight = Math.min(height - (this.compact ? 32 : 52), this.compact ? 728 : 680);

        this.background = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.87)
            .setInteractive();
        this.add(this.background);

        this.cardShell = scene.add.container(centerX, height / 2);
        this.add(this.cardShell);

        const panel = scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x070a11, 0.99)
            .setStrokeStyle(3, 0xffffff, 0.96);
        const innerBorder = scene.add.rectangle(0, 0, panelWidth - 10, panelHeight - 10, 0x070a11, 0)
            .setStrokeStyle(1, 0xffffff, 0.18);
        this.cardShell.add([panel, innerBorder]);

        const top = -panelHeight / 2;
        const left = -panelWidth / 2;
        const contentWidth = panelWidth - 46;
        const titleWidth = panelWidth - 78;

        this.nameText = scene.add.text(left + 23, top + 22, '', {
            fontSize: this.compact ? '23px' : '26px',
            color: TEXT_COLOR,
            fontFamily: FONT_FAMILY,
            fontStyle: 'bold',
            wordWrap: { width: titleWidth },
        });
        this.typeText = scene.add.text(left + 23, top + 56, '', {
            fontSize: '14px',
            color: TEXT_COLOR,
            fontFamily: FONT_FAMILY,
            wordWrap: { width: titleWidth },
        });
        this.cardShell.add([this.nameText, this.typeText]);

        const closeSize = this.compact ? 62 : 52;
        const closeX = panelWidth / 2 - closeSize / 2 - 8;
        const closeY = top + closeSize / 2 + 8;
        const closeTarget = scene.add.rectangle(closeX, closeY, closeSize, closeSize, 0x121a28, 0.96)
            .setStrokeStyle(2, 0xffffff, 0.64)
            .setDepth(20)
            .setInteractive({ useHandCursor: true });
        const closeButton = scene.add.text(closeX, closeY - 1, 'X', {
            fontSize: this.compact ? '25px' : '22px',
            color: TEXT_COLOR,
            fontFamily: FONT_FAMILY,
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(21).setInteractive({ useHandCursor: true });
        closeTarget.on('pointerdown', () => this.close());
        closeButton.on('pointerdown', () => this.close());
        this.cardShell.add([closeTarget, closeButton]);

        this.frontFace = scene.add.container(0, 0);
        this.loreFace = scene.add.container(0, 0).setVisible(false);
        this.cardShell.add([this.frontFace, this.loreFace]);

        const headerBottom = top + 88;
        const bottomReserve = config.confirmLabel ? 62 : 22;
        const usableBottom = panelHeight / 2 - bottomReserve;
        const tabHeight = 36;
        const frontScrollMin = this.compact ? 174 : 150;
        const artMaxHeight = usableBottom - headerBottom - tabHeight - frontScrollMin - 32;
        this.artHeight = Math.max(150, Math.min(panelHeight * 0.52, artMaxHeight));
        this.artWidth = Math.min(contentWidth, this.artHeight * 0.68);
        this.artX = 0;
        this.artY = headerBottom + this.artHeight / 2 + 7;

        this.artBackground = scene.add.rectangle(this.artX, this.artY, this.artWidth, this.artHeight, 0x101725, 1)
            .setStrokeStyle(2, 0xffffff, 0.96);
        const artInset = scene.add.rectangle(this.artX, this.artY, this.artWidth - 10, this.artHeight - 10, 0x101725, 0)
            .setStrokeStyle(1, 0xffffff, 0.26);
        this.artFrame = artInset;
        this.frontFace.add([this.artBackground, artInset]);
        if (this.dismissOnCardTap) {
            this.artBackground.setInteractive({ useHandCursor: true });
            this.artBackground.on('pointerdown', () => this.close());
        }

        const frontTabsY = this.artY + this.artHeight / 2 + 17 + tabHeight / 2;
        this.createTabPair(this.frontFace, frontTabsY, panelWidth, false);
        const frontScrollY = frontTabsY + tabHeight / 2 + 14;
        this.frontScroll = this.createScrollSurface(
            this.frontFace,
            left + 23,
            frontScrollY,
            contentWidth,
            Math.max(55, usableBottom - frontScrollY),
        );

        const loreTabsY = headerBottom + tabHeight / 2 + 10;
        this.createTabPair(this.loreFace, loreTabsY, panelWidth, true);
        const loreScrollY = loreTabsY + tabHeight / 2 + 16;
        this.loreScroll = this.createScrollSurface(
            this.loreFace,
            left + 23,
            loreScrollY,
            contentWidth,
            Math.max(100, usableBottom - loreScrollY),
        );

        if (config.confirmLabel) {
            const buttonY = panelHeight / 2 - 30;
            const confirmBackground = scene.add.rectangle(0, buttonY, 116, 38, 0x1d4651, 1)
                .setStrokeStyle(2, 0xffffff, 0.92)
                .setInteractive({ useHandCursor: true });
            const confirmText = scene.add.text(0, buttonY, config.confirmLabel, {
                fontSize: '15px',
                color: TEXT_COLOR,
                fontFamily: FONT_FAMILY,
                fontStyle: 'bold',
            }).setOrigin(0.5);
            confirmBackground.on('pointerdown', () => this.close());
            this.cardShell.add([confirmBackground, confirmText]);
        }

        this.createNavButtons(centerX, height / 2, panelWidth, this.artY);
        this.setupInput();
        this.updateContent();

        scene.add.existing(this);
        this.setDepth(3000);
        this.playOpenAnimation();
    }

    private createTabPair(face: Phaser.GameObjects.Container, y: number, panelWidth: number, loreActive: boolean): void {
        const width = (panelWidth - 58) / 2;
        const gap = 10;
        const firstX = -(width + gap) / 2;
        const secondX = (width + gap) / 2;
        face.add([
            this.createTabButton(firstX, y, width, 'Efs./Req.', !loreActive, () => this.setLoreFace(false)),
            this.createTabButton(secondX, y, width, 'Lore', loreActive, () => this.setLoreFace(true)),
        ]);
    }

    private createTabButton(
        x: number,
        y: number,
        width: number,
        label: string,
        active: boolean,
        onClick: () => void,
    ): Phaser.GameObjects.Container {
        const button = this.scene.add.container(x, y);
        const background = this.scene.add.rectangle(0, 0, width, 36, active ? 0x1d4651 : 0x0c111b, 1)
            .setStrokeStyle(1, 0xffffff, active ? 0.94 : 0.46);
        const text = this.scene.add.text(0, 0, label, {
            fontSize: '13px',
            color: TEXT_COLOR,
            fontFamily: FONT_FAMILY,
            fontStyle: active ? 'bold' : 'normal',
        }).setOrigin(0.5);
        button.add([background, text]);
        button.setSize(width, 36).setInteractive({ useHandCursor: true });
        button.on('pointerdown', onClick);
        return button;
    }

    private createScrollSurface(
        parent: Phaser.GameObjects.Container,
        x: number,
        y: number,
        width: number,
        height: number,
    ): ScrollSurface {
        const text = this.scene.add.text(x, y, '', {
            fontSize: this.compact ? '13px' : '14px',
            color: TEXT_COLOR,
            fontFamily: FONT_FAMILY,
            lineSpacing: 6,
            wordWrap: { width: width - 17 },
        });
        const maskShape = this.scene.add.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(this.cardShell.x + x, this.cardShell.y + y, width, height);
        maskShape.setVisible(false);
        const mask = maskShape.createGeometryMask();

        const zone = this.scene.add.zone(x + width / 2, y + height / 2, width, height)
            .setInteractive({ useHandCursor: false });
        const panel = this.scene.add.rectangle(x + width / 2, y + height / 2, width, height, 0x0c111b, 0.45)
            .setStrokeStyle(1, 0xffffff, 0.12);
        const track = this.scene.add.rectangle(x + width - 4, y + height / 2, 2, height, 0xffffff, 0.12);
        const thumb = this.scene.add.rectangle(x + width - 4, y + 8, 3, 18, 0xffffff, 0.74)
            .setOrigin(0.5, 0);

        parent.add([panel, text, track, thumb, zone]);
        this.add(maskShape);
        const surface = {
            container: parent,
            text,
            zone,
            thumb,
            mask,
            viewportY: y,
            viewportHeight: height,
            trackHeight: height,
            offset: 0,
            maxOffset: 0,
        };
        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.dragSurface = surface;
            this.dragPointerId = pointer.id;
            this.dragStartY = pointer.y;
            this.dragStartOffset = surface.offset;
        });
        return surface;
    }

    private createNavButtons(centerX: number, centerY: number, panelWidth: number, y: number): void {
        this.navLeft = this.createNavButton(centerX - panelWidth / 2 + 18, centerY + y, '<', () => this.prevCard());
        this.navRight = this.createNavButton(centerX + panelWidth / 2 - 18, centerY + y, '>', () => this.nextCard());
        this.add([this.navLeft, this.navRight]);
    }

    private createNavButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
        const nav = this.scene.add.container(x, y);
        const background = this.scene.add.circle(0, 0, 22, 0x070a11, 0.92).setStrokeStyle(2, 0xffffff, 0.85);
        const text = this.scene.add.text(0, -1, label, {
            fontSize: '25px',
            color: TEXT_COLOR,
            fontFamily: FONT_FAMILY,
        }).setOrigin(0.5);
        nav.add([background, text]);
        nav.setSize(44, 44).setInteractive({ useHandCursor: true });
        nav.on('pointerdown', onClick);
        return nav;
    }

    private setupInput(): void {
        const keyLeft = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        const keyRight = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        const keyEsc = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        keyLeft?.on('down', () => this.prevCard());
        keyRight?.on('down', () => this.nextCard());
        keyEsc?.on('down', () => this.close());

        this.pointerMoveHandler = (pointer: Phaser.Input.Pointer): void => {
            if (!this.dragSurface || pointer.id !== this.dragPointerId || !pointer.isDown) return;
            const movement = this.dragStartY - pointer.y;
            this.setScrollOffset(this.dragSurface, this.dragStartOffset + movement);
        };
        this.pointerUpHandler = (pointer: Phaser.Input.Pointer): void => {
            if (pointer.id !== this.dragPointerId) return;
            this.dragSurface = null;
            this.dragPointerId = -1;
        };
        this.wheelHandler = (_pointer, gameObjects, _deltaX, deltaY): void => {
            const surface = this.showingLore ? this.loreScroll : this.frontScroll;
            if (!gameObjects.includes(surface.zone)) return;
            this.setScrollOffset(surface, surface.offset + deltaY * 0.45);
        };
        this.scene.input.on('pointermove', this.pointerMoveHandler);
        this.scene.input.on('pointerup', this.pointerUpHandler);
        this.scene.input.on('wheel', this.wheelHandler);

        this.background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.background.setData('swipeX', pointer.x);
        });
        this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            const startX = this.background.getData('swipeX') as number | undefined;
            if (startX === undefined) return;
            const difference = pointer.x - startX;
            if (Math.abs(difference) <= 60) return;
            if (difference > 0) this.prevCard();
            else this.nextCard();
        });
    }

    private close(): void {
        this.scene.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.scene.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.scene.input.keyboard?.removeKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.scene.input.off('pointermove', this.pointerMoveHandler);
        this.scene.input.off('pointerup', this.pointerUpHandler);
        this.scene.input.off('wheel', this.wheelHandler);
        this.scene.data.set('card-detail-open', false);
        this.closeCallback();
        this.destroy();
    }

    private prevCard(): void {
        if (this.currentIndex <= 0) return;
        this.currentIndex--;
        this.updateContent();
    }

    private nextCard(): void {
        if (this.currentIndex >= this.cards.length - 1) return;
        this.currentIndex++;
        this.updateContent();
    }

    private updateContent(): void {
        const card = this.cards[this.currentIndex];
        if (!card) return;

        const titleFontSize = card.name.length > 26 ? (this.compact ? '19px' : '21px') : (this.compact ? '23px' : '26px');
        this.nameText.setFontSize(titleFontSize).setText(card.name.toUpperCase());
        this.typeText.setText(`${card.typeLabel || card.type}  |  Costo ${card.cost} ${card.costResource || 'SP'}`);

        this.frontScroll.text.setText(this.buildFrontText(card));
        this.loreScroll.text.setText(this.buildLoreText(card));
        this.resetScroll(this.frontScroll);
        this.resetScroll(this.loreScroll);
        this.loadArtImage(card);

        this.navLeft.setAlpha(this.currentIndex > 0 ? 1 : 0.26);
        this.navRight.setAlpha(this.currentIndex < this.cards.length - 1 ? 1 : 0.26);
        this.playCardChangeAnimation();
    }

    private buildFrontText(card: CardInfo): string {
        const effects = card.effectsText?.length ? card.effectsText.map(value => `- ${value}`).join('\n') : 'Sin efectos.';
        const requirements = card.requirementsText?.length
            ? card.requirementsText.map(value => `- ${value}`).join('\n')
            : 'Sin requisitos.';
        return `EFECTOS\n${effects}\n\nREQUISITOS\n${requirements}`;
    }

    private buildLoreText(card: CardInfo): string {
        const affinityAllowed = ['PROTAGONIST', 'PERSONAJE', 'CHARACTER'].includes(card.type);
        const rows = [`DESCRIPCION\n${card.description || 'Sin descripcion.'}`];
        if (affinityAllowed) {
            rows.push(`LE GUSTA\n${card.likes?.length ? card.likes.join(', ') : 'Sin afinidades.'}`);
            rows.push(`NO LE GUSTA\n${card.dislikes?.length ? card.dislikes.join(', ') : 'Sin afinidades.'}`);
        }
        rows.push(`LORE\n${card.backstory || 'Sin lore extendido.'}`);
        return rows.join('\n\n');
    }

    private setLoreFace(showLore: boolean): void {
        if (this.showingLore === showLore) return;
        this.showingLore = showLore;
        this.scene.tweens.killTweensOf(this.cardShell);
        this.scene.tweens.add({
            targets: this.cardShell,
            scaleX: 0,
            duration: 125,
            ease: 'Sine.In',
            onComplete: () => {
                this.frontFace.setVisible(!showLore);
                this.loreFace.setVisible(showLore);
                this.scene.tweens.add({
                    targets: this.cardShell,
                    scaleX: 1,
                    duration: 165,
                    ease: 'Sine.Out',
                });
            },
        });
    }

    private resetScroll(surface: ScrollSurface): void {
        surface.maxOffset = Math.max(0, surface.text.height - surface.viewportHeight);
        if (surface.maxOffset > 0) {
            surface.text.setMask(surface.mask);
        } else {
            surface.text.clearMask();
        }
        this.setScrollOffset(surface, 0);
        surface.thumb.setVisible(surface.maxOffset > 0);
    }

    private setScrollOffset(surface: ScrollSurface, offset: number): void {
        surface.offset = Phaser.Math.Clamp(offset, 0, surface.maxOffset);
        surface.text.y = surface.viewportY - surface.offset;
        if (surface.maxOffset <= 0) return;
        const thumbHeight = Math.max(18, surface.trackHeight * (surface.viewportHeight / surface.text.height));
        surface.thumb.height = thumbHeight;
        const travel = surface.trackHeight - thumbHeight;
        surface.thumb.y = surface.viewportY + travel * (surface.offset / surface.maxOffset);
    }

    private loadArtImage(card: CardInfo): void {
        this.pendingImageCardId = card.id;
        this.artImage?.destroy();
        this.artImage = null;
        const source = card.image || '';
        if (!/^(https?:\/\/|\/|data:image\/)/.test(source)) return;
        const key = `detail-art-${this.hashSource(source)}`;
        const addImage = (): void => {
            if (this.pendingImageCardId !== card.id || !this.frontFace.active || !this.scene.textures.exists(key)) return;
            this.artImage?.destroy();
            this.artImage = this.scene.add.image(this.artX, this.artY, key)
                .setDisplaySize(this.artWidth - 12, this.artHeight - 12);
            this.frontFace.addAt(this.artImage, 1);
        };
        if (this.scene.textures.exists(key)) {
            addImage();
            return;
        }
        this.scene.load.image(key, source);
        this.scene.load.once(Phaser.Loader.Events.COMPLETE, addImage);
        this.scene.load.start();
    }

    private hashSource(source: string): string {
        let hash = 0;
        for (let index = 0; index < source.length; index++) {
            hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
        }
        return Math.abs(hash).toString(36);
    }

    private playOpenAnimation(): void {
        this.setAlpha(0);
        this.cardShell.setScale(0.94);
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 135,
            ease: 'Sine.Out',
        });
        this.scene.tweens.add({
            targets: this.cardShell,
            scale: 1,
            duration: 190,
            ease: 'Back.Out',
        });
    }

    private playCardChangeAnimation(): void {
        this.scene.tweens.killTweensOf(this.artBackground);
        this.artBackground.setScale(0.97);
        this.scene.tweens.add({
            targets: this.artBackground,
            scale: 1,
            duration: 180,
            ease: 'Sine.Out',
        });
    }
}
