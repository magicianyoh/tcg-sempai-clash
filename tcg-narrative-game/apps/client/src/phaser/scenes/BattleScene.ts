import Phaser from 'phaser';
import { TimelineBlock } from '../ui/TimelineBlock';
import { CardSprite } from '../ui/CardSprite';
import { FieldSlot, SlotPosition } from '../ui/FieldSlot';
import { CardDetailOverlay, CardInfo } from '../ui/CardDetailOverlay';
import { canPlayCard } from '@tcg/game-engine/rules/validation';

// ============================================
// Types
// ============================================

interface MatchState {
    matchId: string;
    turnNumber: number;
    currentTurn: 0 | 1;
    phase: string;
    players: [PlayerState, PlayerState];
    playerOrder: [string, string];
    activePlayerId: string;
    winner?: string;
    winReason?: string;
    log: LogEntry[];
}

interface PlayerState {
    username: string;
    hand: string[];
    board: BoardState;
    timeline: TimelineNode[];
    storyPoints: number;
    fillerPoints: number;
    historyPoints: number;
    completedEvents?: string[];
    canPlayEvents?: boolean;
}

interface BoardState {
    blocks: TimelineBlockData[];
    currentBlockIndex: number;
    characters: string[];
    location?: string;
}

interface TimelineBlockData {
    blockIndex: number;
    slots: { position: string; cardId?: string; cardType?: string }[];
    eventSlot?: string;
    eventCompleted: boolean;
}

interface TimelineNode {
    cardId: string;
    turn: number;
    resolved: boolean;
}

interface LogEntry {
    turn: number;
    player: string;
    action: string;
    details?: string;
}

// Minimal card data for display
interface CardDisplayData {
    id: string;
    name: string;
    type: string;
    cost: number;
    description: string;
    backstory?: string;
    prerequisites?: string[]; // Added for event logic validation
}

// Card database (simplified)
const CARD_DB: Record<string, CardDisplayData> = {};

// ============================================
// Battle Scene
// ============================================

export class BattleScene extends Phaser.Scene {
    private ws: WebSocket | null = null;
    private matchState: MatchState | null = null;
    private myUsername: string = '';
    private myPlayerIndex: number = 0;

    // Layout containers
    private leftTimelineContainer!: Phaser.GameObjects.Container;
    private rightTimelineContainer!: Phaser.GameObjects.Container;
    private handContainer!: Phaser.GameObjects.Container;
    private hudContainer!: Phaser.GameObjects.Container;

    // Timeline blocks
    private myBlocks: TimelineBlock[] = [];
    private opponentBlocks: TimelineBlock[] = [];

    // Hand cards
    private handCards: CardSprite[] = [];

    // UI elements
    private endTurnBtn!: Phaser.GameObjects.Container;
    private turnIndicator!: Phaser.GameObjects.Text;
    private myStoryText!: Phaser.GameObjects.Text;
    private myFillerText!: Phaser.GameObjects.Text;
    private oppStoryText!: Phaser.GameObjects.Text;
    private oppFillerText!: Phaser.GameObjects.Text;
    private turnCountText!: Phaser.GameObjects.Text;

    constructor() {
        super('BattleScene');
    }

