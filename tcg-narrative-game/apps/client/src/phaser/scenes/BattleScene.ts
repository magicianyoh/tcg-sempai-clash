import Phaser from 'phaser';
import { TimelineBlock } from '../ui/TimelineBlock';
import { CardSprite } from '../ui/CardSprite';
import { FieldSlot, SlotPosition } from '../ui/FieldSlot';
import { CardDetailOverlay, CardInfo } from '../ui/CardDetailOverlay';
import { canPlayCard } from '@tcg/game-engine/rules/validation';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import type {
    LogEntry,
    MatchState,
    PlayerState,
    StatusEffect,
    TimelineBlock as TimelineBlockData,
} from '@tcg/shared/types';

interface CardDisplayData {
    id: string;
    name: string;
    type: string;
    cost: number;
    description: string;
    backstory?: string;
    image?: string;
    sound?: string;
    archetype?: string;
    prereqs?: string[];
    requirements?: Array<{
        type: string;
        value?: number;
        cardIds?: string[];
        cardType?: string;
        tag?: string;
        archetype?: string;
        description?: string;
    }>;
    effects?: Array<{
        type: string;
        value?: number;
        target?: 'SELF' | 'OPPONENT';
        description?: string;
        cardType?: string;
        cardId?: string;
        turns?: number;
    }>;
    likes?: string[];
    dislikes?: string[];
    affinity?: { compatibleWith?: string[] };
    tags?: string[];
}

type BoardView = 'self' | 'opponent';
type BannerTone = 'turn' | 'event' | 'danger' | 'final' | 'neutral';
type FieldTheme = {
    id: string;
    name: string;
    bg: number;
    accent: number;
    secondary: number;
};

type UiSettings = {
    victoryImage: string;
    victorySound: string;
    defeatImage: string;
    defeatSound: string;
    playCardEffect: string;
    playCardSound: string;
    phaseAdvanceEffect: string;
    phaseAdvanceSound: string;
    handHoverEffect: string;
    slotIdleEffect: string;
    slotValidDropEffect: string;
    eventReadyEffect: string;
    eventResolveEffect: string;
    victoryEffect: string;
    defeatEffect: string;
    boardBackgroundImage: string;
    turnBannerImage: string;
};

const CARD_DB: Record<string, CardDisplayData> = {};
const API_URL = window.location.origin;

