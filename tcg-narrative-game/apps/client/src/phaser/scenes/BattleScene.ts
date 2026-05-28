import Phaser from 'phaser';
import { TimelineBlock } from '../ui/TimelineBlock';
import { CardSprite } from '../ui/CardSprite';
import { FieldSlot, SlotPosition } from '../ui/FieldSlot';
import { CardDetailOverlay, CardInfo } from '../ui/CardDetailOverlay';
import { canPlayCard } from '@tcg/game-engine/rules/validation';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import type {
    LogEntry,
    MatchFinalSummary,
    MatchState,
    PlayerState,
    TimelineBlock as TimelineBlockData,
} from '@tcg/shared/types';

interface CardDisplayData {
    id: string;
    name: string;
    type: string;
    cost: number;
    costResource?: 'SP' | 'FP';
    description: string;
    backstory?: string;
    endingTitle?: string;
    endingLore?: string;
    endingImage?: string;
    endingSound?: string;
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
    protagonistId?: string;
}

type BoardView = 'self' | 'opponent';
type BannerTone = 'turn' | 'event' | 'danger' | 'final' | 'neutral';
type QuickEventPresentation = {
    card: CardDisplayData;
    playerName: string;
    isOpponent: boolean;
};
type MatchEndedPayload = {
    winner: string;
    reason: string;
    summary?: MatchFinalSummary;
};
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
const API_URL = String((import.meta as any).env?.VITE_API_URL || window.location.origin).replace(/\/$/, '');