    create() {
        const { width, height } = this.scale;
        this.myUsername = (window as any).username || 'Player';

        // Background
        this.add.rectangle(0, 0, width, height, 0x0a0a0f).setOrigin(0);

        // Create layout
        this.createLayout();
        this.createHUD();
        this.createEndTurnButton();
        this.setupDragAndDrop();
        this.setupGlobalEvents();

        // Connect
        this.connectWebSocket();

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    private createLayout(): void {
        const { width, height } = this.scale;
        const timelineY = height * 0.45;
        const handY = height - 100;

        // Labels
        this.add.text(width * 0.25, 20, 'JUGADOR 1', {
            fontSize: '14px', color: '#ffffff',
        }).setOrigin(0.5);

        this.add.text(width * 0.75, 20, 'JUGADOR 2', {
            fontSize: '14px', color: '#ffffff',
        }).setOrigin(0.5);

        // Divider
        this.add.line(width / 2, 0, 0, 40, 0, height - 130, 0x444444).setOrigin(0);

        // Hand
        this.add.text(width / 2, handY - 20, 'MANO', {
            fontSize: '12px', color: '#666666',
        }).setOrigin(0.5);

        // Containers
        this.leftTimelineContainer = this.add.container(width * 0.25, timelineY);
        this.rightTimelineContainer = this.add.container(width * 0.75, timelineY);
        this.handContainer = this.add.container(0, handY);

        // Initial blocks
        this.createInitialBlocks();
    }

    private createInitialBlocks(): void {
        const leftBlock = new TimelineBlock(this, {
            x: 0, y: 0, blockIndex: 0, scale: 1.0, isPlayerBlock: true,
        });
        this.leftTimelineContainer.add(leftBlock);
        this.myBlocks.push(leftBlock);

        const rightBlock = new TimelineBlock(this, {
            x: 0, y: 0, blockIndex: 0, scale: 1.0, isPlayerBlock: false,
        });
        this.rightTimelineContainer.add(rightBlock);
        this.opponentBlocks.push(rightBlock);
    }

    private createHUD(): void {
        const { width, height } = this.scale;
        this.hudContainer = this.add.container(0, 0);

        this.turnIndicator = this.add.text(width / 2, 50, 'Conectando...', {
            fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.hudContainer.add(this.turnIndicator);

        this.turnCountText = this.add.text(width / 2, 75, 'Turno 1', {
            fontSize: '12px', color: '#888888',
        }).setOrigin(0.5);
        this.hudContainer.add(this.turnCountText);

        const statsY = height - 150;

        // Player
        this.myStoryText = this.add.text(60, statsY, '📜 Story: 0', { fontSize: '12px', color: '#4ecdc4' });
        this.myFillerText = this.add.text(60, statsY + 20, '📺 Filler: 0', { fontSize: '12px', color: '#e94560' });
        this.hudContainer.add([this.myStoryText, this.myFillerText]);

        // Opponent
        this.oppStoryText = this.add.text(width - 120, statsY, '📜 Story: 0', { fontSize: '12px', color: '#4ecdc4' });
        this.oppFillerText = this.add.text(width - 120, statsY + 20, '📺 Filler: 0', { fontSize: '12px', color: '#e94560' });
        this.hudContainer.add([this.oppStoryText, this.oppFillerText]);
    }

    private createEndTurnButton(): void {
        const { width, height } = this.scale;
        this.endTurnBtn = this.add.container(width / 2, height - 40);

        const bg = this.add.rectangle(0, 0, 140, 40, 0x4ecdc4, 0.9).setStrokeStyle(2, 0x44a08d);
        const text = this.add.text(0, 0, 'PASAR TURNO', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

        this.endTurnBtn.add([bg, text]);
        this.endTurnBtn.setSize(140, 40);
        this.endTurnBtn.setInteractive({ useHandCursor: true });
        this.endTurnBtn.on('pointerdown', () => this.sendEndTurn());
    }

    private setupDragAndDrop(): void {
        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: any, dragX: number, dragY: number) => {
            if (gameObject instanceof CardSprite) {
                gameObject.x = dragX;
                gameObject.y = dragY;
            }
        });

        this.input.on('dragenter', (pointer: Phaser.Input.Pointer, gameObject: any, dropZone: any) => {
            if (dropZone.getData('isSlot')) {
                const slot = dropZone.gameObject as FieldSlot; // Note: dropZone is the container
                if (slot && (slot as any).highlightValid) {
                    (slot as any).highlightValid();
                }
            }
        });

        this.input.on('dragleave', (pointer: Phaser.Input.Pointer, gameObject: any, dropZone: any) => {
            if ((dropZone as any).resetHighlight) {
                (dropZone as any).resetHighlight();
            }
        });

        this.input.on('drop', (pointer: Phaser.Input.Pointer, gameObject: any, dropZone: any) => {
            if (gameObject instanceof CardSprite) {
                this.handleCardDrop(gameObject, dropZone);
                if ((dropZone as any).resetHighlight) {
                    (dropZone as any).resetHighlight();
                }
            }
        });

        this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: any, dropped: boolean) => {
            if (!dropped && gameObject instanceof CardSprite) {
                // Shake effect on return
                this.tweens.add({
                    targets: gameObject,
                    x: { from: gameObject.x - 5, to: gameObject.x + 5 },
                    duration: 50,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => gameObject.resetPosition()
                });
            }
        });
    }