function displayEnum(value?: string): string {
    const map: Record<string, string> = {
        SLICE_OF_LIFE: 'Slice of Life',
        SURVIVAL_GAME: 'Survival Game',
        HAREM_INVERSO: 'Harem Inverso',
        EVENT_FINAL: 'Final Event',
        EVENT_KEY: 'Key Event',
        PROTAGONIST: 'Protagonista',
        PERSONAJE: 'Personaje',
        CHARACTER: 'Personaje',
        LOCATION: 'Locacion',
        ITEM: 'Item',
        TOKEN: 'Token',
        EVENT: 'Evento',
        FILLER: 'Filler',
        ISEKAI: 'Isekai',
        SHONEN: 'Shonen',
        MECHA: 'Mecha',
        SHOJO: 'Shojo',
        HAREM: 'Harem',
        SPOKON: 'Spokon',
        KAIJU: 'Kaiju',
    };
    return map[value || ''] || String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function getWebSocketUrl(token?: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${protocol}//${window.location.host}/ws${query}`;
}

const FIELD_THEMES: Record<string, FieldTheme> = {
    bg_01: { id: 'bg_01', name: 'Neon Clash', bg: 0x020609, accent: 0x4ecdc4, secondary: 0xe94560 },
    bg_02: { id: 'bg_02', name: 'Crimson Arc', bg: 0x140508, accent: 0xff5a76, secondary: 0xffd166 },
    bg_03: { id: 'bg_03', name: 'Golden Stage', bg: 0x111008, accent: 0xffd166, secondary: 0x4ecdc4 },
    bg_04: { id: 'bg_04', name: 'Violet Night', bg: 0x090615, accent: 0x9b5de5, secondary: 0x00bbf9 },
};

export class BattleScene extends Phaser.Scene {
    private ws: WebSocket | null = null;
    private matchState: MatchState | null = null;
    private myUsername = '';
    private myPlayerIndex = 0;
    private currentView: BoardView = 'self';

    private background!: Phaser.GameObjects.Rectangle;
    private boardContainer!: Phaser.GameObjects.Container;
    private handContainer!: Phaser.GameObjects.Container;
    private hudContainer!: Phaser.GameObjects.Container;
    private bannerLayer!: Phaser.GameObjects.Container;

    private currentBlocks: TimelineBlock[] = [];
    private handCards: CardSprite[] = [];

    private endTurnBtn!: Phaser.GameObjects.Container;
    private forfeitBtn!: Phaser.GameObjects.Container;
    private viewToggleBtn!: Phaser.GameObjects.Container;
    private turnIndicator!: Phaser.GameObjects.Text;
    private turnCountText!: Phaser.GameObjects.Text;
    private playerTitleText!: Phaser.GameObjects.Text;
    private statText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private opponentStatText!: Phaser.GameObjects.Text;
    private objectivePanel!: Phaser.GameObjects.Container;
    private objectivePanelBg!: Phaser.GameObjects.Rectangle;
    private objectiveText!: Phaser.GameObjects.Text;
    private fieldThemeOverlay!: Phaser.GameObjects.Graphics;
    private configuredBoardBackgroundImage: Phaser.GameObjects.Image | null = null;
    private configuredBoardBackgroundSource = '';
    private lastNoTargetFeedbackAt = 0;

    private hasReceivedState = false;
    private lastLogIndex = 0;
    private lastActivePlayerId = '';
    private previousFillerByPlayer: Record<string, number> = {};
    private previousHandCountByPlayer: Record<string, number> = {};
    private bannerQueue: Array<{ title: string; subtitle?: string; tone: BannerTone }> = [];
    private bannerActive = false;
    private narrativeEntries: string[] = [];
    private effectEntries: string[] = [];
    private localTimerEvent: Phaser.Time.TimerEvent | null = null;
    private timerExpiredSentForTurn = '';
    private narrativePanel: HTMLElement | null = null;
    private narrativeContent: HTMLDivElement | null = null;
    private narrativeEffectsContent: HTMLDivElement | null = null;
    private narrativeToggle: HTMLButtonElement | null = null;
    private narrativeDrawerOpen = false;
    private uiSettings: UiSettings = {
        victoryImage: '',
        victorySound: '',
        defeatImage: '',
        defeatSound: '',
        playCardEffect: 'spark',
        playCardSound: '',
        phaseAdvanceEffect: 'arc-burst',
        phaseAdvanceSound: '',
        handHoverEffect: 'lift-glow',
        slotIdleEffect: 'thin-outline',
        slotValidDropEffect: 'cyan-pulse',
        eventReadyEffect: 'gold-pulse',
        eventResolveEffect: 'arc-burst',
        victoryEffect: 'screen-flash',
        defeatEffect: 'desaturate',
        boardBackgroundImage: '',
        turnBannerImage: '',
    };

    constructor() {
        super('BattleScene');
    }

    create(): void {
        const { width, height } = this.scale;
        this.myUsername = (window as any).username || 'Player';

        this.background = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0).setDepth(-30);
        this.ensureEffectTexture();
        this.createLayout();
        this.createHUD();
        this.createNarrativeLog();
        this.createViewToggleButton();
        this.createEndTurnButton();
        this.createForfeitButton();
        this.setupDragAndDrop();
        this.setupGlobalEvents();

        Promise.all([this.loadCardCatalog(), this.loadUiSettings()]).finally(() => this.connectWebSocket());
        this.scale.on('resize', this.handleResize, this);
    }

    private createLayout(): void {
        const { width, height } = this.scale;
        this.fieldThemeOverlay = this.add.graphics();
        this.fieldThemeOverlay.setDepth(-10);
        this.boardContainer = this.add.container(this.getBoardX(), this.getBoardY());
        this.handContainer = this.add.container(0, height - 108);
        this.bannerLayer = this.add.container(0, 0).setDepth(2500);
    }

    private ensureEffectTexture(): void {
        if (this.textures.exists('sc-effect-particle')) return;
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('sc-effect-particle', 16, 16);
        graphics.destroy();
    }

    private createHUD(): void {
        const { width } = this.scale;
        this.hudContainer = this.add.container(0, 0);

        this.playerTitleText = this.add.text(width / 2, 20, 'PLAYER', {
            fontSize: '42px',
            color: '#ffffff',
            fontFamily: 'Georgia, serif',
            align: 'center',
        }).setOrigin(0.5, 0);

        this.turnIndicator = this.add.text(width / 2, 78, 'Conectando...', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.turnCountText = this.add.text(width / 2, 102, 'Turno 1', {
            fontSize: '12px',
            color: '#aab2c2',
        }).setOrigin(0.5);

        const statBg = this.add.rectangle(12, 12, 218, 94, 0x020609, 0.88)
            .setOrigin(0)
            .setStrokeStyle(2, 0x4ecdc4, 0.75);
        this.statText = this.add.text(26, 22, 'Puntos: 0\nSP: 0  FP: 0', {
            fontSize: '22px',
            color: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontStyle: 'bold',
            lineSpacing: 7,
        });
        this.timerText = this.add.text(26, 78, '', {
            fontSize: '16px',
            color: '#ffd166',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontStyle: 'bold',
        });

        this.opponentStatText = this.add.text(width - 18, 18, 'Rival\nSP: 0\nFP: 0', {
            fontSize: '13px',
            color: '#aab2c2',
            align: 'right',
            lineSpacing: 4,
        }).setOrigin(1, 0);

        this.objectivePanel = this.add.container(18, 82);
        this.objectivePanelBg = this.add.rectangle(0, 0, 292, 116, 0x000000, 0.72)
            .setOrigin(0)
            .setStrokeStyle(1, 0x4ecdc4, 0.42);
        this.objectiveText = this.add.text(12, 10, 'Esperando estado de partida...', {
            fontSize: '12px',
            color: '#d7dee9',
            lineSpacing: 4,
            wordWrap: { width: 268 },
        });
        this.objectivePanel.add([this.objectivePanelBg, this.objectiveText]);

        this.hudContainer.add([
            this.playerTitleText,
            this.turnIndicator,
            this.turnCountText,
            statBg,
            this.statText,
            this.timerText,
            this.opponentStatText,
            this.objectivePanel,
        ]);
    }

    private createNarrativeLog(): void {
        this.destroyNarrativeLog();

        const panel = document.createElement('aside');
        panel.className = 'anime-log-panel';
        panel.innerHTML = `
            <div class="anime-log-title">Capitulo en curso</div>
            <div class="anime-log-tabs">
                <button class="anime-log-tab active" data-log-tab="story" type="button">Narracion</button>
                <button class="anime-log-tab" data-log-tab="effects" type="button">Efectos</button>
            </div>
            <div class="anime-log-content"></div>
            <div class="anime-log-content hidden" data-effects-content></div>
        `;

        const toggle = document.createElement('button');
        toggle.className = 'anime-log-toggle';
        toggle.type = 'button';
        this.narrativeDrawerOpen = window.innerWidth >= 920;

        const syncLogToggle = () => {
            const isMobile = window.innerWidth < 920;
            panel.classList.toggle('open', isMobile && this.narrativeDrawerOpen);
            panel.classList.toggle('closed', !this.narrativeDrawerOpen);
            toggle.classList.toggle('closed', !this.narrativeDrawerOpen);
            toggle.textContent = this.narrativeDrawerOpen ? 'Ocultar log' : 'Ver log';
        };

        toggle.addEventListener('click', () => {
            this.narrativeDrawerOpen = !this.narrativeDrawerOpen;
            syncLogToggle();
        });
        window.addEventListener('resize', syncLogToggle);
        syncLogToggle();

        document.body.appendChild(panel);
        document.body.appendChild(toggle);
        this.narrativePanel = panel;
        this.narrativeContent = panel.querySelector('.anime-log-content') as HTMLDivElement | null;
        this.narrativeEffectsContent = panel.querySelector('[data-effects-content]') as HTMLDivElement | null;
        this.narrativeToggle = toggle;
        panel.querySelectorAll<HTMLButtonElement>('[data-log-tab]').forEach(button => {
            button.addEventListener('click', () => {
                const showEffects = button.dataset.logTab === 'effects';
                panel.querySelectorAll('.anime-log-tab').forEach(tab => tab.classList.remove('active'));
                button.classList.add('active');
                this.narrativeContent?.classList.toggle('hidden', showEffects);
                this.narrativeEffectsContent?.classList.toggle('hidden', !showEffects);
                this.renderActiveEffects();
            });
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyNarrativeLog());
        this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyNarrativeLog());
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('resize', syncLogToggle));
        this.events.once(Phaser.Scenes.Events.DESTROY, () => window.removeEventListener('resize', syncLogToggle));
    }

    private destroyNarrativeLog(): void {
        this.narrativePanel?.remove();
        this.narrativeToggle?.remove();
        this.narrativePanel = null;
        this.narrativeContent = null;
        this.narrativeEffectsContent = null;
        this.narrativeToggle = null;
    }

    private createViewToggleButton(): void {
        const { width } = this.scale;
        this.viewToggleBtn = this.add.container(this.getActionButtonX(), 108);
        const bg = this.add.rectangle(0, 0, 164, 34, 0x111827, 0.96).setStrokeStyle(2, 0xffffff);
        const text = this.add.text(0, 0, 'VER RIVAL', {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        text.setData('label', true);
        this.viewToggleBtn.add([bg, text]);
        this.viewToggleBtn.setSize(164, 34);
        this.viewToggleBtn.setInteractive({ useHandCursor: true });
        this.viewToggleBtn.on('pointerdown', () => this.toggleBoardView());
    }

    private createEndTurnButton(): void {
        const { width } = this.scale;
        this.endTurnBtn = this.add.container(this.getActionButtonX(), 150);
        const bg = this.add.rectangle(0, 0, 164, 38, 0x4ecdc4, 0.95).setStrokeStyle(2, 0xffffff);
        const text = this.add.text(0, 0, 'PASAR TURNO', {
            fontSize: '13px',
            color: '#001315',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        text.setData('label', true);

        this.endTurnBtn.add([bg, text]);
        this.endTurnBtn.setSize(164, 38);
        this.endTurnBtn.setInteractive({ useHandCursor: true });
        this.endTurnBtn.on('pointerdown', () => this.sendEndTurn());
    }

    private createForfeitButton(): void {
        const { width } = this.scale;
        this.forfeitBtn = this.add.container(width - 74, 214).setDepth(1200);
        const bg = this.add.rectangle(0, 0, 104, 34, 0x3b0b16, 0.94)
            .setStrokeStyle(2, 0xe94560);
        const text = this.add.text(0, 0, 'FORFEIT', {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.forfeitBtn.add([bg, text]);
        this.forfeitBtn.setSize(104, 34);
        this.forfeitBtn.setInteractive({ useHandCursor: true });
        this.forfeitBtn.on('pointerdown', () => this.sendForfeit());
        this.hudContainer.add(this.forfeitBtn);
    }

    private setupDragAndDrop(): void {
        this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            if (gameObject instanceof CardSprite) {
                gameObject.x = dragX;
                gameObject.y = dragY;
            }
        });

        this.input.on('dragenter', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropZone: Phaser.GameObjects.GameObject) => {
            if (gameObject instanceof CardSprite) {
                this.highlightSpecificDropTarget(gameObject, dropZone);
            }
        });

        this.input.on('dragleave', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (gameObject instanceof CardSprite) {
                this.highlightDropTargets(gameObject);
            }
        });

        this.input.on('drop', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropZone: Phaser.GameObjects.GameObject) => {
            if (gameObject instanceof CardSprite) {
                this.handleCardDrop(gameObject, dropZone);
                this.clearDropHighlights();
            }
        });

        this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
            if (gameObject instanceof CardSprite) {
                this.clearDropHighlights();
                if (!dropped) {
                    this.tweens.add({
                        targets: gameObject,
                        x: { from: gameObject.x - 5, to: gameObject.x + 5 },
                        duration: 50,
                        yoyo: true,
                        repeat: 2,
                        onComplete: () => gameObject.resetPosition(),
                    });
                }
            }
        });
    }

    private setupGlobalEvents(): void {
        this.events.on('card-clicked', this.handleFieldCardClick, this);
        this.events.on('hand-card-drag-start', this.highlightDropTargets, this);
        this.events.on('hand-card-drag-end', this.clearDropHighlights, this);
    }

    private toggleBoardView(): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername) return;
        this.currentView = this.currentView === 'self' ? 'opponent' : 'self';
        this.updateDisplay();
    }

    private handleCardDrop(card: CardSprite, dropZone: Phaser.GameObjects.GameObject): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername || this.currentView !== 'self') {
            card.resetPosition();
            return;
        }

        const cardId = card.getCardId();
        const dropData = this.getDropData(dropZone);
        if (!dropData) {
            card.resetPosition();
            return;
        }

        const valid = canPlayCard(this.matchState, this.myPlayerIndex, cardId, dropData);
        if (!valid.ok) {
            this.showFeedback(card.x, card.y, valid.reasons?.[0] ?? 'Jugada invalida');
            card.resetPosition();
            return;
        }

        this.playCardFromHandEffect(card, dropZone);
        if (dropData.isEventOrb) {
            this.sendActivateEvent(cardId);
        } else {
            this.sendPlayCard(cardId, dropData.position);
        }

        card.setVisible(false);
    }

    private getDropData(dropZone: Phaser.GameObjects.GameObject): { blockIndex: number; position?: string; isEventOrb?: boolean } | null {
        if (!this.matchState) return null;
        const me = this.matchState.players[this.myPlayerIndex];
        const blockIndex = me.board.currentBlockIndex;
        const isEventOrb = dropZone.getData('isEventOrb') === true;
        const position = dropZone.getData('slotPosition') as string | undefined;

        if (isEventOrb) {
            return { blockIndex, isEventOrb: true };
        }
        if (position) {
            return { blockIndex, position, isEventOrb: false };
        }
        return null;
    }

    private highlightDropTargets(card: CardSprite): void {
        this.clearDropHighlights();
        if (!this.matchState || this.currentView !== 'self' || this.matchState.activePlayerId !== this.myUsername) return;

        const block = this.currentBlocks[0];
        if (!block) return;

        const cardId = card.getCardId();
        const currentBlockIndex = this.matchState.players[this.myPlayerIndex].board.currentBlockIndex;
        let validTargets = 0;

        if (this.isEventType(card.getCardType())) {
            const valid = canPlayCard(this.matchState, this.myPlayerIndex, cardId, {
                blockIndex: currentBlockIndex,
                isEventOrb: true,
            });
            if (valid.ok && block.isEventOrbEmpty()) {
                block.highlightEventOrb(true);
                validTargets++;
            }
            this.showNoTargetFeedbackIfNeeded(card, validTargets, valid.reasons?.[0] ?? 'El evento no cumple requisitos');
            return;
        }

        for (const slot of block.getSlots()) {
            if (!slot.isEmpty()) continue;
            const valid = canPlayCard(this.matchState, this.myPlayerIndex, cardId, {
                blockIndex: currentBlockIndex,
                position: slot.getSlotPosition(),
                isEventOrb: false,
            });
            if (valid.ok) {
                slot.highlightValid();
                validTargets++;
            }
        }
        this.showNoTargetFeedbackIfNeeded(card, validTargets, this.getFirstPlayIssue(cardId) || 'No hay slots validos');
    }

    private showNoTargetFeedbackIfNeeded(card: CardSprite, validTargets: number, reason: string): void {
        if (validTargets > 0 || this.time.now - this.lastNoTargetFeedbackAt < 800) return;
        this.lastNoTargetFeedbackAt = this.time.now;
        this.showFeedback(card.x, card.y, reason);
    }

    private highlightSpecificDropTarget(card: CardSprite, dropZone: Phaser.GameObjects.GameObject): void {
        if (!this.matchState || this.currentView !== 'self') return;
        const dropData = this.getDropData(dropZone);
        if (!dropData) return;

        const valid = canPlayCard(this.matchState, this.myPlayerIndex, card.getCardId(), dropData);
        if (dropZone instanceof FieldSlot) {
            valid.ok ? dropZone.highlightValid() : dropZone.highlightInvalid();
        } else if (dropZone.getData('isEventOrb') === true) {
            this.currentBlocks[0]?.highlightEventOrb(valid.ok);
        }
    }

    private clearDropHighlights(): void {
        this.currentBlocks.forEach(block => block.clearSlotHighlights());
    }

    private canActivateEventCard(cardId: string): boolean {
        if (!this.matchState) return false;
        const me = this.matchState.players[this.myPlayerIndex];
        const valid = canPlayCard(this.matchState, this.myPlayerIndex, cardId, {
            blockIndex: me.board.currentBlockIndex,
            isEventOrb: true,
        });
        return valid.ok;
    }

    private handleFieldCardClick(
        cardId: string,
        pointer?: Phaser.Input.Pointer,
        blockIndex?: number,
        position?: SlotPosition | 'event',
    ): void {
        const sourceEvent = pointer?.event as (MouseEvent & PointerEvent & { ctrlKey?: boolean; metaKey?: boolean; pointerType?: string }) | undefined;
        const wantsDetail = sourceEvent?.ctrlKey === true
            || sourceEvent?.metaKey === true
            || sourceEvent?.pointerType === 'touch'
            || (pointer as any)?.wasTouch === true;

        if (wantsDetail || this.currentView === 'opponent' || position === 'event') {
            this.playFieldCardDetailEffect(blockIndex, position);
            this.time.delayedCall(120, () => this.showCardDetail(cardId));
            return;
        }

        if (this.matchState?.activePlayerId === this.myUsername && blockIndex !== undefined && position) {
            this.sendReturnToHand(blockIndex, position);
            return;
        }

        this.playFieldCardDetailEffect(blockIndex, position);
        this.time.delayedCall(120, () => this.showCardDetail(cardId));
    }

    private showFeedback(x: number, y: number, message: string): void {
        const text = this.add.text(x, y - 54, message, {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#e94560',
            padding: { x: 8, y: 5 },
        }).setOrigin(0.5).setDepth(2200);

        this.tweens.add({
            targets: text,
            y: y - 86,
            alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy(),
        });
    }

    private playCardFromHandEffect(card: CardSprite, dropZone: Phaser.GameObjects.GameObject): void {
        const targetMatrix = (dropZone as any).getWorldTransformMatrix();
        const handMatrix = card.getWorldTransformMatrix();
        const cardData = this.getCardDisplayData(card.getCardId());
        const ghost = this.add.container(handMatrix.tx, handMatrix.ty).setDepth(2300);
        const width = Math.max(52, card.width * card.scaleX);
        const height = Math.max(74, card.height * card.scaleY);
        const bg = this.add.rectangle(0, 0, width, height, this.getBannerColor(this.isEventType(cardData.type) ? 'event' : 'neutral'), 0.92)
            .setStrokeStyle(3, 0xffffff);
        const label = this.add.text(0, 0, cardData.name, {
            fontSize: '11px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width - 10 },
        }).setOrigin(0.5);
        ghost.add([bg, label]);
        this.tweens.add({
            targets: ghost,
            x: targetMatrix.tx,
            y: targetMatrix.ty,
            scale: { from: 1, to: 0.78 },
            angle: { from: 0, to: this.isEventType(cardData.type) ? 360 : 0 },
            duration: 360,
            ease: 'Cubic.Out',
            onComplete: () => {
                this.emitParticleBurst(targetMatrix.tx, targetMatrix.ty, this.getBannerColor(this.isEventType(cardData.type) ? 'event' : 'neutral'), 16);
                ghost.destroy();
            },
        });
    }

    private playDrawCardEffect(playerName: string, count: number): void {
        const isSelf = playerName === this.myUsername;
        const { width, height } = this.scale;
        const startX = isSelf ? width - 64 : width - 180;
        const startY = isSelf ? height - 230 : 150;
        const endX = isSelf ? width / 2 : width - 180;
        const endY = isSelf ? height - 82 : 205;
        for (let index = 0; index < Math.min(count, 3); index++) {
            const card = this.add.container(startX, startY).setDepth(2350);
            const bg = this.add.rectangle(0, 0, 54, 76, 0x111827, 1).setStrokeStyle(2, 0x4ecdc4);
            const text = this.add.text(0, 0, '+1', { fontSize: '18px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
            card.add([bg, text]);
            this.tweens.add({
                targets: card,
                x: endX + index * 12,
                y: endY,
                scale: { from: 0.76, to: 1 },
                alpha: { from: 0.25, to: 1 },
                delay: index * 70,
                duration: 440,
                ease: 'Back.Out',
                onComplete: () => {
                    this.tweens.add({
                        targets: card,
                        alpha: 0,
                        y: card.y + 18,
                        duration: 220,
                        onComplete: () => card.destroy(),
                    });
                },
            });
        }
    }

    private playFieldCardDetailEffect(blockIndex?: number, position?: SlotPosition | 'event'): void {
        if (blockIndex === undefined || !position) return;
        const block = this.currentBlocks.find(item => item.getData('blockIndex') === blockIndex) || this.currentBlocks[0];
        const target = position === 'event' ? block?.getEventOrbWorldPosition() : block?.getSlotWorldPosition(position);
        if (!target) return;

        const focus = this.add.rectangle(target.x, target.y, 88, 126, 0xffffff, 0.12)
            .setStrokeStyle(3, 0xffffff, 0.95)
            .setDepth(2380);
        focus.setScale(0, 1);
        this.tweens.add({
            targets: focus,
            scaleX: 1.18,
            scaleY: 1.18,
            alpha: { from: 0.95, to: 0 },
            duration: 260,
            ease: 'Back.Out',
            onComplete: () => focus.destroy(),
        });
    }

    private showCardDetail(startCardId: string): void {
        if (!this.matchState) return;
        const allCards: CardInfo[] = [];
        const viewed = this.getViewedPlayer();
        const blockData = this.getCurrentBlockData(viewed);

        if (this.currentView === 'self') {
            this.handCards.forEach(card => allCards.push(this.getCardDetailData(card.getCardId())));
        }

        blockData?.slots.forEach(slot => {
            if (slot.cardId) {
                allCards.push(this.getCardDetailData(slot.cardId));
            }
        });
        if (blockData?.eventSlot) {
            allCards.push(this.getCardDetailData(blockData.eventSlot));
        }

        const index = allCards.findIndex(card => card.id === startCardId);
        new CardDetailOverlay(this, {
            cards: allCards,
            startIndex: index !== -1 ? index : 0,
            onClose: () => undefined,
        });
    }

    private async loadCardCatalog(): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/cards`);
            const data = await response.json() as { cards?: Record<string, any[]> };
            Object.values(data.cards ?? {}).flat().forEach(card => {
                CARD_DB[card.id] = {
                    id: card.id,
                    name: card.name,
                    type: card.type,
                    cost: card.cost ?? 0,
                    description: card.description ?? card.desc ?? '',
                    backstory: card.extendedLore ?? card.backstory,
                    image: card.image,
                    sound: card.sound,
                    archetype: card.archetype,
                    prereqs: card.prereqs ?? [],
                    requirements: card.requirements ?? [],
                    effects: card.effects ?? [],
                    likes: card.likes ?? card.likesData?.likes ?? [],
                    dislikes: card.dislikes ?? card.likesData?.dislikes ?? [],
                    affinity: card.affinity,
                    tags: card.tags ?? [],
                };
            });
        } catch (error) {
            console.warn('Card catalog unavailable, using local fallbacks.', error);
        }
    }

    private async loadUiSettings(): Promise<void> {
        try {
            const response = await fetch(`${API_URL}/ui-settings`);
            const data = await response.json() as { settings?: Partial<UiSettings> };
            this.uiSettings = {
                ...this.uiSettings,
                ...(data.settings || {}),
            };
        } catch (error) {
            console.warn('UI settings unavailable, using defaults.', error);
        }
    }

    private connectWebSocket(): void {
        const token = (window as any).token;
        this.ws = new WebSocket(getWebSocketUrl(token));
        this.ws.onopen = () => this.requestMatchState();
        this.ws.onmessage = event => {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
        };
        this.ws.onerror = () => this.turnIndicator.setText('Error de conexion');
    }

    private handleMessage(msg: { type: string; payload: any }): void {
        switch (msg.type) {
            case 'MATCH_STATE': {
                const previous = this.matchState;
                this.matchState = msg.payload.matchState;
                this.processAnnouncements(previous, this.matchState!);
                this.updateDisplay();
                break;
            }
            case 'MATCH_ENDED':
                this.showGameOver(msg.payload);
                break;
            case 'ERROR':
                console.error('Server error:', msg.payload.message);
                this.showFeedback(this.scale.width / 2, this.scale.height / 2, msg.payload.message || 'Error');
                if (this.matchState) this.updateDisplay();
                break;
        }
    }

    private requestMatchState(): void {
        if (this.ws?.readyState !== WebSocket.OPEN) return;
        const matchId = (window as any).matchId;
        this.ws.send(JSON.stringify({ type: 'MATCH_REJOIN', payload: { matchId } }));
    }

    private sendPlayCard(cardId: string, slotPosition?: string): void {
        if (!this.matchState) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'PLAY_CARD', cardId, slotPosition } },
        }));
    }

    private sendActivateEvent(cardId: string): void {
        if (!this.matchState) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'ACTIVATE_EVENT', cardId } },
        }));
    }

    private sendReturnToHand(blockIndex: number, position: string): void {
        if (!this.matchState) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'RETURN_TO_HAND', blockIndex, position } },
        }));
    }

    private sendEndTurn(): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'END_TURN' } },
        }));
    }

    private sendForfeit(): void {
        if (!this.matchState || this.matchState.winner) return;
        const ok = window.confirm('Abandonar la partida le da la victoria al rival. ¿Confirmar Forfeit?');
        if (!ok) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'FORFEIT' } },
        }));
    }

    private sendTimerExpired(): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'TIMER_EXPIRED' } },
        }));
    }

    private updateDisplay(): void {
        if (!this.matchState) return;
        this.myPlayerIndex = this.matchState.playerOrder.indexOf(this.myUsername);
        if (this.myPlayerIndex === -1) this.myPlayerIndex = 0;

        const isMyTurn = this.matchState.activePlayerId === this.myUsername;
        if (!isMyTurn && this.currentView === 'opponent') {
            this.currentView = 'self';
        }

        const me = this.matchState.players[this.myPlayerIndex];
        const opp = this.matchState.players[1 - this.myPlayerIndex];
        const viewed = this.currentView === 'self' ? me : opp;
        this.applyFieldTheme(viewed.backgroundId);

        this.turnIndicator.setText(isMyTurn ? 'TU TURNO' : 'TURNO DEL OPONENTE');
        this.turnIndicator.setColor(isMyTurn ? '#4ecdc4' : '#aab2c2');
        this.turnCountText.setText(`Turno ${this.matchState.turnNumber}`);

        const viewedLabel = this.currentView === 'self' ? 'PLAYER 1' : 'PLAYER 2';
        this.playerTitleText.setText(`${viewedLabel}\n${viewed.username}`);
        this.updateHudLayout();

        const summaryPlayer = this.currentView === 'self' ? opp : me;
        const summaryLabel = this.currentView === 'self' ? 'Rival' : 'Yo';
        const viewedStory = viewed.storyPoints ?? viewed.historyPoints ?? 0;
        const summaryStory = summaryPlayer.storyPoints ?? summaryPlayer.historyPoints ?? 0;
        this.statText.setText(`Puntos: ${this.getPlayerScore(viewed)}\nSP: ${viewedStory}  FP: ${viewed.fillerPoints}`);
        this.updateTimerText();
        this.opponentStatText.setText(`${summaryLabel}\nPuntos: ${this.getPlayerScore(summaryPlayer)}\nSP: ${summaryStory}\nFP: ${summaryPlayer.fillerPoints}`);
        this.updateObjectivePanel(me, viewed, isMyTurn);

        this.viewToggleBtn.setVisible(isMyTurn);
        this.viewToggleBtn.setAlpha(isMyTurn ? 1 : 0.35);
        this.viewToggleBtn.setPosition(this.getActionButtonX(), this.getActionButtonY(0));
        this.updateViewToggleLabel();

        this.endTurnBtn.setPosition(this.getActionButtonX(), this.getActionButtonY(1));
        this.forfeitBtn.setPosition(Math.max(70, this.scale.width - 74), 214);
        this.endTurnBtn.setAlpha(isMyTurn && this.currentView === 'self' ? 1 : 0.45);
        this.updateEndTurnLabel();
        this.renderViewedBoard(viewed);
        this.renderHand(me.hand, isMyTurn && this.currentView === 'self');
    }

    private updateViewToggleLabel(): void {
        const label = this.viewToggleBtn.getAll().find(child => child.getData('label') === true) as Phaser.GameObjects.Text | undefined;
        label?.setText(this.currentView === 'self' ? 'VER RIVAL' : 'VER MI CAMPO');
    }

    private updateEndTurnLabel(): void {
        const label = this.endTurnBtn.getAll().find(child => child.getData('label') === true) as Phaser.GameObjects.Text | undefined;
        label?.setText(this.isPreparedEventReady(this.myPlayerIndex) ? 'SIGUIENTE ARCO' : 'PASAR TURNO');
    }

    private updateTimerText(): void {
        if (!this.matchState?.timerEnabled || !this.matchState.playerTimers) {
            this.timerText.setText('');
            this.localTimerEvent?.remove(false);
            this.localTimerEvent = null;
            return;
        }

        this.localTimerEvent?.remove(false);
        const render = () => {
            if (!this.matchState?.timerEnabled || !this.matchState.playerTimers) return;
            const active = this.matchState.activePlayerId;
            const stored = this.matchState.playerTimers[active] ?? 60;
            const elapsed = this.matchState.turnStartedAt ? Math.floor((Date.now() - this.matchState.turnStartedAt) / 1000) : 0;
            const remaining = Math.max(0, stored - elapsed);
            this.timerText.setColor(remaining <= 10 ? '#e94560' : '#ffd166');
            this.timerText.setText(`Timer ${active}: 0:${String(remaining).padStart(2, '0')}`);
            const turnKey = `${this.matchState.matchId}:${this.matchState.turnNumber}:${active}`;
            if (remaining === 0 && active === this.myUsername && this.timerExpiredSentForTurn !== turnKey) {
                this.timerExpiredSentForTurn = turnKey;
                this.sendTimerExpired();
            }
        };
        render();
        this.localTimerEvent = this.time.addEvent({ delay: 500, loop: true, callback: render });
    }

    private updateHudLayout(): void {
        const { width } = this.scale;
        const compact = width < 560;
        const titleSize = compact ? 24 : width < 680 ? 30 : 42;

        this.playerTitleText
            .setPosition(width / 2, compact ? 42 : 20)
            .setFontSize(titleSize)
            .setLineSpacing(compact ? -8 : 0);
        this.turnIndicator
            .setPosition(width / 2, compact ? 116 : 78)
            .setFontSize(compact ? 14 : 18);
        this.turnCountText
            .setPosition(width / 2, compact ? 136 : 102)
            .setFontSize(compact ? 11 : 12);
        this.statText
            .setPosition(compact ? 20 : 26, compact ? 18 : 22)
            .setFontSize(compact ? 16 : 22);
        this.timerText
            .setPosition(compact ? 20 : 26, compact ? 72 : 78)
            .setFontSize(compact ? 13 : 16);
        this.opponentStatText
            .setPosition(width - (compact ? 12 : 18), compact ? 14 : 18)
            .setFontSize(compact ? 11 : 13);
    }

    private getPlayerScore(player: PlayerState): number {
        const story = player.storyPoints ?? player.historyPoints ?? 0;
        const completed = player.completedEvents?.length || 0;
        return story + completed * 4 - player.fillerPoints;
    }

    private updateObjectivePanel(me: PlayerState, viewed: PlayerState, isMyTurn: boolean): void {
        const { width } = this.scale;
        const panelWidth = width < 720 ? Math.max(220, width - 36) : 292;
        this.objectivePanel.setPosition(18, width < 560 ? 232 : width < 720 ? 118 : 82);
        this.objectivePanelBg.setSize(panelWidth, 116);
        this.objectiveText.setWordWrapWidth(panelWidth - 24);
        this.objectiveText.setFontSize(width < 720 ? 11 : 12);
        this.objectiveText.setText(this.createObjectiveText(me, viewed, isMyTurn));
    }

    private createObjectiveText(me: PlayerState, viewed: PlayerState, isMyTurn: boolean): string {
        if (this.currentView === 'opponent') {
            return `Viendo campo rival: ${viewed.username}\nLa mano rival permanece oculta.\nVolve a tu campo para jugar cartas.`;
        }

        const lines: string[] = [
            isMyTurn ? 'Tu turno: resolve el arco o prepara el campo.' : `Esperando a ${this.matchState?.activePlayerId}.`,
        ];

        const restrictions = this.getRestrictionsText(me);
        if (restrictions.length) lines.push(...restrictions.slice(0, 2));

        const prepared = this.getPreparedEventText(me);
        if (prepared) {
            lines.push(prepared);
        } else {
            const playableEvent = me.hand.find(cardId =>
                this.isEventType(this.getCardDisplayData(cardId).type) && this.canActivateEventCard(cardId)
            );
            lines.push(playableEvent && isMyTurn
                ? `Evento listo: ${this.getCardDisplayData(playableEvent).name}. Arrastralo al centro.`
                : 'Objetivo: ocupa slots y busca un evento con requisitos completos.'
            );
        }

        return lines.slice(0, 5).join('\n');
    }

    private getRestrictionsText(player: PlayerState): string[] {
        const restrictions = (player.statusEffects || [])
            .filter(effect => effect.type === 'BLOCK_CARD_TYPE' && effect.turnsRemaining > 0)
            .map(effect => `Restriccion: sin ${String(effect.cardType || 'ese tipo')} por ${effect.turnsRemaining} turno(s).`);

        if (!player.canPlayEvents || player.eventsBlockedTurns > 0 || player.isEventsBlocked) {
            restrictions.push(`Restriccion: eventos bloqueados ${Math.max(1, player.eventsBlockedTurns || 1)} turno(s).`);
        }

        return restrictions;
    }

    private getPreparedEventText(player: PlayerState): string | null {
        const block = player.board.blocks[player.board.currentBlockIndex];
        if (!block?.eventSlot || block.eventCompleted) return null;

        const card = this.getCardDisplayData(block.eventSlot);
        const missing = this.describeMissingRequirements(player, card);
        return missing.length === 0
            ? `Evento preparado: ${card.name}\nListo para Siguiente Arco.`
            : `Evento preparado: ${card.name}\nFalta: ${missing.slice(0, 2).join('; ')}`;
    }

    private describeMissingRequirements(player: PlayerState, card: CardDisplayData): string[] {
        const missing: string[] = [];
        for (const requirement of card.requirements || []) {
            switch (requirement.type) {
                case 'STORY_MIN': {
                    const story = player.storyPoints ?? player.historyPoints ?? 0;
                    if (story < (requirement.value || 0)) missing.push(`SP ${story}/${requirement.value || 0}`);
                    break;
                }
                case 'FILLER_MAX':
                    if (player.fillerPoints > (requirement.value || 99)) missing.push(`FP max ${requirement.value}`);
                    break;
                case 'EVENT_COMPLETED': {
                    const required = requirement.cardIds || [];
                    const pending = required.filter(cardId => !player.completedEvents.includes(cardId));
                    if (pending.length) missing.push(`eventos: ${pending.map(id => this.getCardDisplayData(id).name).join(', ')}`);
                    break;
                }
                case 'CARD_ON_BOARD': {
                    const found = this.countMatchingBoardCards(player, requirement);
                    const needed = requirement.value || 1;
                    if (found < needed) missing.push(`${this.describeBoardRequirement(requirement)} ${found}/${needed}`);
                    break;
                }
            }
        }
        return missing;
    }

    private countMatchingBoardCards(player: PlayerState, requirement: NonNullable<CardDisplayData['requirements']>[number]): number {
        let found = 0;
        player.board.blocks.forEach(block => {
            block.slots.forEach(slot => {
                if (!slot.cardId) return;
                const card = this.getCardDisplayData(slot.cardId);
                if (requirement.cardIds && !requirement.cardIds.includes(slot.cardId)) return;
                if (requirement.cardType && card.type !== requirement.cardType) return;
                if (requirement.tag && !card.tags?.includes(requirement.tag)) return;
                if (requirement.archetype && card.archetype !== requirement.archetype) return;
                found++;
            });
        });
        return found;
    }

    private describeBoardRequirement(requirement: NonNullable<CardDisplayData['requirements']>[number]): string {
        if (requirement.cardIds?.length) return requirement.cardIds.map(id => this.getCardDisplayData(id).name).join(', ');
        if (requirement.description) return requirement.description;
        if (requirement.cardType) return `cartas ${requirement.cardType}`;
        if (requirement.tag) return `tag ${requirement.tag}`;
        if (requirement.archetype) return `cartas ${requirement.archetype}`;
        return 'cartas en campo';
    }

    private getCardHandDescription(card: CardDisplayData): string {
        return card.description;
    }

    private getCardDetailData(cardId: string): CardInfo {
        const card = this.getCardDisplayData(cardId);
        return {
            ...card,
            description: this.getCardHandDescription(card),
            typeLabel: displayEnum(card.type),
            archetypeLabel: displayEnum(card.archetype),
            likes: (card.likes || []).map(id => this.getCardDisplayData(id).name),
            dislikes: (card.dislikes || []).map(id => this.getCardDisplayData(id).name),
            requirementsText: (card.requirements || []).map(requirement => this.describeRequirement(requirement)),
            effectsText: (card.effects || []).map(effect => this.describeEffect(effect)),
        };
    }

    private describeRequirement(requirement: NonNullable<CardDisplayData['requirements']>[number]): string {
        if (requirement.type === 'STORY_MIN') return `${requirement.value || 0} SP (Story Points)`;
        if (requirement.type === 'FILLER_MAX') return `FP (Filler Points) <= ${requirement.value || 0}`;
        if (requirement.type === 'EVENT_COMPLETED') return `Completar evento: ${requirement.cardIds?.map(id => this.getCardDisplayData(id).name).join(', ') || 'previo'}`;
        if (requirement.type === 'CARD_ON_BOARD') return this.describeBoardRequirement(requirement);
        return requirement.type;
    }

    private describeEffect(effect: NonNullable<CardDisplayData['effects']>[number]): string {
        const target = effect.target === 'OPPONENT' ? 'rival' : 'propio';
        if (effect.type === 'STORY') return `Otorga +${effect.value || 0} SP (Story Points) al jugador ${target}.`;
        if (effect.type === 'FILLER') return `${(effect.value || 0) >= 0 ? 'Otorga' : 'Reduce'} ${Math.abs(effect.value || 0)} FP (Filler Points) al jugador ${target}.`;
        if (effect.type === 'DRAW') return `Roba +${effect.value || 1} carta(s).`;
        if (effect.type === 'DISCARD') return `Descarta ${effect.value || 1} carta(s) del ${target}.`;
        if (effect.type === 'BLOCK_CARD_TYPE') return `Impide al ${target} jugar cartas de ${displayEnum(effect.cardType || 'un tipo')} por ${effect.turns || 1} turno(s).`;
        if (effect.type === 'BLOCK_EVENTS') return `Impide al ${target} jugar eventos por ${effect.turns || effect.value || 1} turno(s).`;
        if (effect.type === 'EXTRA_DRAW_NEXT_TURN') return `Roba +${effect.value || 1} carta(s) al inicio del proximo turno.`;
        if (effect.type === 'REMOVE_OPPONENT_BOARD_CARD') return 'Remueve 1 carta del campo rival.';
        if (effect.type === 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN') return 'Impide que el rival use 1 carta al azar de su mano durante el proximo turno.';
        if (effect.type === 'NEXT_EVENT_REDUCE_REQUIREMENT') return 'Tu proximo evento ignora 1 requisito para poder jugarse.';
        if (effect.type === 'INVOKE_CARD_TO_OPPONENT_HAND') return `Invoca ${this.getCardDisplayData(effect.cardId || 'isekai-char-demon-lord-gouki').name} en la mano del rival.`;
        if (effect.type === 'HAND_SP_DECAY_PERCENT') return `Mientras esta carta este en tu mano, pierdes ${effect.value || 5}% de tus SP (Story Points) al inicio de cada turno.`;
        if (effect.type === 'VICTORY') return 'Ganas la partida al concretar este Evento Final.';
        return effect.type;
    }

    private getFirstPlayIssue(cardId: string): string | null {
        if (!this.matchState) return null;
        const card = this.getCardDisplayData(cardId);
        const player = this.matchState.players[this.myPlayerIndex];
        const blockIndex = player.board.currentBlockIndex;

        if (this.isEventType(card.type)) {
            const result = canPlayCard(this.matchState, this.myPlayerIndex, cardId, { blockIndex, isEventOrb: true });
            return result.ok ? null : result.reasons?.[0] || null;
        }

        const block = player.board.blocks[blockIndex];
        const emptySlot = block?.slots.find(slot => !slot.cardId);
        if (!emptySlot) return 'No hay slots libres en este arco';

        const result = canPlayCard(this.matchState, this.myPlayerIndex, cardId, {
            blockIndex,
            position: emptySlot.position,
            isEventOrb: false,
        });
        return result.ok ? null : result.reasons?.[0] || null;
    }

    private isPreparedEventReady(playerIndex: number): boolean {
        if (!this.matchState) return false;
        const player = this.matchState.players[playerIndex];
        const block = player.board.blocks[player.board.currentBlockIndex];
        if (!block?.eventSlot || block.eventCompleted) return false;

        const card = this.getCardDisplayData(block.eventSlot);
        const requirements = card.requirements || [];
        if (requirements.length === 0) return true;

        for (const requirement of requirements) {
            switch (requirement.type) {
                case 'STORY_MIN': {
                    const story = player.storyPoints ?? player.historyPoints ?? 0;
                    if (story < (requirement.value || 0)) return false;
                    break;
                }
                case 'FILLER_MAX':
                    if (player.fillerPoints > (requirement.value || 99)) return false;
                    break;
                case 'EVENT_COMPLETED': {
                    const required = requirement.cardIds || [];
                    if (required.some(cardId => !player.completedEvents.includes(cardId))) return false;
                    break;
                }
                case 'CARD_ON_BOARD': {
                    let foundCount = 0;
                    player.board.blocks.forEach(boardBlock => {
                        boardBlock.slots.forEach(slot => {
                            if (!slot.cardId) return;
                            const slotCard = this.getCardDisplayData(slot.cardId);
                            if (requirement.cardIds && !requirement.cardIds.includes(slot.cardId)) return;
                            if (requirement.cardType && slotCard.type !== requirement.cardType) return;
                            if (requirement.tag && !slotCard.tags?.includes(requirement.tag)) return;
                            if (requirement.archetype && slotCard.archetype !== requirement.archetype) return;
                            foundCount++;
                        });
                    });
                    if (foundCount < (requirement.value || 1)) return false;
                    break;
                }
            }
        }

        return true;
    }

    private applyFieldTheme(backgroundId?: string): void {
        const theme = FIELD_THEMES[backgroundId || 'bg_01'] ?? FIELD_THEMES.bg_01;
        const { width, height } = this.scale;
        this.background.setFillStyle(theme.bg);
        this.fieldThemeOverlay.clear();
        this.fieldThemeOverlay.fillStyle(theme.secondary, 0.08);
        this.fieldThemeOverlay.fillRect(0, 0, width, height);
        this.fieldThemeOverlay.lineStyle(2, theme.accent, 0.16);
        for (let y = 0; y < height; y += 62) {
            this.fieldThemeOverlay.lineBetween(0, y, width, y);
        }
        this.applyConfiguredBoardBackgroundImage(width, height);
    }

    private applyConfiguredBoardBackgroundImage(width: number, height: number): void {
        const source = this.uiSettings.boardBackgroundImage;
        if (!source) {
            this.configuredBoardBackgroundImage?.destroy();
            this.configuredBoardBackgroundImage = null;
            this.configuredBoardBackgroundSource = '';
            return;
        }

        const key = `admin-board-${this.hashSource(source)}`;
        const showImage = () => {
            if (this.configuredBoardBackgroundSource !== source) {
                this.configuredBoardBackgroundImage?.destroy();
                this.configuredBoardBackgroundImage = null;
                this.configuredBoardBackgroundSource = source;
            }
            if (!this.configuredBoardBackgroundImage) {
                this.configuredBoardBackgroundImage = this.add.image(width / 2, height / 2, key)
                    .setDepth(-25)
                    .setAlpha(0.34);
            }
            this.configuredBoardBackgroundImage
                .setTexture(key)
                .setPosition(width / 2, height / 2)
                .setDisplaySize(width, height);
        };

        if (this.textures.exists(key)) {
            showImage();
        } else if (/^(https?:\/\/|\/|data:image\/)/.test(source)) {
            this.load.image(key, source);
            this.load.once(Phaser.Loader.Events.COMPLETE, showImage);
            this.load.start();
        }
    }

    private renderViewedBoard(player: PlayerState): void {
        this.boardContainer.removeAll(true);
        this.currentBlocks = [];
        this.boardContainer.setPosition(this.getBoardX(), this.getBoardY());

        const blockData = this.getCurrentBlockData(player);
        const scale = this.getBoardScale();
        const block = new TimelineBlock(this, {
            x: 0,
            y: 0,
            blockIndex: blockData?.blockIndex ?? 0,
            scale,
            isPlayerBlock: this.currentView === 'self',
        });

        this.boardContainer.add(block);
        this.currentBlocks.push(block);

        if (blockData) {
            this.syncBlockWithState(block, blockData);
            this.updateRequirementGlow(block, player, blockData);
        }
    }

    private updateRequirementGlow(block: TimelineBlock, player: PlayerState, blockData: TimelineBlockData): void {
        if (blockData.eventCompleted) return;
        const eventIds = [
            ...player.hand,
            ...(blockData.eventSlot ? [blockData.eventSlot] : []),
        ];
        const readyEvent = eventIds
            .map(id => this.getCardDisplayData(id))
            .find(card => this.isEventType(card.type) && this.canActivateEventCard(card.id));
        if (!readyEvent) {
            block.setRequirementGlow([], false);
            return;
        }
        block.setRequirementGlow(this.getRequiredSlotPositions(blockData, readyEvent), true);
    }

    private renderHand(hand: string[], interactive: boolean): void {
        this.handContainer.removeAll(true);
        this.handCards = [];
        this.handContainer.setPosition(0, this.scale.height - 108);

        if (this.currentView === 'opponent') {
            return;
        }

        const playWidth = this.scale.width >= 920 ? this.scale.width - 350 : this.scale.width;
        const minCardWidth = this.scale.width < 560 ? 54 : 70;
        const cardWidth = Math.min(CardSprite.DEFAULT_WIDTH, Math.max(minCardWidth, (playWidth - 36) / Math.max(hand.length, 1) - 8));
        const cardHeight = cardWidth * 1.4;
        const spacing = Math.max(4, Math.min(10, cardWidth * 0.09));
        const totalWidth = hand.length * cardWidth + Math.max(0, hand.length - 1) * spacing;
        const startX = (playWidth - totalWidth) / 2;

        hand.forEach((cardId, index) => {
            const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
            const y = 20;
            const cardData = this.getCardDisplayData(cardId);
            const activatable = interactive && this.isEventType(cardData.type) && this.canActivateEventCard(cardId);
            const silenced = interactive && this.isHandCardSilenced(cardId, cardData.type);
            const card = new CardSprite(this, {
                cardId,
                name: cardData.name,
                type: cardData.type,
                cost: cardData.cost,
                description: this.getCardHandDescription(cardData),
                backstory: cardData.backstory,
                x,
                y,
                width: cardWidth,
                height: cardHeight,
                interactive,
                activatable,
                silenced,
            });

            card.on('card-tapped', (id: string, wantsDetail: boolean) => {
                if (wantsDetail || !interactive) {
                    card.playDetailFocus();
                    this.time.delayedCall(120, () => this.showCardDetail(id));
                }
            });

            this.handContainer.add(card);
            this.handCards.push(card);
        });
    }

    private syncBlockWithState(block: TimelineBlock, data: TimelineBlockData): void {
        for (const slotData of data.slots) {
            if (slotData.cardId) {
                const cardData = this.getCardDisplayData(slotData.cardId);
                block.placeCard(
                    slotData.position as SlotPosition,
                    slotData.cardId,
                    cardData.name,
                    slotData.cardType || cardData.type,
                    data.eventCompleted === true,
                );
            }
        }
        if (data.eventSlot) {
            const cardData = this.getCardDisplayData(data.eventSlot);
            block.placeEvent(data.eventSlot, cardData.name);
        }
    }

    private isHandCardSilenced(cardId: string, cardType: string): boolean {
        if (!this.matchState) return false;
        const me = this.matchState.players[this.myPlayerIndex];
        return (me.statusEffects || []).some(effect =>
            effect.turnsRemaining > 0
            && (
                (effect.type === 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN' && effect.cardId === cardId)
                || (effect.type === 'BLOCK_CARD_TYPE' && effect.cardType === cardType)
            )
        );
    }

    private getViewedPlayer(): PlayerState {
        const index = this.currentView === 'self' ? this.myPlayerIndex : 1 - this.myPlayerIndex;
        return this.matchState!.players[index];
    }

    private getCurrentBlockData(player: PlayerState): TimelineBlockData | undefined {
        return player.board.blocks[player.board.currentBlockIndex] ?? player.board.blocks[player.board.blocks.length - 1];
    }

    private getBoardY(): number {
        const { width, height } = this.scale;
        if (width < 560) {
            return Phaser.Math.Clamp(height * 0.62, 510, Math.max(510, height - 210));
        }
        return Phaser.Math.Clamp(height * 0.48, 275, Math.max(275, height - 235));
    }

    private getBoardX(): number {
        const { width } = this.scale;
        return width >= 920 ? (width - 330) / 2 : width / 2;
    }

    private getActionButtonX(): number {
        const { width } = this.scale;
        return width >= 920 ? width - 430 : width - 100;
    }

    private getActionButtonY(index: 0 | 1): number {
        const { width } = this.scale;
        if (width < 560) return index === 0 ? 164 : 206;
        return index === 0 ? 108 : 150;
    }

    private getBoardScale(): number {
        const { width, height } = this.scale;
        const playWidth = width >= 920 ? width - 350 : width;
        const reservedHeight = width < 560 ? height - 370 : height - 230;
        return Phaser.Math.Clamp(
            Math.min(playWidth / 470, reservedHeight / 470),
            width < 560 ? 0.58 : 0.64,
            width < 560 ? 0.72 : 1.08,
        );
    }

    private processAnnouncements(previous: MatchState | null, next: MatchState): void {
        if (this.lastLogIndex > next.log.length) {
            this.lastLogIndex = 0;
        }

        if (!this.hasReceivedState) {
            this.hasReceivedState = true;
            next.log.forEach(entry => this.appendNarrativeEntry(entry));
            this.lastLogIndex = next.log.length;
            this.lastActivePlayerId = next.activePlayerId;
            next.players.forEach(player => {
                this.previousFillerByPlayer[player.username] = player.fillerPoints;
                this.previousHandCountByPlayer[player.username] = player.hand.length;
            });
            this.renderActiveEffects();
            return;
        }

        const newEntries = next.log.slice(this.lastLogIndex);
        this.lastLogIndex = next.log.length;
        newEntries.forEach(entry => {
            this.appendNarrativeEntry(entry);
            this.announceLogEntry(entry);
        });

        if (previous) {
            next.players.forEach(player => {
                const prevFiller = this.previousFillerByPlayer[player.username] ?? previous.players.find(p => p.username === player.username)?.fillerPoints ?? 0;
                this.previousFillerByPlayer[player.username] = player.fillerPoints;
                const prevHandCount = this.previousHandCountByPlayer[player.username]
                    ?? previous.players.find(p => p.username === player.username)?.hand.length
                    ?? player.hand.length;
                if (player.hand.length > prevHandCount) {
                    this.time.delayedCall(90, () => this.playDrawCardEffect(player.username, player.hand.length - prevHandCount));
                }
                this.previousHandCountByPlayer[player.username] = player.hand.length;
            });
        }

        const hasTurnLog = newEntries.some(entry => entry.action === 'turn_start');
        if (!hasTurnLog && this.lastActivePlayerId !== next.activePlayerId) {
        }
        this.lastActivePlayerId = next.activePlayerId;
        this.renderActiveEffects();
    }

    private announceLogEntry(entry: LogEntry): void {
        switch (entry.action) {
            case 'turn_start':
                break;
            case 'play_card': {
                const card = this.findCardFromLog(entry.details);
                this.playConfiguredSound(card?.sound || this.uiSettings.playCardSound);
                this.playConfiguredEffect(this.uiSettings.playCardEffect, card?.type === 'FILLER' ? 'danger' : 'neutral');
                break;
            }
            case 'event_prepared': {
                const card = this.findCardFromLog(entry.details);
                this.playConfiguredSound(card?.sound || this.uiSettings.playCardSound);
                this.playConfiguredEffect(this.uiSettings.eventReadyEffect, 'event');
                break;
            }
            case 'event_complete': {
                const card = this.findCardFromLog(entry.details);
                this.playConfiguredSound(this.uiSettings.phaseAdvanceSound);
                this.playLocationChangeEffect(card?.type === 'EVENT_FINAL' ? 'final' : 'event');
                this.playConfiguredEffect(this.uiSettings.eventResolveEffect || this.uiSettings.phaseAdvanceEffect, card?.type === 'EVENT_FINAL' ? 'final' : 'event');
                this.animateEventResolution(entry, card);
                this.time.delayedCall(760, () => {
                    if (card?.type === 'EVENT_FINAL') {
                        this.enqueueBanner('ARCO FINAL', `${entry.player} avanza al arco final con ${card.name}`, 'final');
                    } else {
                        this.enqueueBanner('SIGUIENTE ARCO', `${entry.player} avanza con ${card?.name ?? entry.details ?? ''}`, 'event');
                    }
                });
                break;
            }
            case 'act_checkpoint':
                this.playConfiguredEffect(this.uiSettings.phaseAdvanceEffect, 'turn');
                break;
            case 'effect_resolved':
                this.effectEntries.push(`<strong>${this.escapeHtml(entry.player)}</strong>: ${this.escapeHtml(entry.details ?? 'Efecto resuelto')}`);
                this.effectEntries = this.effectEntries.slice(-18);
                this.renderActiveEffects();
                break;
            case 'victory':
                this.playConfiguredEffect(this.uiSettings.victoryEffect, 'final');
                this.enqueueBanner('VICTORIA', `${entry.player} gana la partida`, 'final');
                break;
        }
    }

    private appendNarrativeEntry(entry: LogEntry): void {
        const html = this.createNarrativeText(entry);
        if (!html) return;

        this.narrativeEntries.push(html);
        this.narrativeEntries = this.narrativeEntries.slice(-18);
        if (!this.narrativeContent) return;
        this.narrativeContent.innerHTML = this.narrativeEntries
            .map(line => `<p>${line}</p>`)
            .join('');
        this.narrativeContent.scrollTop = this.narrativeContent.scrollHeight;
    }

    private createNarrativeText(entry: LogEntry): string | null {
        const card = this.findCardFromLog(entry.details);
        const cardName = card ? `<strong>${this.escapeHtml(card.name)}</strong>` : `<strong>${this.escapeHtml(entry.details ?? '')}</strong>`;
        const player = this.escapeHtml(entry.player);

        switch (entry.action) {
            case 'match_started':
            case 'cpu_match_started':
                return this.pickNarrative(entry, [
                    `El capitulo abre con ${this.escapeHtml(entry.details ?? 'un duelo nuevo')}.`,
                    `La placa de titulo cae sobre ${this.escapeHtml(entry.details ?? 'un enfrentamiento nuevo')}.`,
                    `Empieza la escena: ${this.escapeHtml(entry.details ?? 'dos destinos chocan')}.`,
                ]);
            case 'turn_start':
                return this.pickNarrative(entry, [
                    `La camara vuelve a ${player}; el turno ${entry.turn} empieza con tension.`,
                    `${player} toma el foco y el tablero respira antes de la proxima jugada.`,
                    `Cambio de plano: ${player} entra en accion.`,
                    `${player} escucha el tema principal subir de volumen.`,
                ]);
            case 'play_card':
                return this.pickNarrative(entry, [
                    `${player} pone en escena ${cardName}.`,
                    `${player} baja ${cardName} y cambia el ritmo del episodio.`,
                    `${cardName} entra al campo bajo la mirada de ${player}.`,
                    `${player} revela ${cardName}; la escena gana peso.`,
                ]);
            case 'event_prepared':
                return this.pickNarrative(entry, [
                    `${player} deja listo ${cardName}; el arco espera el cierre del turno.`,
                    `${cardName} queda cargado en el centro, a punto de disparar la siguiente fase.`,
                    `${player} reune las piezas para ${cardName}, pero la resolucion espera.`,
                ]);
            case 'event_waiting':
                return this.pickNarrative(entry, [
                    `${cardName} todavia no encuentra todos sus requisitos.`,
                    `El arco intenta avanzar, pero ${cardName} queda suspendido.`,
                    `${player} mantiene ${cardName} preparado mientras falta una condicion.`,
                ]);
            case 'event_complete':
                return card?.type === 'EVENT_FINAL'
                    ? this.pickNarrative(entry, [
                        `${player} desata ${cardName} y empuja la historia al arco final.`,
                        `${cardName} rompe el limite: ${player} entra en el ultimo arco.`,
                        `Todo el campo tiembla cuando ${player} activa ${cardName}.`,
                    ])
                    : this.pickNarrative(entry, [
                        `${player} conecta las piezas y juega ${cardName}.`,
                        `${cardName} se resuelve al cierre del turno y abre un nuevo arco.`,
                        `Los requisitos encajan; ${player} hace avanzar la historia con ${cardName}.`,
                    ]);
            case 'act_checkpoint':
                return this.pickNarrative(entry, [
                    `La serie entra en punto de acto: ${this.escapeHtml(entry.details ?? 'el tempo cambia de manos')}.`,
                    `El montaje compara avances y heridas: ${this.escapeHtml(entry.details ?? 'la partida se reequilibra')}.`,
                    `El capitulo recalibra la tension antes del siguiente arco: ${this.escapeHtml(entry.details ?? '')}.`,
                ]);
            case 'effect_resolved':
                return this.pickNarrative(entry, [
                    `${this.escapeHtml(entry.details ?? 'Un efecto altera el campo')}`,
                    `La escena cambia por efecto: ${this.escapeHtml(entry.details ?? '')}`,
                    `${player} siente el impacto: ${this.escapeHtml(entry.details ?? '')}`,
                ]);
            case 'return_to_hand':
                return this.pickNarrative(entry, [
                    `${player} retira ${cardName} antes de que la escena se cierre.`,
                    `${cardName} vuelve a la mano de ${player}.`,
                    `${player} reescribe la escena y recupera ${cardName}.`,
                ]);
            case 'cpu_decision':
                return this.pickNarrative(entry, [
                    `${player} calcula su siguiente corte: ${this.escapeHtml(entry.details ?? '')}.`,
                    `${player} procesa el campo y elige: ${this.escapeHtml(entry.details ?? '')}.`,
                    `La CPU marca su intencion: ${this.escapeHtml(entry.details ?? '')}.`,
                ]);
            case 'victory':
                return this.pickNarrative(entry, [
                    `${player} alcanza el cierre del episodio.`,
                    `El ending empieza para ${player}.`,
                    `${player} firma el final de la temporada.`,
                ]);
            default:
                return null;
        }
    }

    private pickNarrative(entry: LogEntry, variants: string[]): string {
        const seed = (entry.timestamp || 0) + entry.turn * 17 + entry.action.length * 31 + (entry.details?.length || 0);
        return variants[Math.abs(seed) % variants.length];
    }

    private renderActiveEffects(): void {
        if (!this.narrativeEffectsContent || !this.matchState) return;

        const rows = this.matchState.players.flatMap(player =>
            (player.statusEffects || []).map(effect => this.formatStatusEffect(player.username, effect))
        );
        const allRows = [...rows, ...this.effectEntries];

        this.narrativeEffectsContent.innerHTML = allRows.length
            ? allRows.map(row => `<p>${row}</p>`).join('')
            : '<p>No hay efectos persistentes activos.</p>';
    }

    private formatStatusEffect(username: string, effect: StatusEffect): string {
        const owner = this.escapeHtml(username);
        const source = this.escapeHtml(effect.sourceName || effect.sourceCardId);
        if (effect.type === 'BLOCK_CARD_TYPE') {
            return `<strong>${owner}</strong>: No puedes jugar cartas de <strong>${this.escapeHtml(String(effect.cardType || 'ese tipo'))}</strong> por ${source}. Restan ${effect.turnsRemaining} turno(s).`;
        }
        if (effect.type === 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN') {
            const card = effect.cardId ? this.getCardDisplayData(effect.cardId).name : 'una carta';
            return `<strong>${owner}</strong>: <strong>${this.escapeHtml(card)}</strong> esta silenciada por ${source}. Restan ${effect.turnsRemaining} turno(s).`;
        }
        if (effect.type === 'NEXT_EVENT_REDUCE_REQUIREMENT') {
            return `<strong>${owner}</strong>: el proximo Evento requiere 1 condicion menos por ${source}.`;
        }
        if (effect.type === 'EXTRA_DRAW_NEXT_TURN') {
            return `<strong>${owner}</strong>: Robara ${effect.value || 1} carta extra por ${source}.`;
        }
        return `<strong>${owner}</strong>: ${this.escapeHtml(effect.message || effect.type)}.`;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private animateEventResolution(entry: LogEntry, card?: CardDisplayData): void {
        if (!this.matchState || !card) return;
        const player = this.matchState.players.find(p => p.username === entry.player);
        if (!player) return;

        const viewed = this.getViewedPlayer();
        const eventImpactsOpponent = card.effects?.some(effect => effect.target === 'OPPONENT') === true;
        const impactedPlayer = eventImpactsOpponent
            ? this.matchState.players.find(p => p.username !== entry.player)
            : player;

        if (viewed.username === player.username) {
            this.animateRequirementsToOrb(player, card);
        }

        if (impactedPlayer) {
            this.showFieldEffectMarker(
                impactedPlayer.username,
                eventImpactsOpponent ? `${impactedPlayer.username} recibe el efecto de ${card.name}` : `${player.username} avanza al siguiente arco`,
                card.type === 'EVENT_FINAL' ? 'final' : (eventImpactsOpponent ? 'danger' : 'event'),
            );
        }

        const blocksEvents = card.effects?.some(effect => effect.type === 'BLOCK_EVENTS') === true;
        if (blocksEvents && impactedPlayer) {
            this.enqueueBanner(
                `${impactedPlayer.username} queda bloqueado`,
                'No se pueden jugar cartas de evento este turno',
                'danger',
            );
        }
    }

    private animateRequirementsToOrb(player: PlayerState, card: CardDisplayData): void {
        const blockData = player.board.blocks.find(block => block.eventSlot === card.id)
            ?? this.getCurrentBlockData(player);
        const block = this.currentBlocks[0];
        const orb = block?.getEventOrbWorldPosition();
        if (!blockData || !block || !orb) return;

        const requiredPositions = this.getRequiredSlotPositions(blockData, card);
        block.pulseSlots(requiredPositions);

        requiredPositions.forEach((position, index) => {
            const start = block.getSlotWorldPosition(position);
            if (!start) return;

            const spark = this.add.circle(start.x, start.y, 8, this.getBannerColor(card.type === 'EVENT_FINAL' ? 'final' : 'event'), 0.95)
                .setDepth(2450);
            this.tweens.add({
                targets: spark,
                x: orb.x,
                y: orb.y,
                scale: { from: 1.4, to: 0.35 },
                alpha: { from: 1, to: 0.25 },
                delay: index * 95,
                duration: 520,
                ease: 'Sine.InOut',
                onComplete: () => spark.destroy(),
            });
        });
    }

    private getRequiredSlotPositions(blockData: TimelineBlockData, card: CardDisplayData): SlotPosition[] {
        const occupied = blockData.slots.filter(slot => slot.cardId);
        const requirements = card.requirements ?? [];
        const explicitIds = new Set<string>();
        const requiredTypes = new Set<string>();
        const requiredTags = new Set<string>();

        for (const req of requirements) {
            req.cardIds?.forEach(id => explicitIds.add(id));
            if (req.type === 'CARD_ON_BOARD' && req.cardType) requiredTypes.add(req.cardType);
            if (req.type === 'CARD_ON_BOARD' && req.tag) requiredTags.add(req.tag);
        }

        const matched = occupied.filter(slot => {
            if (!slot.cardId) return false;
            const data = this.getCardDisplayData(slot.cardId);
            return explicitIds.has(slot.cardId)
                || requiredTypes.has(data.type)
                || data.tags?.some(tag => requiredTags.has(tag));
        });

        const positions = (matched.length > 0 ? matched : occupied).map(slot => slot.position as SlotPosition);
        return Array.from(new Set(positions));
    }

    private showFieldEffectMarker(playerName: string, message: string, tone: BannerTone): void {
        const viewed = this.matchState ? this.getViewedPlayer() : null;
        const { width, height } = this.scale;
        const color = this.getBannerColor(tone);
        const x = viewed?.username === playerName ? width / 2 : width - 185;
        const y = viewed?.username === playerName ? this.getBoardY() - 185 : 205;

        const marker = this.add.container(x, y).setDepth(2400);
        const bg = this.add.rectangle(0, 0, Math.min(340, width - 32), 56, 0x000000, 0.88)
            .setStrokeStyle(2, color);
        const text = this.add.text(0, 0, message, {
            fontSize: '13px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: Math.min(310, width - 54) },
        }).setOrigin(0.5);
        marker.add([bg, text]);
        marker.setAlpha(0).setScale(0.9);

        this.tweens.add({
            targets: marker,
            alpha: 1,
            scale: 1,
            duration: 160,
            ease: 'Back.Out',
            onComplete: () => {
                this.time.delayedCall(1200, () => {
                    this.tweens.add({
                        targets: marker,
                        alpha: 0,
                        y: marker.y - 16,
                        duration: 240,
                        onComplete: () => marker.destroy(),
                    });
                });
            },
        });
    }

    private playConfiguredSound(source?: string): void {
        if (!source) return;
        try {
            const audio = new Audio(source);
            audio.volume = 0.75;
            void audio.play().catch(() => undefined);
        } catch {
            // Ignore invalid or browser-blocked audio URLs.
        }
    }

    private playConfiguredEffect(effect?: string, tone: BannerTone = 'neutral'): void {
        if (!effect || effect === 'none') return;

        if (effect === 'shake') {
            this.cameras.main.shake(220, 0.006);
            return;
        }

        if (effect === 'screen-flash' || effect === 'desaturate') {
            const color = effect === 'desaturate' ? 0x9aa3af : this.getBannerColor(tone);
            const flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, color, 0.22)
                .setOrigin(0)
                .setDepth(2550);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 360,
                onComplete: () => flash.destroy(),
            });
            return;
        }

        if (effect === 'zoom-pop') {
            this.tweens.add({
                targets: this.cameras.main,
                zoom: { from: 1.02, to: 1 },
                duration: 260,
                ease: 'Sine.Out',
            });
            return;
        }

        const color = this.getBannerColor(tone);
        if (effect === 'spark' || effect === 'gold-pulse') {
            this.emitParticleBurst(this.scale.width / 2, this.scale.height / 2, color, effect === 'gold-pulse' ? 34 : 22);
        }
        const ring = this.add.circle(this.scale.width / 2, this.scale.height / 2, 36, color, 0)
            .setStrokeStyle(5, color, 0.92)
            .setDepth(2540);
        this.tweens.add({
            targets: ring,
            scale: { from: 0.6, to: effect === 'ripple' ? 6.5 : 3.8 },
            alpha: { from: 0.95, to: 0 },
            duration: effect === 'arc-burst' ? 620 : 420,
            ease: 'Sine.Out',
            onComplete: () => ring.destroy(),
        });
    }

    private playLocationChangeEffect(tone: BannerTone): void {
        const { width, height } = this.scale;
        const color = this.getBannerColor(tone);
        const panel = this.add.rectangle(-width * 0.55, height / 2, width * 1.1, height, color, 0.16)
            .setDepth(2320)
            .setAngle(-8);
        const scanline = this.add.rectangle(width / 2, height / 2, width, 4, 0xffffff, 0.88)
            .setDepth(2321);
        this.cameras.main.flash(180, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
        this.cameras.main.shake(180, tone === 'final' ? 0.006 : 0.0035);
        this.tweens.add({
            targets: panel,
            x: width * 1.45,
            alpha: { from: 0.24, to: 0 },
            duration: 620,
            ease: 'Cubic.InOut',
            onComplete: () => panel.destroy(),
        });
        this.tweens.add({
            targets: scanline,
            y: { from: 0, to: height },
            alpha: { from: 0.95, to: 0 },
            duration: 520,
            ease: 'Sine.Out',
            onComplete: () => scanline.destroy(),
        });
    }

    private emitParticleBurst(x: number, y: number, color: number, quantity = 18): void {
        if (!this.textures.exists('sc-effect-particle')) this.ensureEffectTexture();
        const emitter = this.add.particles(x, y, 'sc-effect-particle', {
            lifespan: 420,
            speed: { min: 80, max: 240 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 0.95, end: 0 },
            tint: color,
            quantity,
            emitting: false,
        }).setDepth(2520);
        emitter.explode(quantity);
        this.time.delayedCall(560, () => emitter.destroy());
    }

    private enqueueBanner(title: string, subtitle: string | undefined, tone: BannerTone): void {
        this.bannerQueue.push({ title, subtitle, tone });
        if (!this.bannerActive) {
            this.playNextBanner();
        }
    }

    private playNextBanner(): void {
        const next = this.bannerQueue.shift();
        if (!next) {
            this.bannerActive = false;
            return;
        }
        this.bannerActive = true;

        const { width, height } = this.scale;
        const color = this.getBannerColor(next.tone);
        const container = this.add.container(width / 2, height / 2).setDepth(2600);
        const bannerWidth = Math.min(width * 0.9, 620);
        const bannerHeight = 106;
        if (this.uiSettings.turnBannerImage) {
            this.addConfiguredBannerImage(container, this.uiSettings.turnBannerImage, bannerWidth, bannerHeight);
        }
        const bg = this.add.rectangle(0, 0, bannerWidth, bannerHeight, 0x000000, 0.88)
            .setStrokeStyle(4, color);
        const title = this.add.text(0, -18, next.title, {
            fontSize: width < 620 ? '28px' : '40px',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        const subtitle = this.add.text(0, 26, next.subtitle ?? '', {
            fontSize: width < 620 ? '13px' : '16px',
            color: '#d7dee9',
            align: 'center',
            wordWrap: { width: Math.min(width * 0.82, 560) },
        }).setOrigin(0.5);

        container.add([bg, title, subtitle]);
        container.setAlpha(0).setScale(0.86);
        this.bannerLayer.add(container);

        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 170,
            ease: 'Back.Out',
            onComplete: () => {
                this.time.delayedCall(1050, () => {
                    this.tweens.add({
                        targets: container,
                        alpha: 0,
                        y: container.y - 22,
                        duration: 220,
                        onComplete: () => {
                            container.destroy();
                            this.playNextBanner();
                        },
                    });
                });
            },
        });
    }

    private addConfiguredBannerImage(container: Phaser.GameObjects.Container, source: string, width: number, height: number): void {
        if (!/^(https?:\/\/|\/|data:image\/)/.test(source)) return;
        const key = `admin-banner-${this.hashSource(source)}`;
        const addImage = () => {
            if (!container.active || !this.textures.exists(key)) return;
            const image = this.add.image(0, 0, key)
                .setDisplaySize(width, height)
                .setAlpha(0.26);
            container.addAt(image, 0);
        };

        if (this.textures.exists(key)) {
            addImage();
        } else {
            this.load.image(key, source);
            this.load.once(Phaser.Loader.Events.COMPLETE, addImage);
            this.load.start();
        }
    }

    private hashSource(source: string): string {
        let hash = 0;
        for (let i = 0; i < source.length; i++) {
            hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
        }
        return Math.abs(hash).toString(36);
    }

    private getBannerColor(tone: BannerTone): number {
        switch (tone) {
            case 'turn': return 0x4ecdc4;
            case 'event': return 0x2ecc71;
            case 'danger': return 0xe94560;
            case 'final': return 0xffd166;
            default: return 0xffffff;
        }
    }

    private findCardFromLog(details?: string): CardDisplayData | undefined {
        if (!details) return undefined;
        const cleanName = details.split('@')[0].split(':')[0].trim();
        return Object.values(CARD_DB).find(card => card.name === cleanName);
    }

    private getCardDisplayData(cardId: string): CardDisplayData {
        if (CARD_DB[cardId]) return CARD_DB[cardId];
        const parts = cardId.split('-');
        const name = parts.slice(1).join(' ').replace(/^\w/, c => c.toUpperCase());
        return {
            id: cardId,
            name: name || cardId,
            type: this.inferType(cardId),
            cost: 1,
            description: 'Efecto de ' + (name || cardId),
            backstory: 'Sin lore cargado.',
            archetype: '',
            prereqs: [],
            requirements: [],
            effects: [],
            tags: [],
        };
    }

    private inferType(cardId: string): string {
        if (cardId.includes('protagonist')) return 'PROTAGONIST';
        if (cardId.includes('final')) return 'EVENT_FINAL';
        if (cardId.includes('event') || cardId.includes('training') || cardId.includes('tournament') || cardId.includes('arc')) return 'EVENT';
        if (cardId.includes('filler')) return 'FILLER';
        if (cardId.includes('token')) return 'TOKEN';
        if (cardId.includes('dojo') || cardId.includes('school') || cardId.includes('arena')) return 'LOCATION';
        if (cardId.includes('item')) return 'ITEM';
        return 'PERSONAJE';
    }

    private isEventType(type: string): boolean {
        return type === 'EVENT' || type === 'EVENT_KEY' || type === 'EVENT_FINAL';
    }

    private showGameOver(payload: { winner: string; reason: string }): void {
        const { width, height } = this.scale;
        const isWinner = payload.winner === this.myUsername;
        const configuredImage = isWinner ? this.uiSettings.victoryImage : this.uiSettings.defeatImage;
        this.playConfiguredSound(isWinner ? this.uiSettings.victorySound : this.uiSettings.defeatSound);
        this.playConfiguredEffect(isWinner ? this.uiSettings.victoryEffect : this.uiSettings.defeatEffect, isWinner ? 'final' : 'danger');
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0).setDepth(2800);
        if (configuredImage) this.addConfiguredEndImage(configuredImage, width / 2, height / 2 - 126);
        this.add.text(width / 2, height / 2 - 44, isWinner ? 'VICTORIA' : 'DERROTA', {
            fontSize: '48px',
            color: isWinner ? '#4ecdc4' : '#e94560',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(2801);
        this.add.text(width / 2, height / 2 + 18, `Razon: ${payload.reason}`, {
            fontSize: '16px',
            color: '#d7dee9',
        }).setOrigin(0.5).setDepth(2801);
        this.addGameOverButton(width / 2 - 170, height / 2 + 82, 'REMATCH', () => {
            window.location.href = '/match.html';
        });
        this.addGameOverButton(width / 2, height / 2 + 82, 'BUILDER', () => {
            window.location.href = '/build.html';
        });
        this.addGameOverButton(width / 2 + 170, height / 2 + 82, 'GUARDAR LOG', () => {
            this.saveMatchLog();
        });
    }

    private addGameOverButton(x: number, y: number, label: string, onClick: () => void): void {
        const container = this.add.container(x, y).setDepth(2802);
        const bg = this.add.rectangle(0, 0, 142, 38, 0x111827, 0.96).setStrokeStyle(2, 0xffffff);
        const text = this.add.text(0, 0, label, {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add([bg, text]);
        container.setSize(142, 38);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', onClick);
    }

    private saveMatchLog(): void {
        const lines = (this.matchState?.log || []).map(entry =>
            `[Turno ${entry.turn}] ${entry.player}: ${entry.action}${entry.details ? ` - ${entry.details}` : ''}`
        );
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sempai-clash-log-${this.matchState?.matchId || Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    private addConfiguredEndImage(source: string, x: number, y: number): void {
        if (/^(https?:\/\/|\/|data:image\/)/.test(source)) {
            const key = `admin-end-${btoa(source).replace(/[^a-z0-9]/gi, '').slice(0, 28)}`;
            const addImage = () => {
                const image = this.add.image(x, y, key).setDepth(2801);
                image.setDisplaySize(Math.min(320, this.scale.width - 60), 120);
            };

            if (this.textures.exists(key)) {
                addImage();
            } else {
                this.load.image(key, source);
                this.load.once(Phaser.Loader.Events.COMPLETE, addImage);
                this.load.start();
            }
            return;
        }

        this.add.text(x, y, source, {
            fontSize: '14px',
            color: '#aab2c2',
            align: 'center',
            wordWrap: { width: Math.min(560, this.scale.width - 40) },
        }).setOrigin(0.5).setDepth(2801);
    }

    private handleResize(gameSize: Phaser.Structs.Size): void {
        this.background.setSize(gameSize.width, gameSize.height);
        if (this.matchState) {
            this.updateDisplay();
        } else {
            this.fieldThemeOverlay.clear();
        }
    }

    update(): void {
        return;
    }
}