function displayEnum(value?: string): string {
    const map: Record<string, string> = {
        SLICE_OF_LIFE: 'Slice of Life',
        SURVIVAL_GAME: 'Survival Game',
        HAREM_INVERSO: 'Harem Inverso',
        EVENT_FINAL: 'Final Event',
        CLIMAX_EVENT: 'Evento Climax',
        PLOT_TWIST_EVENT: 'Plot-Twist',
        EVENT_KEY: 'Key Event',
        PROTAGONIST: 'Protagonista',
        PERSONAJE: 'Personaje',
        CHARACTER: 'Personaje',
        LOCATION: 'Locacion',
        ITEM: 'Item',
        TOKEN: 'Quick Event',
        QUICK_EVENT: 'Quick Event',
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
    const configuredUrl = String((import.meta as any).env?.VITE_WS_URL || '').trim().replace(/\/$/, '');
    if (configuredUrl) {
        const query = token ? `?token=${encodeURIComponent(token)}` : '';
        return `${configuredUrl}${query}`;
    }
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
    private readonly isSpectator = new URLSearchParams(window.location.search).get('spectator') === '1';
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
    private arcNavigation!: Phaser.GameObjects.Container;
    private arcUpButton!: Phaser.GameObjects.Container;
    private arcDownButton!: Phaser.GameObjects.Container;
    private arcNavigationText!: Phaser.GameObjects.Text;

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
    private localTimerEvent: Phaser.Time.TimerEvent | null = null;
    private timerExpiredSentForTurn = '';
    private narrativePanel: HTMLElement | null = null;
    private narrativeContent: HTMLDivElement | null = null;
    private chatInput: HTMLInputElement | null = null;
    private narrativeToggle: HTMLButtonElement | null = null;
    private narrativeDrawerOpen = false;
    private visibleBlockByPlayer: Record<string, number> = {};
    private observedActiveBlockByPlayer: Record<string, number> = {};
    private transitioningBoardUser = '';
    private transitioningToBlock: number | null = null;
    private arcTransitionTimer: Phaser.Time.TimerEvent | null = null;
    private swipeStart: { x: number; y: number } | null = null;
    private handSwipeStart: { x: number; y: number; offset: number } | null = null;
    private handSwipeActive = false;
    private handScrollOffset = 0;
    private handScrollMax = 0;
    private pendingLocalHandEntries = 0;
    private cardDragActive = false;
    private quickEventQueue: QuickEventPresentation[] = [];
    private quickEventPresentationActive = false;
    private lastTurnBannerKey = '';
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
        this.createArcNavigation();
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

    private createArcNavigation(): void {
        this.arcNavigation = this.add.container(0, 0).setDepth(1300).setVisible(false);
        this.arcUpButton = this.createArcNavigationButton(-54, '\u25b2', 1);
        this.arcDownButton = this.createArcNavigationButton(54, '\u25bc', -1);
        this.arcNavigationText = this.add.text(0, 0, '1 / 1', {
            fontSize: '11px',
            color: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        this.arcNavigation.add([this.arcUpButton, this.arcNavigationText, this.arcDownButton]);
    }

    private createArcNavigationButton(y: number, label: string, delta: -1 | 1): Phaser.GameObjects.Container {
        const button = this.add.container(0, y);
        const bg = this.add.circle(0, 0, 22, 0x020609, 0.94)
            .setStrokeStyle(2, 0x4ecdc4, 0.95);
        const text = this.add.text(0, -1, label, {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        button.add([bg, text]);
        button.setSize(46, 46).setInteractive({ useHandCursor: true });
        button.on('pointerdown', () => this.navigateArc(delta));
        return button;
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

        const statBg = this.add.rectangle(12, 12, 238, 126, 0x020609, 0.88)
            .setOrigin(0)
            .setStrokeStyle(2, 0x4ecdc4, 0.75);
        this.statText = this.add.text(26, 22, 'Puntos: 0\nSP: 0  FP: 0', {
            fontSize: '22px',
            color: '#ffffff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontStyle: 'bold',
            lineSpacing: 7,
        }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showCemetery());
        this.timerText = this.add.text(26, 108, '', {
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

        this.objectivePanel = this.add.container(18, 142);
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
            <div class="anime-log-content"></div>
            <form class="anime-chat-form">
                <input class="anime-chat-input" maxlength="240" placeholder="Escribir mensaje..." ${this.isSpectator ? 'disabled' : ''}>
                <button type="submit" ${this.isSpectator ? 'disabled' : ''}>Enviar</button>
            </form>
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
        this.chatInput = panel.querySelector('.anime-chat-input') as HTMLInputElement | null;
        this.narrativeToggle = toggle;
        panel.querySelector('form')?.addEventListener('submit', event => {
            event.preventDefault();
            const text = this.chatInput?.value.trim() || '';
            if (!text || !this.matchState || this.isSpectator || this.ws?.readyState !== WebSocket.OPEN) return;
            this.ws.send(JSON.stringify({
                type: 'MATCH_CHAT',
                payload: { matchId: this.matchState.matchId, message: text },
            }));
            if (this.chatInput) this.chatInput.value = '';
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
        this.chatInput = null;
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
        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
            if (gameObject instanceof CardSprite) {
                if (this.handSwipeStart && this.scale.width < 920) {
                    const dx = pointer.x - this.handSwipeStart.x;
                    const dy = pointer.y - this.handSwipeStart.y;
                    if (this.handSwipeActive || (Math.abs(dx) >= 14 && Math.abs(dx) > Math.abs(dy) * 1.15)) {
                        this.handSwipeActive = true;
                        this.clearDropHighlights();
                        gameObject.resetPosition();
                        this.setHandScrollOffset(this.handSwipeStart.offset - dx);
                        return;
                    }
                }
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
                if (this.handSwipeActive) {
                    gameObject.resetPosition();
                    this.clearDropHighlights();
                    return;
                }
                this.handleCardDrop(gameObject, dropZone);
                this.clearDropHighlights();
            }
        });

        this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropped: boolean) => {
            if (gameObject instanceof CardSprite) {
                this.clearDropHighlights();
                if (this.handSwipeActive) {
                    gameObject.resetPosition();
                    this.handSwipeActive = false;
                    return;
                }
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
        this.events.on('hand-card-drag-start', (card: CardSprite) => {
            this.cardDragActive = true;
            this.highlightDropTargets(card);
        });
        this.events.on('hand-card-drag-end', () => {
            this.clearDropHighlights();
            this.time.delayedCall(0, () => {
                this.cardDragActive = false;
            });
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.data.get('card-detail-open') === true) return;
            if (this.scale.width >= 920) return;
            if (pointer.y >= this.getHandSwipeTop()) {
                this.handSwipeStart = { x: pointer.x, y: pointer.y, offset: this.handScrollOffset };
                this.handSwipeActive = false;
                this.swipeStart = null;
                return;
            }
            this.swipeStart = { x: pointer.x, y: pointer.y };
        });
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.handSwipeStart || this.cardDragActive || this.scale.width >= 920 || this.data.get('card-detail-open') === true) return;
            const dx = pointer.x - this.handSwipeStart.x;
            const dy = pointer.y - this.handSwipeStart.y;
            if (Math.abs(dx) >= 14 && Math.abs(dx) > Math.abs(dy) * 1.15) {
                this.handSwipeActive = true;
                this.setHandScrollOffset(this.handSwipeStart.offset - dx);
            }
        });
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.data.get('card-detail-open') === true) {
                this.swipeStart = null;
                this.handSwipeStart = null;
                this.handSwipeActive = false;
                return;
            }
            if (this.handSwipeStart) {
                const dx = pointer.x - this.handSwipeStart.x;
                const dy = pointer.y - this.handSwipeStart.y;
                const dragIsFinishingSwipe = this.cardDragActive && this.handSwipeActive;
                if (!this.cardDragActive && Math.abs(dx) >= 14 && Math.abs(dx) > Math.abs(dy)) {
                    this.setHandScrollOffset(this.handSwipeStart.offset - dx);
                }
                this.handSwipeStart = null;
                if (!dragIsFinishingSwipe) this.handSwipeActive = false;
                this.swipeStart = null;
                return;
            }
            if (!this.swipeStart || this.cardDragActive || this.scale.width >= 920) {
                this.swipeStart = null;
                return;
            }
            const dx = pointer.x - this.swipeStart.x;
            const dy = pointer.y - this.swipeStart.y;
            this.swipeStart = null;
            if (Math.abs(dy) < 54 || Math.abs(dy) <= Math.abs(dx)) return;
            this.navigateArc(dy < 0 ? 1 : -1);
        });
    }

    private toggleBoardView(): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername || this.transitioningBoardUser) return;
        this.currentView = this.currentView === 'self' ? 'opponent' : 'self';
        this.updateDisplay();
    }

    private navigateArc(delta: -1 | 1): void {
        if (!this.matchState || this.transitioningBoardUser) return;
        const viewed = this.getViewedPlayer();
        const currentIndex = this.getVisibleBlockIndex(viewed);
        const target = Phaser.Math.Clamp(currentIndex + delta, 0, viewed.board.currentBlockIndex);
        if (target === currentIndex) return;
        this.visibleBlockByPlayer[viewed.username] = target;
        this.animateArcNavigation(viewed, target, delta);
        this.renderHand(
            this.isSpectator ? [] : this.matchState.players[this.myPlayerIndex].hand,
            this.canInteractWithCurrentArc()
        );
        this.updateTurnActionState();
    }

    private animateArcNavigation(player: PlayerState, targetIndex: number, delta: -1 | 1): void {
        const homeY = this.getBoardY();
        const exitY = homeY + (delta > 0 ? 118 : -118);
        const enterY = homeY + (delta > 0 ? -118 : 118);
        this.tweens.killTweensOf(this.boardContainer);
        this.tweens.add({
            targets: this.boardContainer,
            y: exitY,
            alpha: 0,
            duration: 180,
            ease: 'Sine.In',
            onComplete: () => {
                this.renderViewedBoard(player, targetIndex);
                this.boardContainer.setPosition(this.getBoardX(), enterY).setAlpha(0);
                this.tweens.add({
                    targets: this.boardContainer,
                    y: homeY,
                    alpha: 1,
                    duration: 230,
                    ease: 'Cubic.Out',
                });
            },
        });
    }

    private handleCardDrop(card: CardSprite, dropZone: Phaser.GameObjects.GameObject): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername || this.currentView !== 'self' || !this.canInteractWithCurrentArc()) {
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
        if (!this.matchState || this.currentView !== 'self' || this.matchState.activePlayerId !== this.myUsername || !this.canInteractWithCurrentArc()) return;

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

    private isEventReadyInHand(cardId: string): boolean {
        if (!this.matchState) return false;
        const me = this.matchState.players[this.myPlayerIndex];
        const card = this.getCardDisplayData(cardId);
        if ((card.prereqs || []).some(requiredId => !me.completedEvents.includes(requiredId))) return false;

        for (const requirement of card.requirements || []) {
            switch (requirement.type) {
                case 'STORY_MIN': {
                    const story = me.storyPoints ?? me.historyPoints ?? 0;
                    if (story < (requirement.value || 0)) return false;
                    break;
                }
                case 'FILLER_MAX':
                    if (me.fillerPoints > (requirement.value || 99)) return false;
                    break;
                case 'FILLER_MIN':
                    if (me.fillerPoints < (requirement.value || 0)) return false;
                    break;
                case 'EVENT_COMPLETED': {
                    const required = requirement.cardIds || [];
                    if (required.some(requiredId => !me.completedEvents.includes(requiredId))) return false;
                    break;
                }
                case 'CARD_ON_BOARD':
                    if (this.countMatchingBoardCards(me, requirement) < (requirement.value || 1)) return false;
                    break;
            }
        }

        return true;
    }

    private handleFieldCardClick(
        cardId: string,
        pointer?: Phaser.Input.Pointer,
        blockIndex?: number,
        position?: SlotPosition | 'event' | 'protagonist',
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
        const dynamicAction = cardData.type === 'QUICK_EVENT';
        const bg = this.add.rectangle(0, 0, width, height, this.getBannerColor(this.isEventType(cardData.type) || dynamicAction ? 'event' : 'neutral'), 0.92)
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
            angle: { from: 0, to: this.isEventType(cardData.type) || dynamicAction ? 360 : 0 },
            duration: 360,
            ease: 'Cubic.Out',
            onComplete: () => {
                this.emitParticleBurst(targetMatrix.tx, targetMatrix.ty, this.getBannerColor(this.isEventType(cardData.type) || dynamicAction ? 'event' : 'neutral'), 16);
                ghost.destroy();
            },
        });
    }

    private enqueueQuickEventPresentation(card: CardDisplayData, playerName: string): void {
        this.quickEventQueue.push({
            card,
            playerName,
            isOpponent: playerName !== this.myUsername,
        });
        if (!this.quickEventPresentationActive) this.showNextQuickEventPresentation();
    }

    private showNextQuickEventPresentation(): void {
        const presentation = this.quickEventQueue.shift();
        if (!presentation) {
            this.quickEventPresentationActive = false;
            return;
        }
        this.quickEventPresentationActive = true;
        if (presentation.isOpponent) {
            const queuedBanners = this.bannerQueue.length + (this.bannerActive ? 1 : 0);
            this.enqueueBanner(
                `${presentation.playerName.toUpperCase()} JUGO`,
                `la carta ${presentation.card.name}`,
                'danger',
            );
            this.time.delayedCall((queuedBanners + 1) * 1450, () => this.revealQuickEventPresentation(presentation));
            return;
        }
        this.revealQuickEventPresentation(presentation);
    }

    private revealQuickEventPresentation(presentation: QuickEventPresentation): void {
        const { card } = presentation;
        const { width, height } = this.scale;
        const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x020609, 0.42).setDepth(2740);
        const reveal = new CardSprite(this, {
            cardId: card.id,
            name: card.name,
            type: card.type,
            cost: card.cost,
            description: card.description,
            backstory: card.backstory,
            x: this.getBoardX(),
            y: this.getBoardY(),
            width: 124,
            height: 176,
            interactive: false,
        }).setDepth(2745);
        reveal.setScale(0.02, 1).setAngle(-16);
        this.tweens.add({
            targets: reveal,
            x: width / 2,
            y: height / 2 - 20,
            scaleX: 1.18,
            scaleY: 1.18,
            angle: 360,
            duration: 620,
            ease: 'Cubic.Out',
            onComplete: () => {
                this.emitParticleBurst(reveal.x, reveal.y, 0x22c55e, 24);
                this.time.delayedCall(100, () => {
                    reveal.destroy();
                    veil.destroy();
                    new CardDetailOverlay(this, {
                        cards: [this.getCardDetailData(card.id)],
                        startIndex: 0,
                        confirmLabel: 'OK',
                        dismissOnCardTap: presentation.isOpponent,
                        onClose: () => {
                            this.quickEventPresentationActive = false;
                            this.showNextQuickEventPresentation();
                        },
                    });
                });
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

    private playFieldCardDetailEffect(blockIndex?: number, position?: SlotPosition | 'event' | 'protagonist'): void {
        if (blockIndex === undefined || !position) return;
        const block = this.currentBlocks.find(item => item.getData('blockIndex') === blockIndex) || this.currentBlocks[0];
        const target = position === 'event' || position === 'protagonist' ? block?.getEventOrbWorldPosition() : block?.getSlotWorldPosition(position);
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

        if (this.currentView === 'self') {
            this.handCards.forEach(card => allCards.push(this.getCardDetailData(card.getCardId())));
        }

        viewed.board.blocks.forEach(blockData => {
            if (blockData.protagonistCardId) allCards.push(this.getCardDetailData(blockData.protagonistCardId));
            blockData.slots.forEach(slot => {
                if (slot.cardId) allCards.push(this.getCardDetailData(slot.cardId));
            });
            if (blockData.eventSlot) allCards.push(this.getCardDetailData(blockData.eventSlot));
        });

        const index = allCards.findIndex(card => card.id === startCardId);
        new CardDetailOverlay(this, {
            cards: allCards,
            startIndex: index !== -1 ? index : 0,
            onClose: () => {
                if (!this.matchState || this.currentView !== 'self') return;
                const me = this.matchState.players[this.myPlayerIndex];
                this.renderHand(this.isSpectator ? [] : me.hand, !this.isSpectator && this.canInteractWithCurrentArc());
            },
        });
    }

    private showCemetery(): void {
        if (!this.matchState) return;
        const cards = (this.getViewedPlayer().discard || []).map(id => this.getCardDetailData(id));
        if (cards.length === 0) {
            this.showFeedback(130, 118, 'El Cementerio esta vacio');
            return;
        }
        new CardDetailOverlay(this, { cards, startIndex: 0, onClose: () => undefined });
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
                    costResource: card.costResource ?? 'SP',
                    description: card.description ?? card.desc ?? '',
                    backstory: card.extendedLore ?? card.backstory,
                    endingTitle: card.endingTitle,
                    endingLore: card.endingLore,
                    endingImage: card.endingImage,
                    endingSound: card.endingSound,
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
                    protagonistId: card.protagonistId,
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
        this.ws.send(JSON.stringify({ type: this.isSpectator ? 'MATCH_SPECTATE' : 'MATCH_REJOIN', payload: { matchId } }));
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
        if (!this.canInteractWithCurrentArc()) {
            this.showFeedback(this.scale.width / 2, this.getBoardY(), 'Volve al arco actual para continuar.');
            return;
        }
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

        this.playerTitleText.setText(this.currentView === 'self' ? viewed.username.toUpperCase() : `${viewed.username.toUpperCase()} (RIVAL)`);
        this.updateHudLayout();

        const summaryPlayer = this.currentView === 'self' ? opp : me;
        const summaryLabel = this.currentView === 'self' ? 'Rival' : 'Yo';
        const viewedStory = viewed.storyPoints ?? viewed.historyPoints ?? 0;
        const summaryStory = summaryPlayer.storyPoints ?? summaryPlayer.historyPoints ?? 0;
        this.statText.setText(`Puntos: ${this.getPlayerScore(viewed)}\nSP: ${viewedStory}  FP: ${viewed.fillerPoints}\nCementerio: ${viewed.discard?.length || 0}`);
        this.updateTimerText();
        this.opponentStatText.setText(`${summaryLabel}\nPuntos: ${this.getPlayerScore(summaryPlayer)}\nSP: ${summaryStory}\nFP: ${summaryPlayer.fillerPoints}\nCem: ${summaryPlayer.discard?.length || 0}`);
        this.updateObjectivePanel(me, viewed, isMyTurn);

        this.viewToggleBtn.setVisible(isMyTurn);
        this.viewToggleBtn.setAlpha(isMyTurn ? 1 : 0.35);
        this.viewToggleBtn.setPosition(this.getActionButtonX(), this.getActionButtonY(0));
        this.updateViewToggleLabel();

        this.endTurnBtn.setPosition(this.getActionButtonX(), this.getActionButtonY(1));
        this.forfeitBtn.setPosition(
            this.scale.width < 560 ? this.scale.width - 58 : Math.max(70, this.scale.width - 74),
            this.scale.width < 560 ? 250 : 214
        );
        this.refreshViewedBoard(viewed);
        this.updateTurnActionState();
        this.renderHand(this.isSpectator ? [] : me.hand, !this.isSpectator && this.canInteractWithCurrentArc());
    }

    private updateViewToggleLabel(): void {
        const label = this.viewToggleBtn.getAll().find(child => child.getData('label') === true) as Phaser.GameObjects.Text | undefined;
        label?.setText(this.currentView === 'self' ? 'VER RIVAL' : 'VER MI CAMPO');
    }

    private updateEndTurnLabel(): void {
        const label = this.endTurnBtn.getAll().find(child => child.getData('label') === true) as Phaser.GameObjects.Text | undefined;
        label?.setText(this.isPreparedEventReady(this.myPlayerIndex) ? 'SIGUIENTE ARCO' : 'PASAR TURNO');
    }

    private updateTurnActionState(): void {
        const canAct = this.canInteractWithCurrentArc();
        this.endTurnBtn.setAlpha(canAct ? 1 : 0.45);
        this.updateEndTurnLabel();
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
            .setFontSize(compact ? 21 : Math.min(32, titleSize))
            .setVisible(!compact);
        this.turnIndicator
            .setPosition(width / 2, compact ? 78 : 62)
            .setFontSize(compact ? 14 : 18)
            .setVisible(!compact);
        this.turnCountText
            .setPosition(width / 2, compact ? 98 : 86)
            .setFontSize(compact ? 11 : 12)
            .setVisible(!compact);
        this.statText
            .setPosition(compact ? 20 : 26, compact ? 18 : 22)
            .setFontSize(compact ? 16 : 22);
        this.timerText
            .setPosition(compact ? 20 : 26, compact ? 98 : 108)
            .setFontSize(compact ? 13 : 16);
        this.opponentStatText
            .setPosition(width - (compact ? 12 : 18), compact ? 14 : 18)
            .setFontSize(compact ? 11 : 13);
    }

    private getPlayerScore(player: PlayerState): number {
        const story = player.storyPoints ?? player.historyPoints ?? 0;
        return story - player.fillerPoints;
    }

    private updateObjectivePanel(me: PlayerState, viewed: PlayerState, isMyTurn: boolean): void {
        const { width } = this.scale;
        const compact = width < 560;
        this.objectivePanel.setVisible(!compact);
        if (compact) return;
        const panelWidth = width < 720 ? Math.max(220, width - 36) : 292;
        this.objectivePanel.setPosition(18, width < 560 ? 252 : width < 720 ? 148 : 142);
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
                case 'FILLER_MIN':
                    if (player.fillerPoints < (requirement.value || 0)) missing.push(`FP ${player.fillerPoints}/${requirement.value || 0}`);
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
        const pendingPrereqs = (card.prereqs || []).filter(cardId => !player.completedEvents.includes(cardId));
        if (pendingPrereqs.length) {
            missing.push(`eventos: ${pendingPrereqs.map(id => this.getCardDisplayData(id).name).join(', ')}`);
        }
        return missing;
    }

    private countMatchingBoardCards(player: PlayerState, requirement: NonNullable<CardDisplayData['requirements']>[number]): number {
        let found = 0;
        const currentBlock = player.board.blocks[player.board.currentBlockIndex];
        currentBlock?.slots.forEach(slot => {
            if (!slot.cardId) return;
            const card = this.getCardDisplayData(slot.cardId);
            if (requirement.cardIds && !requirement.cardIds.includes(slot.cardId)) return;
            if (requirement.cardType && card.type !== requirement.cardType) return;
            if (requirement.tag && !card.tags?.includes(requirement.tag)) return;
            if (requirement.archetype && card.archetype !== requirement.archetype) return;
            found++;
        });
        return found;
    }

    private describeBoardRequirement(requirement: NonNullable<CardDisplayData['requirements']>[number]): string {
        const count = requirement.value || 1;
        if (requirement.cardIds?.length) return `${count} en campo: ${requirement.cardIds.map(id => this.getCardDisplayData(id).name).join(', ')}`;
        if (requirement.description) return requirement.description;
        if (requirement.cardType) return `${count} cartas ${requirement.cardType} en campo`;
        if (requirement.tag) return `${count} cartas con tag ${requirement.tag} en campo`;
        if (requirement.archetype) return `${count} cartas ${requirement.archetype} en campo`;
        return `${count} cartas en campo`;
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
            costResource: card.costResource,
            likes: (card.likes || []).map(id => this.getCardDisplayData(id).name),
            dislikes: (card.dislikes || []).map(id => this.getCardDisplayData(id).name),
            requirementsText: [
                ...(card.prereqs || []).map(id => `Completar evento previo: ${this.getCardDisplayData(id).name}`),
                ...(card.requirements || []).map(requirement => this.describeRequirement(requirement)),
            ],
            effectsText: (card.effects || []).map(effect => this.describeEffect(effect)),
        };
    }

    private describeRequirement(requirement: NonNullable<CardDisplayData['requirements']>[number]): string {
        if (requirement.type === 'STORY_MIN') return `${requirement.value || 0} SP (Story Points)`;
        if (requirement.type === 'FILLER_MAX') return `FP (Filler Points) <= ${requirement.value || 0}`;
        if (requirement.type === 'FILLER_MIN') return `${requirement.value || 0} FP (Filler Points)`;
        if (requirement.type === 'DISCARD_FROM_HAND') return `Descartar ${requirement.value || 1} carta(s) de la mano`;
        if (requirement.type === 'EVENT_COMPLETED') return `Completar evento: ${requirement.cardIds?.map(id => this.getCardDisplayData(id).name).join(', ') || 'previo'}`;
        if (requirement.type === 'EVENT_COUNT_MIN') return `Completar ${requirement.value || 1} Evento(s) previamente`;
        if (requirement.type === 'CARD_ON_BOARD') return this.describeBoardRequirement(requirement);
        if (requirement.type === 'CARD_IN_COMPLETED_ARC') return `Arco previo revelado: ${displayEnum(requirement.cardType || 'carta compatible')}`;
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
        if (effect.type === 'INVOKE_CARD_TO_OPPONENT_HAND') return `Invoca ${this.getCardDisplayData(effect.cardId || 'isekai-external-demon-lord-gouki').name} en la mano del rival.`;
        if (effect.type === 'HAND_SP_DECAY_PERCENT') return `Mientras esta carta este en tu mano, pierdes ${effect.value || 5}% de tus SP (Story Points) al inicio de cada turno.`;
        if (effect.type === 'HAND_RANDOM_FILLER_THEN_DISCARD') return 'Mientras esta carta este en tu mano, recibes 1 FP (50%), 2 FP (30%) o 3 FP (20%) al inicio de tu turno. Tras 3 activaciones, va al Cementerio.';
        if (effect.type === 'SEARCH_CLIMAX') return 'Busca el Evento Climax en tu deck y lo agrega a la mano.';
        if (effect.type === 'SEARCH_CARD_TYPE') return `Busca 1 carta de tipo ${displayEnum(effect.cardType || 'ITEM')} en tu deck y la agrega a la mano.`;
        if (effect.type === 'RECOVER_FROM_CEMETERY') return 'Recupera una carta permitida del Cementerio a tu mano.';
        if (effect.type === 'RECOVER_FROM_COMPLETED_ARC') return `Devuelve hasta ${effect.value || 1} carta(s) de un arco resuelto a tu mano.`;
        if (effect.type === 'MODIFY_CLIMAX_LEVEL') return `Reduce ${effect.value || 1} nivel(es) del Climax pendiente.`;
        if (effect.type === 'PROTECT_PROTAGONIST') return 'Tu Protagonista ignora el proximo efecto que intente silenciarlo.';
        if (effect.type === 'SILENCE_PROTAGONIST_NEXT_EVENT') return 'El Protagonista rival no activa sus efectos en su proximo Evento.';
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
        if ((card.prereqs || []).some(cardId => !player.completedEvents.includes(cardId))) return false;
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
                case 'FILLER_MIN':
                    if (player.fillerPoints < (requirement.value || 0)) return false;
                    break;
                case 'EVENT_COMPLETED': {
                    const required = requirement.cardIds || [];
                    if (required.some(cardId => !player.completedEvents.includes(cardId))) return false;
                    break;
                }
                case 'CARD_ON_BOARD': {
                    const foundCount = this.countMatchingBoardCards(player, requirement);
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

    private refreshViewedBoard(player: PlayerState): void {
        const activeIndex = player.board.currentBlockIndex;
        const previousActive = this.observedActiveBlockByPlayer[player.username];
        const rememberedIndex = this.visibleBlockByPlayer[player.username];
        const selectedIndex = rememberedIndex === undefined && previousActive !== undefined
            ? previousActive
            : this.getVisibleBlockIndex(player);
        const advanced = previousActive !== undefined && activeIndex > previousActive;
        const wasFollowingCurrent = previousActive === undefined || selectedIndex === previousActive;
        this.observedActiveBlockByPlayer[player.username] = activeIndex;
        if (previousActive === undefined && rememberedIndex === undefined) {
            this.visibleBlockByPlayer[player.username] = activeIndex;
        }

        if (advanced && wasFollowingCurrent && this.transitioningBoardUser !== player.username) {
            this.visibleBlockByPlayer[player.username] = previousActive;
            this.startNewArcTransition(player, activeIndex);
            return;
        }
        if (this.transitioningBoardUser === player.username) {
            this.updateArcNavigation(player, this.getVisibleBlockIndex(player));
            return;
        }
        this.renderViewedBoard(player, selectedIndex);
    }

    private startNewArcTransition(player: PlayerState, targetIndex: number): void {
        const sourceIndex = Math.max(0, targetIndex - 1);
        this.transitioningBoardUser = player.username;
        this.transitioningToBlock = targetIndex;
        this.visibleBlockByPlayer[player.username] = sourceIndex;
        this.renderViewedBoard(player, sourceIndex);
        this.updateTurnActionState();
        this.arcTransitionTimer?.remove(false);
        this.arcTransitionTimer = this.time.delayedCall(640, () => {
            if (this.transitioningBoardUser !== player.username || this.transitioningToBlock !== targetIndex) return;
            this.visibleBlockByPlayer[player.username] = targetIndex;
            this.animateArcNavigation(player, targetIndex, 1);
            this.time.delayedCall(430, () => {
                if (this.transitioningBoardUser !== player.username || this.transitioningToBlock !== targetIndex) return;
                this.transitioningBoardUser = '';
                this.transitioningToBlock = null;
                this.updateTurnActionState();
                if (this.matchState) {
                    const me = this.matchState.players[this.myPlayerIndex];
                    this.renderHand(this.isSpectator ? [] : me.hand, !this.isSpectator && this.canInteractWithCurrentArc());
                }
            });
        });
    }

    private getVisibleBlockIndex(player: PlayerState): number {
        const remembered = this.visibleBlockByPlayer[player.username];
        const index = remembered === undefined ? player.board.currentBlockIndex : remembered;
        return Phaser.Math.Clamp(index, 0, player.board.currentBlockIndex);
    }

    private canInteractWithCurrentArc(): boolean {
        if (!this.matchState || this.currentView !== 'self' || this.matchState.activePlayerId !== this.myUsername) return false;
        const me = this.matchState.players[this.myPlayerIndex];
        return !this.transitioningBoardUser && this.getVisibleBlockIndex(me) === me.board.currentBlockIndex;
    }

    private renderViewedBoard(player: PlayerState, blockIndex = this.getVisibleBlockIndex(player)): void {
        this.boardContainer.removeAll(true);
        this.currentBlocks = [];
        this.boardContainer.setPosition(this.getBoardX(), this.getBoardY()).setAlpha(1);

        const blockData = player.board.blocks[blockIndex];
        if (!blockData) return;
        const block = new TimelineBlock(this, {
            x: 0,
            y: 0,
            blockIndex: blockData.blockIndex,
            scale: this.getBoardScale(),
            isPlayerBlock: this.currentView === 'self',
        });
        block.setData('blockIndex', blockData.blockIndex);
        this.boardContainer.add(block);
        this.currentBlocks.push(block);
        this.syncBlockWithState(block, blockData);
        if (blockIndex === player.board.currentBlockIndex) this.updateRequirementGlow(block, player, blockData);
        this.updateArcNavigation(player, blockIndex);
    }

    private updateArcNavigation(player: PlayerState, blockIndex: number): void {
        const hasHistory = player.board.currentBlockIndex > 0;
        this.arcNavigation.setVisible(hasHistory);
        if (!hasHistory) return;
        const maxIndex = player.board.currentBlockIndex;
        const active = blockIndex === maxIndex;
        this.arcNavigation
            .setPosition(this.getArcNavigationX(), this.getBoardY())
            .setScale(this.scale.width < 560 ? 0.82 : 1);
        this.arcNavigationText.setText(active ? `ACTUAL\n${blockIndex + 1} / ${maxIndex + 1}` : `ARCO\n${blockIndex + 1} / ${maxIndex + 1}`);
        this.arcUpButton.setAlpha(blockIndex < maxIndex ? 1 : 0.28);
        this.arcDownButton.setAlpha(blockIndex > 0 ? 1 : 0.28);
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
        block.setClimaxPathPulse(this.isClimaxPathOpen(player));
        if (!readyEvent) {
            block.setRequirementGlow([], false);
            return;
        }
        block.setRequirementGlow(this.getRequiredSlotPositions(blockData, readyEvent), true);
    }

    private renderHand(hand: string[], interactive: boolean): void {
        this.handContainer.removeAll(true);
        this.handCards = [];
        this.handContainer.setPosition(-this.handScrollOffset, this.scale.height - (this.scale.width < 560 ? 145 : 108));

        if (this.currentView === 'opponent') {
            this.handScrollMax = 0;
            this.handScrollOffset = 0;
            return;
        }

        const playWidth = this.scale.width >= 920 ? this.scale.width - 350 : this.scale.width;
        const mobileScrollable = this.scale.width < 920;
        const sidePadding = mobileScrollable ? (this.scale.width < 560 ? 18 : 26) : 18;
        const minCardWidth = this.scale.width < 560 ? 72 : 70;
        const fittedWidth = (playWidth - sidePadding * 2) / Math.max(hand.length, 1) - 8;
        const cardWidth = mobileScrollable
            ? Math.min(CardSprite.DEFAULT_WIDTH, Math.max(minCardWidth, playWidth / 5.4))
            : Math.min(CardSprite.DEFAULT_WIDTH, Math.max(minCardWidth, fittedWidth));
        const cardHeight = cardWidth * 1.4;
        const spacing = Math.max(4, Math.min(10, cardWidth * 0.09));
        const totalWidth = hand.length * cardWidth + Math.max(0, hand.length - 1) * spacing;
        const startX = mobileScrollable ? sidePadding : (playWidth - totalWidth) / 2;
        this.handScrollMax = mobileScrollable ? Math.max(0, totalWidth - (playWidth - sidePadding * 2)) : 0;
        if (this.pendingLocalHandEntries > 0) {
            this.handScrollOffset = this.handScrollMax;
        }
        this.setHandScrollOffset(this.handScrollOffset);

        hand.forEach((cardId, index) => {
            const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
            const y = 20;
            const cardData = this.getCardDisplayData(cardId);
            const activatable = interactive && this.isEventType(cardData.type) && this.isEventReadyInHand(cardId);
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

        if (this.pendingLocalHandEntries > 0) {
            this.animateHandEntries(Math.min(this.pendingLocalHandEntries, this.handCards.length));
            this.pendingLocalHandEntries = 0;
        }
    }

    private getHandSwipeTop(): number {
        return this.scale.height - (this.scale.width < 560 ? 176 : 142);
    }

    private setHandScrollOffset(offset: number): void {
        this.handScrollOffset = Phaser.Math.Clamp(offset, 0, this.handScrollMax);
        this.handContainer.x = -this.handScrollOffset;
    }

    private animateHandEntries(count: number): void {
        const arriving = this.handCards.slice(-count);
        const handY = this.handContainer.y;
        const deckEntryWorldX = this.scale.width >= 920
            ? this.scale.width - 390
            : this.scale.width - 36;
        arriving.forEach((card, index) => {
            const destination = { x: card.x, y: card.y };
            card.setPosition(deckEntryWorldX - this.handContainer.x, -handY + this.scale.height - 250)
                .setAlpha(0.18)
                .setScale(0.72);
            this.tweens.add({
                targets: card,
                x: destination.x,
                y: destination.y,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                delay: index * 75,
                duration: 390,
                ease: 'Cubic.Out',
                onComplete: () => {
                    const marker = this.add.rectangle(
                        this.handContainer.x + destination.x,
                        this.handContainer.y + destination.y,
                        card.width + 8,
                        card.height + 8,
                        0x4ecdc4,
                        0.08,
                    ).setStrokeStyle(2, 0x4ecdc4, 0.95).setDepth(2250);
                    this.tweens.add({
                        targets: marker,
                        alpha: 0,
                        scaleX: 1.08,
                        scaleY: 1.08,
                        duration: 280,
                        onComplete: () => marker.destroy(),
                    });
                },
            });
        });
    }

    private syncBlockWithState(block: TimelineBlock, data: TimelineBlockData): void {
        if (data.protagonistCardId) {
            const protagonist = this.getCardDisplayData(data.protagonistCardId);
            block.placeProtagonist(data.protagonistCardId, protagonist.name);
        }
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
            return Phaser.Math.Clamp(height * 0.54, 420, Math.max(420, height - 275));
        }
        return Phaser.Math.Clamp(height * 0.48, 275, Math.max(275, height - 235));
    }

    private getBoardX(): number {
        const { width } = this.scale;
        return width >= 920 ? (width - 330) / 2 : width / 2;
    }

    private getArcNavigationX(): number {
        return this.scale.width < 560 ? 22 : 44;
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
            this.announceTurn(next.activePlayerId, next.turnNumber);
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
                const previousHand = previous.players.find(p => p.username === player.username)?.hand ?? [];
                const entries = this.countNewHandEntries(previousHand, player.hand);
                if (entries > 0) {
                    if (player.username === this.myUsername) {
                        this.pendingLocalHandEntries += entries;
                    } else {
                        this.time.delayedCall(90, () => this.playDrawCardEffect(player.username, entries));
                    }
                }
                this.previousHandCountByPlayer[player.username] = player.hand.length;
            });
        }

        const hasTurnLog = newEntries.some(entry => entry.action === 'turn_start');
        if (!hasTurnLog && this.lastActivePlayerId !== next.activePlayerId) {
            this.announceTurn(next.activePlayerId, next.turnNumber);
        }
        this.lastActivePlayerId = next.activePlayerId;
    }

    private countNewHandEntries(previousHand: string[], currentHand: string[]): number {
        const previousCopies = new Map<string, number>();
        previousHand.forEach(cardId => previousCopies.set(cardId, (previousCopies.get(cardId) ?? 0) + 1));
        let additions = 0;
        currentHand.forEach(cardId => {
            const copies = previousCopies.get(cardId) ?? 0;
            if (copies > 0) {
                previousCopies.set(cardId, copies - 1);
            } else {
                additions += 1;
            }
        });
        return additions;
    }

    private announceLogEntry(entry: LogEntry): void {
        switch (entry.action) {
            case 'turn_start':
                this.announceTurn(entry.player, entry.turn);
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
            case 'quick_event_resolved': {
                const card = this.findCardFromLog(entry.details);
                if (!card) break;
                this.playConfiguredSound(card.sound || this.uiSettings.playCardSound);
                this.playConfiguredEffect(this.uiSettings.playCardEffect, 'event');
                this.enqueueQuickEventPresentation(card, entry.player);
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
            case 'climax_revealed':
                this.playLocationChangeEffect('final');
                this.emitParticleBurst(this.scale.width / 2, this.scale.height / 2, 0xffd166, 72);
                this.enqueueBanner('CLIMAX', `${entry.player} desata ${entry.details ?? 'su desenlace'}`, 'final');
                break;
            case 'climax_complete':
                this.playLocationChangeEffect('final');
                this.emitParticleBurst(this.scale.width / 2, this.scale.height / 2, 0xffd166, 96);
                this.enqueueBanner('CLIMAX COMPLETADO', `${entry.player} cierra el desenlace`, 'final');
                break;
            case 'climax_pending':
                this.enqueueBanner('CLIMAX PENDIENTE', 'El rival puede responder con Plot-Twist', 'danger');
                break;
            case 'plot_twist_offered':
                this.enqueueBanner('PLOT-TWIST', `${entry.player} tiene una ultima respuesta`, 'danger');
                break;
            case 'plot_twist_complete':
                this.playLocationChangeEffect('danger');
                this.emitParticleBurst(this.scale.width / 2, this.scale.height / 2, 0xe94560, 64);
                this.enqueueBanner('PLOT-TWIST', `${entry.player} altera el desenlace`, 'danger');
                break;
            case 'act_checkpoint':
                this.playConfiguredEffect(this.uiSettings.phaseAdvanceEffect, 'turn');
                break;
            case 'victory':
                this.playConfiguredEffect(this.uiSettings.victoryEffect, 'final');
                this.enqueueBanner('VICTORIA', `${entry.player} gana la partida`, 'final');
                break;
        }
    }

    private announceTurn(playerName: string, turnNumber: number): void {
        const key = `${turnNumber}:${playerName}`;
        if (this.lastTurnBannerKey === key) return;
        this.lastTurnBannerKey = key;
        if (playerName === this.myUsername) {
            this.enqueueBanner('TU TURNO', `Turno ${turnNumber}`, 'turn');
            return;
        }
        this.enqueueBanner(`TURNO DE ${playerName.toUpperCase()}`, `Turno ${turnNumber}`, 'neutral');
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
            case 'turn_income':
                return `${player} recibe <strong>+1 SP</strong> al comenzar el turno.`;
            case 'chat':
                return `<strong>(${player})</strong> ${this.escapeHtml(entry.details ?? '')}`;
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
            case 'quick_event_resolved':
                return this.pickNarrative(entry, [
                    `${player} acelera la escena con ${cardName}.`,
                    `${cardName} irrumpe como Quick Event de ${player}.`,
                    `${player} responde al instante con ${cardName}.`,
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
            case 'protagonist_enter':
                return `${player} comienza su historia como ${cardName}.`;
            case 'climax_revealed':
                return `${player} alcanza su Climax con ${cardName}.`;
            case 'climax_complete':
                return `${player} completa el Climax y el desenlace queda sellado.`;
            case 'climax_pending':
                return `El Climax de ${player} queda pendiente: el rival busca un Plot-Twist.`;
            case 'plot_twist_offered':
                return `${player} recibe la oportunidad de activar ${cardName}.`;
            case 'plot_twist_complete':
                return `${player} activa ${cardName} y modifica el desenlace.`;
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
            case 'cards_to_cemetery':
                return this.pickNarrative(entry, [
                    `${player} envia al Cementerio: ${this.escapeHtml(entry.details ?? '')}`,
                    `El Cementerio recibe la carta descartada: ${this.escapeHtml(entry.details ?? '')}`,
                    `${this.escapeHtml(entry.details ?? '')} abandona la escena de ${player}.`,
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

    private isClimaxPathOpen(player: PlayerState): boolean {
        const climaxCards = Object.values(CARD_DB).filter(card =>
            card.type === 'CLIMAX_EVENT'
            && (!card.protagonistId || card.protagonistId === player.protagonistId)
        );
        return climaxCards.some(card => {
            const prereqs = card.prereqs || [];
            if (prereqs.length > 0) return prereqs.every(eventId => player.completedEvents.includes(eventId));
            const normalEventsCompleted = player.completedEvents.filter(eventId => this.getCardDisplayData(eventId).type === 'EVENT').length;
            return normalEventsCompleted >= Math.max(1, (player.protagonistTotalEvents || 1) - 1);
        });
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
            protagonistId: '',
        };
    }

    private inferType(cardId: string): string {
        if (cardId.includes('protagonist')) return 'PROTAGONIST';
        if (cardId.includes('final')) return 'EVENT_FINAL';
        if (cardId.includes('event') || cardId.includes('training') || cardId.includes('tournament') || cardId.includes('arc')) return 'EVENT';
        if (cardId.includes('filler')) return 'FILLER';
        if (cardId.includes('token')) return 'QUICK_EVENT';
        if (cardId.includes('dojo') || cardId.includes('school') || cardId.includes('arena')) return 'LOCATION';
        if (cardId.includes('item')) return 'ITEM';
        return 'PERSONAJE';
    }

    private isEventType(type: string): boolean {
        return type === 'EVENT' || type === 'EVENT_KEY' || type === 'EVENT_FINAL' || type === 'CLIMAX_EVENT' || type === 'PLOT_TWIST_EVENT';
    }

    private showGameOver(payload: MatchEndedPayload): void {
        const { width, height } = this.scale;
        const isWinner = payload.winner === this.myUsername;
        const summary = payload.summary ?? this.buildFallbackFinalSummary(payload);
        const climaxCard = summary.climaxCardId ? this.getCardDisplayData(summary.climaxCardId) : undefined;
        const plotTwistCard = summary.plotTwistCardId ? this.getCardDisplayData(summary.plotTwistCardId) : undefined;
        const endingCard = isWinner ? climaxCard : (plotTwistCard || climaxCard);
        const configuredImage = isWinner ? this.uiSettings.victoryImage : this.uiSettings.defeatImage;
        const configuredSound = isWinner ? this.uiSettings.victorySound : this.uiSettings.defeatSound;
        this.playConfiguredSound(endingCard?.endingSound || configuredSound);
        this.playConfiguredEffect(isWinner ? this.uiSettings.victoryEffect : this.uiSettings.defeatEffect, isWinner ? 'final' : 'danger');

        const tone: BannerTone = isWinner ? 'final' : 'danger';
        this.emitParticleBurst(width / 2, height / 2, this.getBannerColor(tone), isWinner ? 90 : 34);
        const overlay = this.add.rectangle(0, 0, width, height, isWinner ? 0x020609 : 0x050506, 0)
            .setOrigin(0)
            .setDepth(2800);
        this.tweens.add({ targets: overlay, alpha: isWinner ? 0.94 : 0.9, duration: 420, ease: 'Sine.Out' });

        const panelWidth = Math.min(width - 28, 860);
        const panelHeight = Math.min(height - 36, height < 720 ? 560 : 640);
        const panel = this.add.container(width / 2, height / 2 + (height < 640 ? 8 : 0))
            .setDepth(2801)
            .setAlpha(0)
            .setScale(0.94);
        const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, isWinner ? 0x08111f : 0x151518, 0.96)
            .setStrokeStyle(3, isWinner ? 0xffd166 : 0x6b7280, 0.95);
        panel.add(bg);

        const imageSource = endingCard?.endingImage || configuredImage;
        if (imageSource) this.addConfiguredEndImage(imageSource, width / 2, height / 2 - panelHeight / 2 + 82);

        const resultTitle = isWinner ? 'VICTORIA' : 'DERROTA';
        panel.add(this.add.text(0, -panelHeight / 2 + 44, resultTitle, {
            fontSize: width < 560 ? '34px' : '52px',
            color: isWinner ? '#ffed9a' : '#c8c8c8',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5));
        panel.add(this.add.text(0, -panelHeight / 2 + 88, isWinner ? 'GOOD ENDING' : 'BAD ENDING', {
            fontSize: width < 560 ? '15px' : '18px',
            color: isWinner ? '#4ecdc4' : '#9ca3af',
            fontStyle: 'bold',
        }).setOrigin(0.5));

        const flags = [
            summary.climaxCompleted ? 'Climax completado!' : '',
            summary.plotTwistOccurred ? 'Ocurrio un Plot-twist!' : '',
        ].filter(Boolean).join('  ');
        panel.add(this.add.text(0, -panelHeight / 2 + 120, flags || this.getReadableWinReason(payload.reason), {
            fontSize: width < 560 ? '13px' : '16px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: panelWidth - 44 },
        }).setOrigin(0.5));

        const scoreY = -panelHeight / 2 + (imageSource ? 230 : 172);
        const scoreSpacing = width < 560 ? 0 : Math.min(250, panelWidth / 3.2);
        summary.players.forEach((player, index) => {
            const x = width < 560 ? 0 : (index === 0 ? -scoreSpacing : scoreSpacing);
            const y = width < 560 ? scoreY + index * 104 : scoreY;
            panel.add(this.createScorePanel(x, y, player.username, player.storyPoints, player.fillerPoints, player.isWinner));
        });

        const endingText = this.resolveEndingText(isWinner, climaxCard, plotTwistCard);
        panel.add(this.createEndingTextPanel(0, scoreY + (width < 560 ? 230 : 126), panelWidth - 52, endingText));

        this.tweens.add({
            targets: panel,
            alpha: 1,
            scale: 1,
            duration: 360,
            ease: 'Back.Out',
        });

        const buttonY = height / 2 + panelHeight / 2 - 44;
        const mobileButtons = width < 560;
        this.addGameOverButton(width / 2 + (mobileButtons ? -92 : -170), buttonY, 'REMATCH', () => {
            window.location.href = '/match.html';
        });
        this.addGameOverButton(width / 2 + (mobileButtons ? 92 : 0), buttonY, 'BUILDER', () => {
            window.location.href = '/build.html';
        });
        this.addGameOverButton(width / 2 + (mobileButtons ? 0 : 170), buttonY + (mobileButtons ? 46 : 0), 'GUARDAR LOG', () => {
            this.saveMatchLog();
        });
    }

    private buildFallbackFinalSummary(payload: MatchEndedPayload): MatchFinalSummary {
        const players = (this.matchState?.players || []).map(player => ({
            username: player.username,
            storyPoints: player.storyPoints,
            fillerPoints: player.fillerPoints,
            netScore: player.storyPoints - player.fillerPoints,
            isWinner: payload.winner === player.username,
        }));
        return {
            winner: payload.winner,
            reason: (payload.reason as MatchFinalSummary['reason']) || 'climax',
            climaxCompleted: payload.reason === 'climax',
            plotTwistOccurred: false,
            players,
        };
    }

    private createScorePanel(x: number, y: number, username: string, sp: number, fp: number, highlighted: boolean): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        const color = highlighted ? 0xffd166 : 0x64748b;
        const bg = this.add.rectangle(0, 0, 210, 92, 0x030712, 0.9).setStrokeStyle(2, color, 0.95);
        const name = this.add.text(0, -30, username, {
            fontSize: '13px',
            color: highlighted ? '#fff7c2' : '#e5e7eb',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        const values = this.add.text(0, 15, `SP ${sp}   FP ${fp}`, {
            fontSize: '26px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'Arial, Helvetica, sans-serif',
        }).setOrigin(0.5);
        container.add([bg, name, values]);
        return container;
    }

    private createEndingTextPanel(x: number, y: number, width: number, text: string): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        const height = this.scale.width < 560 ? 106 : 118;
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.46).setStrokeStyle(1, 0xffffff, 0.22);
        const label = this.add.text(0, 0, text, {
            fontSize: this.scale.width < 560 ? '13px' : '15px',
            color: '#f8fafc',
            align: 'center',
            wordWrap: { width: width - 28 },
        }).setOrigin(0.5);
        container.add([bg, label]);
        return container;
    }

    private resolveEndingText(isWinner: boolean, climax?: CardDisplayData, plotTwist?: CardDisplayData): string {
        const primary = isWinner ? climax : (plotTwist || climax);
        const fallback = isWinner
            ? 'El Climax cierra la temporada con un final luminoso. La historia encuentra su resolucion y el publico queda de pie.'
            : 'La historia termina con ecos amargos. El rival impuso su cierre y queda una deuda narrativa para la proxima revancha.';
        const title = primary?.endingTitle || (isWinner ? 'Good Ending' : 'Bad Ending');
        const body = primary?.endingLore || primary?.backstory || fallback;
        const twist = plotTwist && !isWinner ? `\nPlot-Twist: ${plotTwist.endingLore || plotTwist.description}` : '';
        return `${title}\n${body}${twist}`;
    }

    private getReadableWinReason(reason: string): string {
        if (reason === 'surrender') return 'Victoria por abandono';
        if (reason === 'timeout') return 'Victoria por tiempo';
        if (reason === 'draw') return 'Empate total';
        return 'Resultado final';
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