    private setupGlobalEvents(): void {
        this.events.on('card-clicked', this.handleFieldCardClick, this);
    }

    // ============================================
    // Logic Integration
    // ============================================

    private handleCardDrop(card: CardSprite, dropZone: Phaser.GameObjects.GameObject): void {
        if (!this.matchState || this.matchState.activePlayerId !== this.myUsername) {
            card.resetPosition();
            return;
        }

        const cardId = card.getCardId();
        const dropData = {
            blockIndex: this.matchState.players[this.myPlayerIndex].board.currentBlockIndex,
            position: dropZone.getData('slotPosition'),
            isEventOrb: dropZone.getData('isEventOrb') === true
        };

        // Check Play via Engine
        const valid = canPlayCard(this.matchState, this.myPlayerIndex, cardId, dropData);

        if (!valid.ok) {
            this.showFeedback(card.x, card.y, valid.reasons[0]);
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

    private handleFieldCardClick(cardId: string): void {
        // Since event doesn't pass shift status or slot, we need to adapt 
        // to CardSprite's emitted: card-tapped(cardId, isShift) if we modify generic emission?
        // Wait, TimelineBlock emits 'card-clicked'.
        // My recent change was only to CardSprite.
        // TimelineBlock should also forward shift key status if possible, but 
        // TimelineBlock logic for `cardBg.on('pointerdown')` was simple.
        // I will assume for now it opens detail.
        // For 'Return to Hand', we need slot context.
        // Let's assume TimelineBlock needs update to pass context, OR we handle return via separate double click?
        // Requirement: "Click normal -> Return", "Shift+Click -> Info".

        // I can't update TimelineBlock easily now without risking more edits.
        // Let's use the 'Shift+Click' logic I added to CardSprite for HAND interaction.
        // For FIELD, I'll default to Info for now unless I can detect Shift globally.

        const activePointer = this.input.activePointer;
        const isShift = activePointer.event.shiftKey;

        if (isShift) {
            this.showCardDetail(cardId);
        } else {
            // Try to return to hand (Field Card)
            // But we don't know which slot from just cardId easily without search.
            // Let's search my board.
            const slot = this.findSlotWithCard(cardId);
            if (slot) {
                // Found it. Try return.
                this.sendReturnToHand(slot.blockIndex, slot.position);
            } else {
                // Not on board (orb?), show info
                this.showCardDetail(cardId);
            }
        }
    }

    private findSlotWithCard(cardId: string): { blockIndex: number, position: string } | null {
        if (!this.matchState) return null;
        const me = this.matchState.players[this.myPlayerIndex];

        for (const block of me.board.blocks) {
            for (const slot of block.slots) {
                if (slot.cardId === cardId) {
                    return { blockIndex: block.blockIndex, position: slot.position };
                }
            }
        }
        return null;
    }

    private showFeedback(x: number, y: number, message: string): void {
        const text = this.add.text(x, y - 50, message, {
            fontSize: '14px',
            color: '#ff0000',
            fontStyle: 'bold',
            backgroundColor: '#000000',
            padding: { x: 5, y: 5 }
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: y - 80,
            alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy()
        });
    }

    // ============================================
    // Card Navigation & Detail
    // ============================================

    private showCardDetail(startCardId: string): void {
        // Collect all cards (Hand + Board)
        const allCards: CardInfo[] = [];

        // 1. Hand
        this.handCards.forEach(c => {
            allCards.push({
                id: c.getCardId(),
                name: c.getCardName(),
                type: c.getCardType(),
                cost: c.getCost(),
                description: (c as any).cardDescription,
                backstory: (c as any).cardBackstory
            });
        });

        // 2. Board
        this.myBlocks.forEach(b => {
            const slotsData = b.getSlotsData();
            slotsData.forEach(s => {
                if (s.cardId) {
                    const d = this.getCardDisplayData(s.cardId);
                    allCards.push(d);
                }
            });
            const orb = b.getEventOrb();
            if (orb && !b.isEventOrbEmpty()) {
                const eid = orb.getData('cardId');
                if (eid) allCards.push(this.getCardDisplayData(eid));
            }
        });

        const index = allCards.findIndex(c => c.id === startCardId);

        new CardDetailOverlay(this, {
            cards: allCards,
            startIndex: index !== -1 ? index : 0,
            onClose: () => { }
        });
    }

    // ============================================
    // Event Logic (Conditional Glow)
    // ============================================

    private highlightActivatableEvents(me: PlayerState): void {
        const canPlayGlobal = me.canPlayEvents !== false && me.fillerPoints < 10;
        let anyEventActivatable = false;

        // This is purely visual. Actual validation is in handleCardDrop via engine.
        // We can reuse 'canPlayCard' logic here roughly.

        for (const card of this.handCards) {
            const type = card.getCardType();
            if ((type === 'EVENT' || type === 'EVENT_KEY' || type === 'EVENT_FINAL') && canPlayGlobal) {
                // Check engine requirement
                const valid = canPlayCard(this.matchState!, this.myPlayerIndex, card.getCardId(), { isEventOrb: true });

                if (valid.ok) {
                    card.setActivatable(true);
                    anyEventActivatable = true;
                } else {
                    card.setActivatable(false);
                }
            } else {
                card.setActivatable(false);
            }
        }

        if (this.myBlocks.length > 0) {
            const currentBlock = this.myBlocks[this.myBlocks.length - 1];
            if (currentBlock.isEventOrbEmpty()) {
                if (anyEventActivatable) currentBlock.startGlow();
                else currentBlock.stopGlow();
            } else {
                currentBlock.stopGlow();
            }
        }
    }

    // ============================================
    // WebSocket
    // ============================================

    private connectWebSocket(): void {
        const token = (window as any).token;
        this.ws = new WebSocket(`ws://localhost:3000?token=${token}`);
        this.ws.onopen = () => { this.requestMatchState(); };
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            this.handleMessage(msg);
        };
        this.ws.onerror = () => { this.turnIndicator.setText('Error de conexión!'); };
    }

    private handleMessage(msg: { type: string; payload: any }): void {
        switch (msg.type) {
            case 'MATCH_STATE':
                this.matchState = msg.payload.matchState;
                this.updateDisplay();
                break;
            case 'MATCH_ENDED':
                this.showGameOver(msg.payload);
                break;
            case 'ERROR':
                console.error('Server error:', msg.payload.message);
                if (this.matchState) this.updateDisplay(); // Resync
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
        if (!this.matchState) return;
        this.ws?.send(JSON.stringify({
            type: 'MATCH_ACTION',
            payload: { matchId: this.matchState.matchId, action: { type: 'END_TURN' } },
        }));
    }

    // ============================================
    // Display Update
    // ============================================

    private updateDisplay(): void {
        if (!this.matchState) return;
        this.myPlayerIndex = this.matchState.playerOrder.indexOf(this.myUsername);
        if (this.myPlayerIndex === -1) this.myPlayerIndex = 0;
        const me = this.matchState.players[this.myPlayerIndex];
        const opp = this.matchState.players[1 - this.myPlayerIndex];
        const isMyTurn = this.matchState.activePlayerId === this.myUsername;

        this.turnIndicator.setText(isMyTurn ? '⚔️ TU TURNO' : '⏳ Turno del oponente');
        this.turnIndicator.setColor(isMyTurn ? '#4ecdc4' : '#888888');
        this.turnCountText.setText(`Turno ${this.matchState.turnNumber}`);

        this.myStoryText.setText(`📜 Story: ${me.storyPoints ?? me.historyPoints ?? 0}`);
        this.myFillerText.setText(`📺 Filler: ${me.fillerPoints}`);
        this.oppStoryText.setText(`📜 Story: ${opp.storyPoints ?? opp.historyPoints ?? 0}`);
        this.oppFillerText.setText(`📺 Filler: ${opp.fillerPoints}`);

        this.renderHand(me.hand, isMyTurn);
        this.updateTimelineBlocks(me, opp);
        this.endTurnBtn.setAlpha(isMyTurn ? 1 : 0.5);

        if (isMyTurn) this.highlightActivatableEvents(me);
    }

    private renderHand(hand: string[], isMyTurn: boolean): void {
        this.handCards.forEach(c => c.destroy());
        this.handCards = [];

        const { width } = this.scale;
        const cardWidth = CardSprite.DEFAULT_WIDTH;
        const spacing = 10;
        const totalWidth = hand.length * (cardWidth + spacing) - spacing;
        const startX = (width - totalWidth) / 2;

        hand.forEach((cardId, index) => {
            const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
            const y = 80;

            const cardData = this.getCardDisplayData(cardId);
            const card = new CardSprite(this, {
                cardId,
                name: cardData.name,
                type: cardData.type,
                cost: cardData.cost,
                description: cardData.description,
                backstory: cardData.backstory,
                x,
                y,
                interactive: isMyTurn,
            });

            // Listen for the specific tap event (from CardSprite logic)
            card.on('card-tapped', (id: string, isShift: boolean) => {
                if (isShift) {
                    this.showCardDetail(id);
                } else {
                    // Tap on hand card -> Select/Inspect (Standard tap behaviour)
                    // Currently does nothing as drag is main interaction
                }
            });

            this.handContainer.add(card);
            this.handCards.push(card);
        });
    }

    private updateTimelineBlocks(me: PlayerState, opp: PlayerState): void {
        if (me.board.blocks) {
            for (const blockData of me.board.blocks) {
                const block = this.myBlocks[blockData.blockIndex];
                if (block) this.syncBlockWithState(block, blockData);
            }
        }
        if (opp.board && opp.board.blocks) {
            for (const blockData of opp.board.blocks) {
                const block = this.opponentBlocks[blockData.blockIndex];
                if (block) this.syncBlockWithState(block, blockData);
            }
        }
    }

    private syncBlockWithState(block: TimelineBlock, data: TimelineBlockData): void {
        for (const slotData of data.slots) {
            const slot = block.getSlot(slotData.position as SlotPosition);
            if (slot && !slot.isEmpty()) {
                continue;
            }

            if (slotData.cardId) {
                const cardData = this.getCardDisplayData(slotData.cardId);
                block.placeCard(
                    slotData.position as SlotPosition,
                    slotData.cardId,
                    cardData.name,
                    slotData.cardType || cardData.type
                );
            }
        }
        if (data.eventSlot && block.isEventOrbEmpty()) {
            const cardData = this.getCardDisplayData(data.eventSlot);
            block.placeEvent(data.eventSlot, cardData.name);
        }
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
            description: 'Efecto de ' + name,
            backstory: '...',
            prerequisites: []
        };
    }

    private inferType(cardId: string): string {
        if (cardId.includes('protagonist')) return 'PROTAGONIST';
        if (cardId.includes('interest') || cardId.includes('teammate') || cardId.includes('friend')) return 'PERSONAJE';
        if (cardId.includes('final')) return 'EVENT_FINAL';
        if (cardId.includes('training') || cardId.includes('tournament') || cardId.includes('arc')) return 'EVENT';
        if (cardId.includes('filler')) return 'FILLER';
        if (cardId.includes('dojo') || cardId.includes('school') || cardId.includes('arena')) return 'LOCATION';
        return 'PERSONAJE';
    }

    private showGameOver(payload: { winner: string; reason: string }): void {
        const { width, height } = this.scale;
        const isWinner = payload.winner === this.myUsername;
        this.add.rectangle(0, 0, width, height, 0x000000, 0.85).setOrigin(0);
        this.add.text(width / 2, height / 2 - 50, isWinner ? '🎉 ¡VICTORIA!' : '💀 DERROTA', { fontSize: '48px', color: isWinner ? '#4ecdc4' : '#e94560', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(width / 2, height / 2 + 20, `Razón: ${payload.reason}`, { fontSize: '16px', color: '#888888' }).setOrigin(0.5);
    }

    private handleResize(): void { }
    update(): void { }
}
