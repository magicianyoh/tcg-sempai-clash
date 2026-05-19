import Phaser from 'phaser';
import { TimelineBlock } from '../ui/TimelineBlock';
import { CardSprite } from '../ui/CardSprite';
import { FieldSlot, SlotPosition } from '../ui/FieldSlot';
import { CardDetailOverlay, CardInfo } from '../ui/CardDetailOverlay';
import { canPlayCard } from '@tcg/game-engine/rules/validation';
import type {
    LogEntry,
    MatchState,
    PlayerState,
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
    prereqs?: string[];
    requirements?: Array<{
        type: string;
        value?: number;
        cardIds?: string[];
        cardType?: string;
        tag?: string;
        description?: string;
    }>;
    effects?: Array<{
        type: string;
        value?: number;
        target?: 'SELF' | 'OPPONENT';
        description?: string;
    }>;
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

const CARD_DB: Record<string, CardDisplayData> = {};
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
    private viewToggleBtn!: Phaser.GameObjects.Container;
    private turnIndicator!: Phaser.GameObjects.Text;
    private turnCountText!: Phaser.GameObjects.Text;
    private playerTitleText!: Phaser.GameObjects.Text;
    private statText!: Phaser.GameObjects.Text;
    private opponentStatText!: Phaser.GameObjects.Text;
    private fieldThemeOverlay!: Phaser.GameObjects.Graphics;

    private hasReceivedState = false;
    private lastLogIndex = 0;
    private lastActivePlayerId = '';
    private previousFillerByPlayer: Record<string, number> = {};
    private bannerQueue: Array<{ title: string; subtitle?: string; tone: BannerTone }> = [];
    private bannerActive = false;
    private narrativeEntries: string[] = [];
    private narrativePanel: HTMLElement | null = null;
    private narrativeContent: HTMLDivElement | null = null;
    private narrativeToggle: HTMLButtonElement | null = null;
    private narrativeDrawerOpen = false;

    constructor() {
        super('BattleScene');
    }

    create(): void {
        const { width, height } = this.scale;
        this.myUsername = (window as any).username || 'Player';

        this.background = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);
        this.createLayout();
        this.createHUD();
        this.createNarrativeLog();
        this.createViewToggleButton();
        this.createEndTurnButton();
        this.setupDragAndDrop();
        this.setupGlobalEvents();

        this.loadCardCatalog().finally(() => this.connectWebSocket());
        this.scale.on('resize', this.handleResize, this);
    }

    private createLayout(): void {
        const { width, height } = this.scale;
        this.fieldThemeOverlay = this.add.graphics();
        this.boardContainer = this.add.container(this.getBoardX(), this.getBoardY());
        this.handContainer = this.add.container(0, height - 108);
        this.bannerLayer = this.add.container(0, 0).setDepth(2500);
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

        this.statText = this.add.text(18, 18, 'Story: 0\nFiller: 0', {
            fontSize: '14px',
            color: '#ffffff',
            lineSpacing: 5,
        });

        this.opponentStatText = this.add.text(width - 18, 18, 'Rival\nStory: 0\nFiller: 0', {
            fontSize: '13px',
            color: '#aab2c2',
            align: 'right',
            lineSpacing: 4,
        }).setOrigin(1, 0);

        this.hudContainer.add([
            this.playerTitleText,
            this.turnIndicator,
            this.turnCountText,
            this.statText,
            this.opponentStatText,
        ]);
    }

    private createNarrativeLog(): void {
        this.destroyNarrativeLog();

        const panel = document.createElement('aside');
        panel.className = 'anime-log-panel';
        panel.innerHTML = `
            <div class="anime-log-title">Capitulo en curso</div>
            <div class="anime-log-content"></div>
        `;

        const toggle = document.createElement('button');
        toggle.className = 'anime-log-toggle';
        toggle.type = 'button';
        toggle.textContent = 'Log';
        toggle.addEventListener('click', () => {
            this.narrativeDrawerOpen = !this.narrativeDrawerOpen;
            panel.classList.toggle('open', this.narrativeDrawerOpen);
        });

        document.body.appendChild(panel);
        document.body.appendChild(toggle);
        this.narrativePanel = panel;
        this.narrativeContent = panel.querySelector('.anime-log-content') as HTMLDivElement | null;
        this.narrativeToggle = toggle;

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyNarrativeLog());
        this.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroyNarrativeLog());
    }

    private destroyNarrativeLog(): void {
        this.narrativePanel?.remove();
        this.narrativeToggle?.remove();
        this.narrativePanel = null;
        this.narrativeContent = null;
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
        const bg = this.add.rectangle(0, 0, 148, 38, 0x4ecdc4, 0.95).setStrokeStyle(2, 0xffffff);
        const text = this.add.text(0, 0, 'PASAR TURNO', {
            fontSize: '13px',
            color: '#001315',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.endTurnBtn.add([bg, text]);
        this.endTurnBtn.setSize(148, 38);
        this.endTurnBtn.setInteractive({ useHandCursor: true });
        this.endTurnBtn.on('pointerdown', () => this.sendEndTurn());
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

        if (this.isEventType(card.getCardType())) {
            const valid = canPlayCard(this.matchState, this.myPlayerIndex, cardId, {
                blockIndex: currentBlockIndex,
                isEventOrb: true,
            });
            if (valid.ok && block.isEventOrbEmpty()) {
                block.highlightEventOrb(true);
            }
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
            }
        }
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
            this.showCardDetail(cardId);
            return;
        }

        if (this.matchState?.activePlayerId === this.myUsername && blockIndex !== undefined && position) {
            this.sendReturnToHand(blockIndex, position);
            return;
        }

        this.showCardDetail(cardId);
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

    private showCardDetail(startCardId: string): void {
        if (!this.matchState) return;
        const allCards: CardInfo[] = [];
        const viewed = this.getViewedPlayer();
        const blockData = this.getCurrentBlockData(viewed);

        if (this.currentView === 'self') {
            this.handCards.forEach(card => allCards.push(this.getCardDisplayData(card.getCardId())));
        }

        blockData?.slots.forEach(slot => {
            if (slot.cardId) {
                allCards.push(this.getCardDisplayData(slot.cardId));
            }
        });
        if (blockData?.eventSlot) {
            allCards.push(this.getCardDisplayData(blockData.eventSlot));
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
            const response = await fetch('http://localhost:3000/cards');
            const data = await response.json() as { cards?: Record<string, any[]> };
            Object.values(data.cards ?? {}).flat().forEach(card => {
                CARD_DB[card.id] = {
                    id: card.id,
                    name: card.name,
                    type: card.type,
                    cost: card.cost ?? 0,
                    description: card.description ?? card.desc ?? '',
                    backstory: card.backstory,
                    image: card.image,
                    prereqs: card.prereqs ?? [],
                    requirements: card.requirements ?? [],
                    effects: card.effects ?? [],
                    tags: card.tags ?? [],
                };
            });
        } catch (error) {
            console.warn('Card catalog unavailable, using local fallbacks.', error);
        }
    }

    private connectWebSocket(): void {
        const token = (window as any).token;
        this.ws = new WebSocket(`ws://localhost:3000?token=${token}`);
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
                this.updateDisplay();
                this.processAnnouncements(previous, this.matchState!);
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
        this.playerTitleText.setFontSize(this.scale.width < 680 ? 30 : 42);

        const summaryPlayer = this.currentView === 'self' ? opp : me;
        const summaryLabel = this.currentView === 'self' ? 'Rival' : 'Yo';
        this.statText.setText(`Story: ${viewed.storyPoints ?? viewed.historyPoints ?? 0}\nFiller: ${viewed.fillerPoints}`);
        this.opponentStatText.setText(`${summaryLabel}\nStory: ${summaryPlayer.storyPoints ?? summaryPlayer.historyPoints ?? 0}\nFiller: ${summaryPlayer.fillerPoints}`);

        this.viewToggleBtn.setVisible(isMyTurn);
        this.viewToggleBtn.setAlpha(isMyTurn ? 1 : 0.35);
        this.viewToggleBtn.setPosition(this.getActionButtonX(), 108);
        this.updateViewToggleLabel();

        this.endTurnBtn.setPosition(this.getActionButtonX(), 150);
        this.endTurnBtn.setAlpha(isMyTurn && this.currentView === 'self' ? 1 : 0.45);
        this.renderViewedBoard(viewed);
        this.renderHand(me.hand, isMyTurn && this.currentView === 'self');
    }

    private updateViewToggleLabel(): void {
        const label = this.viewToggleBtn.getAll().find(child => child.getData('label') === true) as Phaser.GameObjects.Text | undefined;
        label?.setText(this.currentView === 'self' ? 'VER RIVAL' : 'VER MI CAMPO');
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
        }
    }

    private renderHand(hand: string[], interactive: boolean): void {
        this.handContainer.removeAll(true);
        this.handCards = [];
        this.handContainer.setPosition(0, this.scale.height - 108);

        if (this.currentView === 'opponent') {
            return;
        }

        const playWidth = this.scale.width >= 920 ? this.scale.width - 350 : this.scale.width;
        const cardWidth = Math.min(CardSprite.DEFAULT_WIDTH, Math.max(70, (playWidth - 36) / Math.max(hand.length, 1) - 8));
        const cardHeight = cardWidth * 1.4;
        const spacing = Math.max(4, Math.min(10, cardWidth * 0.09));
        const totalWidth = hand.length * cardWidth + Math.max(0, hand.length - 1) * spacing;
        const startX = (playWidth - totalWidth) / 2;

        hand.forEach((cardId, index) => {
            const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
            const y = 20;
            const cardData = this.getCardDisplayData(cardId);
            const activatable = interactive && this.isEventType(cardData.type) && this.canActivateEventCard(cardId);
            const card = new CardSprite(this, {
                cardId,
                name: cardData.name,
                type: cardData.type,
                cost: cardData.cost,
                description: cardData.description,
                backstory: cardData.backstory,
                x,
                y,
                width: cardWidth,
                height: cardHeight,
                interactive,
                activatable,
            });

            card.on('card-tapped', (id: string, wantsDetail: boolean) => {
                if (wantsDetail || !interactive) {
                    this.showCardDetail(id);
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
                );
            }
        }
        if (data.eventSlot) {
            const cardData = this.getCardDisplayData(data.eventSlot);
            block.placeEvent(data.eventSlot, cardData.name);
        }
    }

    private getViewedPlayer(): PlayerState {
        const index = this.currentView === 'self' ? this.myPlayerIndex : 1 - this.myPlayerIndex;
        return this.matchState!.players[index];
    }

    private getCurrentBlockData(player: PlayerState): TimelineBlockData | undefined {
        return player.board.blocks[player.board.currentBlockIndex] ?? player.board.blocks[player.board.blocks.length - 1];
    }

    private getBoardY(): number {
        const { height } = this.scale;
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

    private getBoardScale(): number {
        const { width, height } = this.scale;
        const playWidth = width >= 920 ? width - 350 : width;
        return Phaser.Math.Clamp(Math.min(playWidth / 470, (height - 230) / 470), 0.64, 1.08);
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
            });
            this.enqueueBanner('CAMBIO DE TURNO', `Turno de ${next.activePlayerId}`, 'turn');
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
                if (prevFiller < 10 && player.fillerPoints >= 10) {
                    this.enqueueBanner('ARCO DE RELLENO', `${player.username} llego a 10 Filler`, 'danger');
                }
                this.previousFillerByPlayer[player.username] = player.fillerPoints;
            });
        }

        const hasTurnLog = newEntries.some(entry => entry.action === 'turn_start');
        if (!hasTurnLog && this.lastActivePlayerId !== next.activePlayerId) {
            this.enqueueBanner('CAMBIO DE TURNO', `Turno de ${next.activePlayerId}`, 'turn');
        }
        this.lastActivePlayerId = next.activePlayerId;
    }

    private announceLogEntry(entry: LogEntry): void {
        switch (entry.action) {
            case 'turn_start':
                this.enqueueBanner('CAMBIO DE TURNO', `Turno de ${entry.player}`, 'turn');
                break;
            case 'play_card': {
                const card = this.findCardFromLog(entry.details);
                if (card?.type === 'FILLER') {
                    this.enqueueBanner('ARCO DE RELLENO', `${entry.player} jugo ${card.name}`, 'danger');
                } else {
                    this.enqueueBanner('CARTA JUGADA', `${entry.player}: ${card?.name ?? entry.details ?? ''}`, 'neutral');
                }
                break;
            }
            case 'event_complete': {
                const card = this.findCardFromLog(entry.details);
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
            case 'victory':
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
                return `El capitulo abre con ${this.escapeHtml(entry.details ?? 'un duelo nuevo')}.`;
            case 'turn_start':
                return `La camara vuelve a ${player}; el turno ${entry.turn} empieza con tension.`;
            case 'play_card':
                return `${player} pone en escena ${cardName}.`;
            case 'event_complete':
                return card?.type === 'EVENT_FINAL'
                    ? `${player} desata ${cardName} y empuja la historia al arco final.`
                    : `${player} conecta las piezas y juega ${cardName}.`;
            case 'return_to_hand':
                return `${player} retira ${cardName} antes de que la escena se cierre.`;
            case 'cpu_decision':
                return `${player} calcula su siguiente corte: ${this.escapeHtml(entry.details ?? '')}.`;
            case 'victory':
                return `${player} alcanza el cierre del episodio.`;
            default:
                return null;
        }
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
        const blockData = this.getCurrentBlockData(player);
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
        const bg = this.add.rectangle(0, 0, Math.min(width * 0.9, 620), 106, 0x000000, 0.88)
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
        const cleanName = details.split('@')[0].trim();
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
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9).setOrigin(0).setDepth(2800);
        this.add.text(width / 2, height / 2 - 44, isWinner ? 'VICTORIA' : 'DERROTA', {
            fontSize: '48px',
            color: isWinner ? '#4ecdc4' : '#e94560',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(2801);
        this.add.text(width / 2, height / 2 + 18, `Razon: ${payload.reason}`, {
            fontSize: '16px',
            color: '#d7dee9',
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
