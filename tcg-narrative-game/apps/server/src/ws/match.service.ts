import { MatchState, PlayerState, BoardState, LogEntry, DeckData, CardData, CardType, TimelineBlock, TimelineSlot } from '@tcg/shared/types';
import { ARCHETYPES, GAME_CONSTANTS, SLOT_POSITIONS } from '@tcg/shared/constants';
import { MatchActionType } from '@tcg/shared/protocol';
import { store } from '../store/memory.store';
import { CARDS } from '@tcg/game-engine/content/cards';
import { canPlayCard, canReturnToHand, evaluateRequirements } from '@tcg/game-engine/rules/validation';
import { resolveEffects } from '@tcg/game-engine/rules/effect';
import { chooseCpuPlay } from './cpu.strategy';

// ============================================
// Match Service
// ============================================

function generateMatchId(): string {
    return 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Apply protagonist draw probability.
 * Returns a shuffled deck with protagonist weighted toward early positions.
 */
function shuffleWithProtagonistBias(cards: string[], turnNumber: number = 0): string[] {
    const protagonists: string[] = [];
    const others: string[] = [];

    for (const cardId of cards) {
        const card = CARDS[cardId];
        if (card?.type === CardType.PROTAGONIST || card?.tags?.includes('protagonist')) {
            protagonists.push(cardId);
        } else {
            others.push(cardId);
        }
    }

    // Shuffle non-protagonist cards
    const shuffledOthers = shuffle(others);

    // Determine protagonist position based on probability
    let probability = GAME_CONSTANTS.PROTAGONIST_DRAW_CHANCE_INITIAL;
    if (turnNumber >= 2 && turnNumber <= 3) {
        probability = GAME_CONSTANTS.PROTAGONIST_DRAW_CHANCE_EARLY;
    } else if (turnNumber > 3) {
        probability = GAME_CONSTANTS.PROTAGONIST_DRAW_CHANCE_LATE;
    }

    // Insert protagonist near the top with given probability
    const result: string[] = [];
    let protagonistPlaced = false;

    for (let i = 0; i < shuffledOthers.length; i++) {
        // Try to place protagonist in first few positions
        if (!protagonistPlaced && protagonists.length > 0 && i < 5) {
            if (Math.random() < probability) {
                result.push(...protagonists);
                protagonists.length = 0;
                protagonistPlaced = true;
            }
        }
        result.push(shuffledOthers[i]);
    }

    // If protagonist wasn't placed yet, append at end
    if (!protagonistPlaced && protagonists.length > 0) {
        result.push(...protagonists);
    }

    return result;
}

/**
 * Create initial empty board state with Phase 2 timeline blocks.
 */
function createInitialBoard(): BoardState {
    const slots: TimelineSlot[] = SLOT_POSITIONS.map(pos => ({
        position: pos as any,
        cardId: undefined,
    }));

    return {
        // Phase 2: Timeline blocks
        blocks: [{
            blockIndex: 0,
            slots: [...slots],
            eventSlot: undefined,
            eventCompleted: false,
        }],
        currentBlockIndex: 0,

        // Legacy compatibility
        characters: [],
        location: undefined,
    };
}

function createPlayerState(username: string, deck: DeckData): PlayerState {
    const shuffledDeck = shuffleWithProtagonistBias([...deck.cards], 0);
    const hand = shuffledDeck.splice(0, GAME_CONSTANTS.INITIAL_HAND_SIZE);

    return {
        id: username,
        username,
        backgroundId: deck.backgroundId,
        deck: shuffledDeck,
        hand,
        discard: [],
        board: createInitialBoard(),
        timeline: [],
        completedEvents: [],

        // Phase 2 points
        storyPoints: 0,
        fillerPoints: 0,

        // Flags
        finalEventPlayed: false,
        canPlayEvents: true,
        eventsBlockedTurns: 0,

        // Legacy compatibility
        historyPoints: 0,
        finalLockTurns: 0,
        isEventsBlocked: false,
        tags: [],
        fillerCount: 0,
    };
}

function createCpuDeck(archetypeId: string, difficulty: CpuDifficulty): DeckData {
    const allCards = Object.values(CARDS).filter(card => card.archetype === archetypeId);

    if (allCards.length === 0) {
        throw new Error(`No cards found for CPU archetype: ${archetypeId}`);
    }

    const cards: string[] = [];
    const counts: Record<string, number> = {};
    const addCard = (card: CardData, copies = 1): boolean => {
        let added = false;
        const maxCopies = card.maxCopies ?? (card.type === CardType.PROTAGONIST ? GAME_CONSTANTS.PROTAGONIST_MAX_COPIES : GAME_CONSTANTS.MAX_COPIES_PER_CARD);

        for (let i = 0; i < copies && cards.length < GAME_CONSTANTS.DECK_SIZE; i++) {
            if ((counts[card.id] || 0) >= maxCopies) break;
            cards.push(card.id);
            counts[card.id] = (counts[card.id] || 0) + 1;
            added = true;
        }

        return added;
    };

    const byType = (type: CardType) => allCards
        .filter(card => card.type === type)
        .sort((a, b) => scoreCpuDeckCard(b, difficulty) - scoreCpuDeckCard(a, difficulty) || a.cost - b.cost || a.id.localeCompare(b.id));

    const protagonist = byType(CardType.PROTAGONIST)[0];
    if (protagonist) addCard(protagonist);

    const finalEvent = byType(CardType.EVENT_FINAL)[0];
    if (finalEvent) addCard(finalEvent);

    const targetComposition: Array<[CardType, number]> = [
        [CardType.EVENT, difficulty === 'easy' ? 4 : 6],
        [CardType.PERSONAJE, 5],
        [CardType.ITEM, 4],
        [CardType.LOCATION, 3],
    ];

    for (const [type, targetCount] of targetComposition) {
        let addedForType = 0;
        for (const card of byType(type)) {
            while (addedForType < targetCount && addCard(card)) {
                addedForType++;
            }
            if (addedForType >= targetCount) break;
        }
    }

    const fallbackPool = [
        ...byType(CardType.EVENT),
        ...byType(CardType.PERSONAJE),
        ...byType(CardType.ITEM),
        ...byType(CardType.LOCATION),
        ...byType(CardType.EVENT_FINAL),
        ...byType(CardType.PROTAGONIST),
    ];

    while (cards.length < GAME_CONSTANTS.DECK_SIZE) {
        const added = fallbackPool.some(card => addCard(card));
        if (!added) break;
    }

    if (cards.length !== GAME_CONSTANTS.DECK_SIZE) {
        throw new Error(`CPU could not build a valid ${GAME_CONSTANTS.DECK_SIZE}-card deck for ${archetypeId}`);
    }

    const now = Date.now();
    return {
        id: `cpu_deck_${archetypeId.toLowerCase()}_${difficulty}_${now}`,
        name: `CPU ${archetypeId} ${difficulty}`,
        archetypeId,
        cards,
        createdAt: now,
        updatedAt: now,
    };
}

function scoreCpuDeckCard(card: CardData, difficulty: CpuDifficulty): number {
    let score = 0;
    if (card.type === CardType.EVENT_FINAL) score += 100;
    if (card.type === CardType.PROTAGONIST) score += 80;
    if (card.effects.some(effect => effect.type === 'VICTORY')) score += 100;
    if (card.effects.some(effect => effect.type === 'STORY')) score += 25;
    if (card.effects.some(effect => effect.type === 'FILLER' && effect.target === 'OPPONENT')) score += difficulty === 'hard' ? 35 : 20;
    if (card.effects.some(effect => effect.type === 'DRAW')) score += 18;
    if (card.affinity?.compatibleWith?.length) score += 12;
    if (card.likesData?.likes?.length) score += 8;
    score += Math.max(0, 5 - card.cost);
    return score;
}

export type CpuDifficulty = 'easy' | 'normal' | 'hard';

export class MatchService {
    // Create a new match
    createMatch(
        p1Username: string,
        p1DeckId: string,
        p2Username: string,
        p2DeckId: string,
        formatId: string
    ): MatchState {
        const matchId = generateMatchId();

        const deck1 = store.getDeck(p1DeckId);
        const deck2 = store.getDeck(p2DeckId);

        if (!deck1 || !deck2) {
            throw new Error('Deck not found');
        }

        const player1 = createPlayerState(p1Username, deck1);
        const player2 = createPlayerState(p2Username, deck2);

        // Randomly decide who goes first
        const firstPlayer = Math.random() < 0.5 ? 0 : 1;

        const match: MatchState = {
            matchId,
            formatId,
            turnNumber: 1,
            currentTurn: firstPlayer as 0 | 1,
            phase: 'main',
            players: [player1, player2],
            playerOrder: [p1Username, p2Username],
            activePlayerId: firstPlayer === 0 ? p1Username : p2Username,
            log: [{
                turn: 1,
                player: 'system',
                action: 'match_started',
                details: `${firstPlayer === 0 ? p1Username : p2Username} goes first`,
                timestamp: Date.now(),
            }],
        };

        store.saveMatch(matchId, match);
        return match;
    }

    createCpuMatch(
        humanUsername: string,
        humanDeckId: string,
        cpuArchetypeId: string,
        difficulty: CpuDifficulty,
        formatId: string
    ): MatchState {
        if (!Object.values(ARCHETYPES).includes(cpuArchetypeId as any)) {
            throw new Error(`Invalid CPU archetype: ${cpuArchetypeId}`);
        }

        const humanDeck = store.getDeck(humanDeckId);
        if (!humanDeck || !store.isUserDeck(humanUsername, humanDeckId)) {
            throw new Error('Invalid human deck');
        }

        const matchId = generateMatchId();
        const cpuUsername = `CPU ${difficulty.toUpperCase()}`;
        const humanPlayer = createPlayerState(humanUsername, humanDeck);
        const cpuPlayer = createPlayerState(cpuUsername, createCpuDeck(cpuArchetypeId, difficulty));

        const match: MatchState = {
            matchId,
            formatId,
            turnNumber: 1,
            currentTurn: 0,
            phase: 'main',
            players: [humanPlayer, cpuPlayer],
            playerOrder: [humanUsername, cpuUsername],
            activePlayerId: humanUsername,
            cpuOpponent: {
                username: cpuUsername,
                archetypeId: cpuArchetypeId,
                difficulty,
            },
            log: [{
                turn: 1,
                player: 'system',
                action: 'cpu_match_started',
                details: `${humanUsername} versus ${cpuUsername} (${cpuArchetypeId})`,
                timestamp: Date.now(),
            }],
        };

        store.saveMatch(matchId, match);
        return match;
    }

    // Process a player action
    processAction(matchId: string, playerId: string, action: any): MatchState {
        const match = store.getMatch(matchId);
        if (!match) throw new Error('Match not found');

        if (match.phase === 'ended') {
            throw new Error('Match has ended');
        }

        if (match.activePlayerId !== playerId) {
            throw new Error('Not your turn');
        }

        const playerIndex = match.playerOrder.indexOf(playerId);
        if (playerIndex === -1) throw new Error('Player not in match');

        const player = match.players[playerIndex];

        switch (action.type) {
            case MatchActionType.PLAY_CARD:
            case 'PLAY_CARD':
                this.handlePlayCard(match, playerIndex, action.cardId, action.slotPosition);
                break;

            case 'ACTIVATE_EVENT':
            case MatchActionType.ACTIVATE_EVENT:
                this.handlePlayCard(match, playerIndex, action.cardId, undefined, true);
                break;

            case 'RETURN_TO_HAND':
            case MatchActionType.RETURN_TO_HAND:
                this.handleReturnToHand(match, playerIndex, action.blockIndex, action.position);
                break;

            case MatchActionType.END_TURN:
            case 'END_TURN':
                this.handleEndTurn(match, playerIndex);
                break;

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }

        // Check victory conditions
        this.checkVictory(match);
        this.processCpuTurnIfNeeded(match);

        store.saveMatch(matchId, match);
        return match;
    }

    private processCpuTurnIfNeeded(match: MatchState): void {
        if (!match.cpuOpponent || match.phase === 'ended' || match.winner) return;
        if (match.activePlayerId !== match.cpuOpponent.username) return;

        const cpuIndex = match.playerOrder.indexOf(match.cpuOpponent.username);
        if (cpuIndex === -1) return;

        const cpu = match.players[cpuIndex];
        const maxPlays = match.cpuOpponent.difficulty === 'hard' ? 3 : match.cpuOpponent.difficulty === 'normal' ? 2 : 1;

        for (let i = 0; i < maxPlays; i++) {
            if (match.winner) break;

            const plan = chooseCpuPlay(match, cpuIndex);
            if (!plan) break;

            this.handlePlayCard(match, cpuIndex, plan.cardId, plan.slotPosition, plan.isEventActivation);
            this.addLog(match, cpu.username, 'cpu_decision', `${CARDS[plan.cardId]?.name || plan.cardId} (${plan.reason})`);

            this.checkVictory(match);
        }

        if (!match.winner && match.activePlayerId === cpu.username) {
            this.handleEndTurn(match, cpuIndex);
            this.checkVictory(match);
        }
    }

    // ============================================
    // Action Logic
    // ============================================

    private handlePlayCard(
        match: MatchState,
        playerIndex: number,
        cardId: string,
        slotPosition?: string,
        isEventActivation: boolean = false
    ) {
        const player = match.players[playerIndex];
        // Find card
        const handIndex = player.hand.indexOf(cardId);
        if (handIndex === -1) throw new Error('Card not in hand');

        // Target Context
        const targetBlockIndex = player.board.currentBlockIndex;
        // Validation Call
        const validation = canPlayCard(match, playerIndex, cardId, {
            blockIndex: targetBlockIndex,
            position: slotPosition,
            isEventOrb: isEventActivation
        });

        if (!validation.ok) {
            throw new Error(validation.reasons?.join(', ') || 'Unknown validation error');
        }

        // Remove from hand
        player.hand.splice(handIndex, 1);

        // Place Visually on Board logic
        // If event activation -> place in event slot
        // If normal card -> place in slot

        const card = CARDS[cardId];

        if (isEventActivation) {
            const block = player.board.blocks[targetBlockIndex];
            if (block) {
                block.eventSlot = cardId;
                block.eventSubmitted = true;
                block.eventCompleted = false;
                this.addLog(match, player.username, 'event_prepared', `${card.name}`);
            }
        } else if (slotPosition) {
            resolveEffects(match, playerIndex, cardId);

            const block = player.board.blocks[targetBlockIndex];
            const slot = block.slots.find(s => s.position === slotPosition);
            if (slot) {
                slot.cardId = cardId;
                slot.cardType = card.type;
                this.addLog(match, player.username, 'play_card', `${card.name} @ ${slotPosition}`);
            }
        }

        // Legacy Sync
        player.historyPoints = player.storyPoints;
    }

    private handleReturnToHand(match: MatchState, playerIndex: number, blockIndex: number, position: string) {
        const validation = canReturnToHand(match, playerIndex, blockIndex, position);
        if (!validation.ok) {
            throw new Error(validation.reasons?.join(', ') || 'Unknown validation error');
        }

        const player = match.players[playerIndex];
        const block = player.board.blocks[blockIndex];
        const slot = block.slots.find(s => s.position === position);

        if (slot && slot.cardId) {
            const cardId = slot.cardId;
            // Remove from board
            slot.cardId = undefined;
            slot.cardType = undefined;

            // Add to hand
            player.hand.push(cardId);

            this.addLog(match, player.username, 'return_to_hand', cardId);
        }
    }

    // End turn
    private handleEndTurn(match: MatchState, currentPlayerIndex: number): void {
        const player = match.players[currentPlayerIndex];
        this.resolvePreparedEvent(match, currentPlayerIndex);

        this.checkVictory(match);
        if (match.winner) return;

        // Decrement blocked turns
        if (player.eventsBlockedTurns > 0) {
            player.eventsBlockedTurns--;
            if (player.eventsBlockedTurns === 0) {
                player.isEventsBlocked = false;
            }
        }

        // Switch
        const nextPlayerIndex = (1 - currentPlayerIndex) as 0 | 1;
        match.currentTurn = nextPlayerIndex;
        match.activePlayerId = match.playerOrder[nextPlayerIndex];
        match.turnNumber++;

        const nextPlayer = match.players[nextPlayerIndex];

        // +2 Story Points per turn
        nextPlayer.storyPoints += GAME_CONSTANTS.STORY_POINTS_PER_TURN;
        nextPlayer.historyPoints = nextPlayer.storyPoints;

        // Filler reduction? Usually no.

        // Draw cards
        const cardsToDraw = Math.min(
            GAME_CONSTANTS.CARDS_DRAWN_PER_TURN,
            nextPlayer.deck.length,
            GAME_CONSTANTS.MAX_HAND_SIZE - nextPlayer.hand.length
        );

        for (let i = 0; i < cardsToDraw; i++) {
            const drawn = nextPlayer.deck.shift();
            if (drawn) nextPlayer.hand.push(drawn);
        }

        this.addLog(match, match.activePlayerId, 'turn_start', `Turn ${match.turnNumber}`);
    }

    private resolvePreparedEvent(match: MatchState, playerIndex: number): void {
        const player = match.players[playerIndex];
        const opponent = match.players[1 - playerIndex];
        const block = player.board.blocks[player.board.currentBlockIndex];
        const cardId = block?.eventSlot;
        if (!block || !cardId || block.eventCompleted) return;

        const card = CARDS[cardId];
        if (!card) return;

        const validation = card.requirements?.length
            ? evaluateRequirements(match, playerIndex, card.requirements)
            : { ok: true, reasons: [] };

        if (!validation.ok) {
            this.addLog(match, player.username, 'event_waiting', `${card.name}: ${validation.reasons?.[0] || 'missing requirements'}`);
            return;
        }

        resolveEffects(match, playerIndex, cardId);

        if (!player.completedEvents) player.completedEvents = [];
        if (!player.completedEvents.includes(cardId)) {
            player.completedEvents.push(cardId);
        }

        block.eventCompleted = true;
        block.eventSubmitted = false;

        const storyGain = 5;
        player.storyPoints += storyGain;
        player.historyPoints = player.storyPoints;
        opponent.fillerPoints += 2;

        this.addLog(match, player.username, 'event_complete', `${card.name}`);

        if (card.type === CardType.EVENT_FINAL) {
            player.finalEventPlayed = true;
        } else {
            this.advanceToNextBlock(player);
        }
    }

    // Check if a block is complete (all slots filled and event done)
    private isBlockComplete(block: TimelineBlock): boolean {
        const allSlotsFilled = block.slots.every(slot => slot.cardId);
        return allSlotsFilled && block.eventCompleted;
    }

    // Advance to next block
    private advanceToNextBlock(player: PlayerState): void {
        const nextIndex = player.board.currentBlockIndex + 1;

        if (nextIndex < GAME_CONSTANTS.MAX_BLOCKS) {
            const slots: TimelineSlot[] = SLOT_POSITIONS.map(pos => ({
                position: pos as any,
                cardId: undefined,
            }));

            player.board.blocks.push({
                blockIndex: nextIndex,
                slots,
                eventSlot: undefined,
                eventCompleted: false,
            });

            player.board.currentBlockIndex = nextIndex;
        }
    }

    // Check victory conditions
    private checkVictory(match: MatchState): void {
        if (match.winner) return;

        for (const player of match.players) {
            const opponent = match.players.find(p => p.username !== player.username)!;

            // Victory by opponent filler (legacy rule)
            if (opponent.fillerPoints >= 10) {
                match.winner = player.username;
                match.winReason = 'opponent_filler';
                match.phase = 'ended';
                this.addLog(match, player.username, 'victory',
                    `${opponent.username} accumulated too much filler!`);
                return;
            }

            // Victory by Final Event (usually explicit, but check here if needed)
            if (player.finalEventPlayed) {
                match.winner = player.username;
                match.winReason = 'final_event';
                match.phase = 'ended';
                return;
            }
        }
    }

    // Add log entry
    private addLog(match: MatchState, player: string, action: string, details?: string): void {
        match.log.push({
            turn: match.turnNumber,
            player,
            action,
            details,
            timestamp: Date.now(),
        });
    }
}

export const matchService = new MatchService();
