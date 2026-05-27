import { BoardState, CardData, CardType, DeckData, EffectType, MatchState, PlayerState, TimelineBlock, TimelineSlot } from '@tcg/shared/types';
import { GAME_CONSTANTS, SLOT_POSITIONS, V2_ARCHETYPES } from '@tcg/shared/constants';
import { MatchActionType } from '@tcg/shared/protocol';
import { CARDS } from '@tcg/game-engine/content/cards';
import { canPlayCard, canReturnToHand, evaluateEventPrerequisites, evaluateRequirements } from '@tcg/game-engine/rules/validation';
import { resolveEffects } from '@tcg/game-engine/rules/effect';
import { store } from '../store/memory.store';
import { chooseCpuPlay } from './cpu.strategy';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';

export type CpuDifficulty = 'easy' | 'normal' | 'hard';
const MATCH_TIMER_SECONDS = 60;
export const TURN_STORY_INCOME = 1;
export const TURN_FILLER_INCOME = 2;

export function grantTurnStoryIncome(match: MatchState): void {
    match.players.forEach(player => {
        player.storyPoints += TURN_STORY_INCOME;
        player.historyPoints = player.storyPoints;
        const fillerEconomy = Boolean(player.protagonistId && CARDS[player.protagonistId]?.costResource === 'FP');
        if (fillerEconomy) player.fillerPoints += TURN_FILLER_INCOME;
        match.log.push({
            turn: match.turnNumber,
            player: player.username,
            action: 'turn_income',
            details: fillerEconomy
                ? `+${TURN_STORY_INCOME} SP y +${TURN_FILLER_INCOME} FP por inicio del turno ${match.turnNumber}.`
                : `+${TURN_STORY_INCOME} SP por inicio del turno ${match.turnNumber}.`,
            timestamp: Date.now(),
        });
    });
}

function generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type RandomSource = () => number;

function shuffle<T>(source: T[], random: RandomSource = Math.random): T[] {
    const value = [...source];
    for (let index = value.length - 1; index > 0; index--) {
        const next = Math.floor(random() * (index + 1));
        [value[index], value[next]] = [value[next], value[index]];
    }
    return value;
}

function findInitialProtagonist(deck: DeckData): CardData {
    const explicit = deck.protagonistId ? CARDS[deck.protagonistId] : undefined;
    if (explicit?.type === CardType.PROTAGONIST && explicit.formIndex === 0) return explicit;
    const fallback = Object.values(CARDS).find(card =>
        card.archetype === deck.archetypeId && card.type === CardType.PROTAGONIST && card.formIndex === 0
    );
    if (!fallback) throw new Error(`Deck ${deck.id} does not define a valid V2 protagonist`);
    return fallback;
}

function createBlock(index: number, protagonistCardId: string): TimelineBlock {
    return {
        blockIndex: index,
        slots: SLOT_POSITIONS.map(position => ({ position: position as TimelineSlot['position'] })),
        eventCompleted: false,
        protagonistCardId,
    };
}

function cardRouteId(card?: CardData): string | undefined {
    return card?.tags?.find(tag => tag.startsWith('route:'))?.slice('route:'.length);
}

function findOpeningEvent(protagonistId: string, deckCardIds?: string[]): CardData | undefined {
    const available = deckCardIds ? new Set(deckCardIds) : undefined;
    return Object.values(CARDS)
        .filter(card => card.protagonistId === protagonistId && card.type === CardType.EVENT && (!available || available.has(card.id)))
        .sort((left, right) => String(left.tags?.find(tag => tag.startsWith('order:')) || '').localeCompare(String(right.tags?.find(tag => tag.startsWith('order:')) || '')))[0];
}

function getOpeningSetupCardIds(protagonistId: string, deckCardIds?: string[]): string[] {
    const openingEvent = findOpeningEvent(protagonistId, deckCardIds);
    if (!openingEvent) return [];
    const requirementIds = (openingEvent.requirements || [])
        .filter(requirement => requirement.type === 'CARD_ON_BOARD')
        .flatMap(requirement => requirement.cardIds || []);
    return Array.from(new Set([openingEvent.id, ...requirementIds]));
}

function removeOne(cards: string[], cardId: string): boolean {
    const index = cards.indexOf(cardId);
    if (index < 0) return false;
    cards.splice(index, 1);
    return true;
}

export function createPlayerState(username: string, deck: DeckData, random: RandomSource = Math.random): PlayerState {
    const protagonist = findInitialProtagonist(deck);
    const remainingCards = [...deck.cards];
    const guidedOpening = random() < GAME_CONSTANTS.OPENING_ARC_CHANCE_INITIAL_HAND;
    const seededOpening = guidedOpening
        ? getOpeningSetupCardIds(protagonist.id, deck.cards).filter(cardId => removeOne(remainingCards, cardId))
        : [];
    const shuffledDeck = shuffle(remainingCards, random);
    const hand = [...seededOpening, ...shuffledDeck.splice(0, GAME_CONSTANTS.INITIAL_HAND_SIZE - seededOpening.length)];
    const board: BoardState = {
        blocks: [createBlock(0, protagonist.id)],
        currentBlockIndex: 0,
        characters: [],
    };
    return {
        id: username,
        username,
        backgroundId: deck.backgroundId,
        deck: shuffledDeck,
        hand,
        discard: [],
        protagonistId: protagonist.id,
        protagonistFormId: protagonist.id,
        protagonistFormIndex: 0,
        protagonistTotalEvents: protagonist.totalForms || 1,
        openingSetupDraws: 0,
        board,
        timeline: [],
        completedEvents: [],
        storyPoints: 0,
        fillerPoints: 0,
        finalEventPlayed: false,
        canPlayEvents: true,
        eventsBlockedTurns: 0,
        statusEffects: [],
        historyPoints: 0,
        finalLockTurns: 0,
        isEventsBlocked: false,
        tags: [],
        fillerCount: 0,
    };
}

function getOpeningDrawChance(player: PlayerState): number {
    const assistedDraws = player.openingSetupDraws || 0;
    if (assistedDraws === 0) return GAME_CONSTANTS.OPENING_ARC_CHANCE_FIRST_DRAW;
    if (assistedDraws === 1) return GAME_CONSTANTS.OPENING_ARC_CHANCE_SECOND_DRAW;
    return GAME_CONSTANTS.OPENING_ARC_CHANCE_LATER_DRAW;
}

function missingOpeningSetupCards(player: PlayerState): string[] {
    const currentBlock = player.board.blocks[player.board.currentBlockIndex];
    const availableNarrativeCards = [
        ...player.deck,
        ...player.hand,
        ...(currentBlock?.eventSlot ? [currentBlock.eventSlot] : []),
        ...player.completedEvents,
    ];
    const openingEvent = player.protagonistId ? findOpeningEvent(player.protagonistId, availableNarrativeCards) : undefined;
    if (!openingEvent || player.completedEvents.includes(openingEvent.id)) return [];
    const staged = new Set([
        ...player.hand,
        ...(currentBlock?.eventSlot ? [currentBlock.eventSlot] : []),
        ...(currentBlock?.slots.flatMap(slot => slot.cardId ? [slot.cardId] : []) || []),
    ]);
    return getOpeningSetupCardIds(player.protagonistId!, availableNarrativeCards)
        .filter(cardId => !staged.has(cardId) && player.deck.includes(cardId));
}

export function drawTurnCards(player: PlayerState, count: number, random: RandomSource = Math.random): string[] {
    const drawn: string[] = [];
    const mayAssistOpening = player.completedEvents.length === 0
        && count > 0
        && player.hand.length < GAME_CONSTANTS.MAX_HAND_SIZE
        && random() < getOpeningDrawChance(player);
    if (mayAssistOpening) {
        const priorityCard = missingOpeningSetupCards(player)[0];
        if (priorityCard && removeOne(player.deck, priorityCard)) {
            player.hand.push(priorityCard);
            drawn.push(priorityCard);
        }
    }
    while (drawn.length < count && player.deck.length > 0 && player.hand.length < GAME_CONSTANTS.MAX_HAND_SIZE) {
        const next = player.deck.shift();
        if (next) {
            player.hand.push(next);
            drawn.push(next);
        }
    }
    player.openingSetupDraws = (player.openingSetupDraws || 0) + 1;
    return drawn;
}

function isEventCard(card?: CardData): boolean {
    return Boolean(card && (
        card.type === CardType.EVENT
        || card.type === CardType.CLIMAX_EVENT
        || card.type === CardType.PLOT_TWIST_EVENT
        || card.type === CardType.EVENT_FINAL
        || card.type === CardType.EVENT_KEY
    ));
}

export function rollHandFillerPenalty(random: RandomSource = Math.random): number {
    const roll = random();
    if (roll < 0.5) return 1;
    if (roll < 0.8) return 2;
    return 3;
}

export function applyHandOngoingEffects(match: MatchState, playerIndex: number, random: RandomSource = Math.random): void {
    const player = match.players[playerIndex];
    player.handEffectTurns ||= {};
    const cardsInHand = new Set(player.hand);

    Object.keys(player.handEffectTurns).forEach(cardId => {
        if (!cardsInHand.has(cardId)) delete player.handEffectTurns![cardId];
    });

    [...cardsInHand].forEach(cardId => {
        const card = CARDS[cardId];
        const decay = card?.effects.find(effect => effect.type === EffectType.HAND_SP_DECAY_PERCENT || effect.type === 'HAND_SP_DECAY_PERCENT');
        if (decay && player.storyPoints > 0) {
            const loss = Math.max(0.1, Number((player.storyPoints * ((decay.value || 5) / 100)).toFixed(1)));
            player.storyPoints = Math.max(0, player.storyPoints - loss);
            player.historyPoints = player.storyPoints;
            match.log.push({
                turn: match.turnNumber,
                player: player.username,
                action: 'effect_resolved',
                details: `${card.name} consume ${loss} SP (Story Points) mientras permanece en su mano.`,
                timestamp: Date.now(),
            });
        }

        const fillerCurse = card?.effects.find(effect =>
            effect.type === EffectType.HAND_RANDOM_FILLER_THEN_DISCARD || effect.type === 'HAND_RANDOM_FILLER_THEN_DISCARD'
        );
        if (!fillerCurse) return;

        const resolvedTurns = (player.handEffectTurns![cardId] || 0) + 1;
        const penalty = rollHandFillerPenalty(random);
        const maximumTurns = Math.max(1, fillerCurse.turns || fillerCurse.value || 3);
        player.fillerPoints += penalty;
        player.handEffectTurns![cardId] = resolvedTurns;
        match.log.push({
            turn: match.turnNumber,
            player: player.username,
            action: 'effect_resolved',
            details: `${card.name} incomoda la historia de ${player.username}: recibe ${penalty} FP (Filler Points). Activacion ${resolvedTurns}/${maximumTurns}.`,
            timestamp: Date.now(),
        });

        if (resolvedTurns < maximumTurns) return;
        const discardIndex = player.hand.indexOf(cardId);
        if (discardIndex >= 0) {
            player.discard.push(player.hand.splice(discardIndex, 1)[0]);
        }
        delete player.handEffectTurns![cardId];
        match.log.push({
            turn: match.turnNumber,
            player: player.username,
            action: 'effect_resolved',
            details: `${card.name} completa su visita y va al Cementerio de ${player.username}.`,
            timestamp: Date.now(),
        });
    });
}

export class MatchService {
    createMatch(
        p1Username: string,
        p1DeckId: string,
        p2Username: string,
        p2DeckId: string,
        formatId: string,
        timerEnabled = false
    ): MatchState {
        const firstDeck = store.getDeck(p1DeckId);
        const secondDeck = store.getDeck(p2DeckId);
        if (!firstDeck || !secondDeck) throw new Error('Deck not found');
        const players = [createPlayerState(p1Username, firstDeck), createPlayerState(p2Username, secondDeck)] as [PlayerState, PlayerState];
        const first = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
        const match = this.createState(formatId, players, first, timerEnabled);
        this.activateInitialProtagonists(match);
        store.saveMatch(match.matchId, match);
        return match;
    }

    createCpuMatch(
        humanUsername: string,
        humanDeckId: string,
        cpuArchetypeId: string,
        difficulty: CpuDifficulty,
        formatId: string,
        timerEnabled = false,
        cpuDeckId?: string
    ): MatchState {
        if (!V2_ARCHETYPES.includes(cpuArchetypeId as any)) throw new Error(`Invalid CPU archetype: ${cpuArchetypeId}`);
        const humanDeck = store.getDeck(humanDeckId);
        if (!humanDeck || !store.isUserDeck(humanUsername, humanDeckId)) throw new Error('Invalid human deck');
        const templates = getPrebuiltDecks({ enabled: true, archetypes: {} }).filter(deck => deck.archetypeId === cpuArchetypeId);
        const template = (cpuDeckId ? templates.find(deck => deck.id === cpuDeckId) : undefined) || templates[0];
        if (!template) throw new Error(`No V2 CPU deck available for ${cpuArchetypeId}`);
        const now = Date.now();
        const cpuDeck: DeckData = {
            id: `cpu_${template.id}_${now}`,
            name: template.name,
            archetypeId: template.archetypeId,
            protagonistId: template.protagonistId,
            cards: [...template.cards],
            backgroundId: template.backgroundId,
            createdAt: now,
            updatedAt: now,
        };
        const cpuUsername = `CPU ${difficulty.toUpperCase()}`;
        const players = [createPlayerState(humanUsername, humanDeck), createPlayerState(cpuUsername, cpuDeck)] as [PlayerState, PlayerState];
        const match = this.createState(formatId, players, 0, timerEnabled);
        match.cpuOpponent = {
            username: cpuUsername,
            archetypeId: template.archetypeId,
            difficulty,
            deckId: template.id,
            protagonistId: template.protagonistId,
        };
        match.log.push({ turn: 1, player: 'system', action: 'cpu_match_started', details: `${humanUsername} versus ${template.protagonistName}`, timestamp: Date.now() });
        this.activateInitialProtagonists(match);
        store.saveMatch(match.matchId, match);
        return match;
    }

    createSimulationMatch(firstDeck: DeckData, secondDeck: DeckData): MatchState {
        const players = [
            createPlayerState(`CPU A - ${firstDeck.name}`, firstDeck),
            createPlayerState(`CPU B - ${secondDeck.name}`, secondDeck),
        ] as [PlayerState, PlayerState];
        const first = (Math.random() < 0.5 ? 0 : 1) as 0 | 1;
        const match = this.createState(GAME_CONSTANTS.DEFAULT_FORMAT, players, first, false);
        this.activateInitialProtagonists(match);
        return match;
    }

    processSimulationTurn(match: MatchState, difficulty: CpuDifficulty): MatchState {
        if (match.phase === 'ended' || match.winner) return match;
        const playerIndex = match.currentTurn;
        const username = match.players[playerIndex].username;
        for (let guard = 0; guard < 20 && !match.winner && match.activePlayerId === username; guard++) {
            const plan = chooseCpuPlay(match, playerIndex, difficulty);
            if (!plan) break;
            this.handlePlayCard(match, playerIndex, plan.cardId, plan.slotPosition, plan.isEventActivation);
            this.addLog(match, username, 'cpu_decision', `${CARDS[plan.cardId]?.name || plan.cardId} (${plan.reason})`);
        }
        if (!match.winner && match.activePlayerId === username) {
            this.handleEndTurn(match, playerIndex, true);
        }
        return match;
    }

    private createState(formatId: string, players: [PlayerState, PlayerState], first: 0 | 1, timerEnabled: boolean): MatchState {
        const match: MatchState = {
            matchId: generateMatchId(),
            formatId,
            turnNumber: 1,
            currentTurn: first,
            phase: 'main',
            players,
            playerOrder: [players[0].username, players[1].username],
            activePlayerId: players[first].username,
            timerEnabled,
            turnStartedAt: Date.now(),
            playerTimers: timerEnabled ? { [players[0].username]: MATCH_TIMER_SECONDS, [players[1].username]: MATCH_TIMER_SECONDS } : undefined,
            actCheckpointsResolved: [],
            log: [{ turn: 1, player: 'system', action: 'match_started', details: `${players[first].username} comienza`, timestamp: Date.now() }],
        };
        grantTurnStoryIncome(match);
        return match;
    }

    private activateInitialProtagonists(match: MatchState): void {
        match.players.forEach((player, index) => {
            const formId = player.protagonistFormId;
            if (!formId) return;
            this.addLog(match, player.username, 'protagonist_enter', CARDS[formId]?.name || formId);
            resolveEffects(match, index, formId, { entryOnly: true })
                .forEach(message => this.addLog(match, player.username, 'effect_resolved', message));
        });
    }

    processAction(matchId: string, playerId: string, action: any): MatchState {
        const match = store.getMatch(matchId);
        if (!match) throw new Error('Match not found');
        if (match.phase === 'ended') throw new Error('Match has ended');
        const playerIndex = match.playerOrder.indexOf(playerId);
        if (playerIndex === -1) throw new Error('Player not in match');
        if (action.type === MatchActionType.FORFEIT || action.type === 'FORFEIT') {
            this.handleForfeit(match, playerIndex);
            store.saveMatch(matchId, match);
            return match;
        }
        if (match.activePlayerId !== playerId) throw new Error('Not your turn');
        this.applyTimerElapsed(match);
        switch (action.type) {
            case MatchActionType.PLAY_CARD:
            case 'PLAY_CARD':
                this.handlePlayCard(match, playerIndex, action.cardId, action.slotPosition, false);
                break;
            case MatchActionType.ACTIVATE_EVENT:
            case 'ACTIVATE_EVENT':
                this.handlePlayCard(match, playerIndex, action.cardId, undefined, true);
                break;
            case MatchActionType.RETURN_TO_HAND:
            case 'RETURN_TO_HAND':
                this.handleReturnToHand(match, playerIndex, action.blockIndex, action.position);
                break;
            case MatchActionType.END_TURN:
            case 'END_TURN':
                this.handleEndTurn(match, playerIndex, true);
                break;
            case MatchActionType.TIMER_EXPIRED:
            case 'TIMER_EXPIRED':
                this.handleEndTurn(match, playerIndex, false);
                break;
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
        this.processCpuTurnIfNeeded(match);
        store.saveMatch(matchId, match);
        return match;
    }

    private handlePlayCard(match: MatchState, playerIndex: number, cardId: string, slotPosition?: string, isEventActivation = false): void {
        const player = match.players[playerIndex];
        const handIndex = player.hand.indexOf(cardId);
        if (handIndex < 0) throw new Error('Card not in hand');
        const blockIndex = player.board.currentBlockIndex;
        const validation = canPlayCard(match, playerIndex, cardId, { blockIndex, position: slotPosition, isEventOrb: isEventActivation });
        if (!validation.ok) throw new Error(validation.reasons?.join(' ') || 'Invalid card play');
        const card = CARDS[cardId];
        this.payCost(player, card);
        player.hand.splice(handIndex, 1);
        if (card.type === CardType.QUICK_EVENT || card.type === CardType.TOKEN) {
            this.consumeQuickEventDiscards(match, player, card);
            this.addLog(match, player.username, 'quick_event_resolved', card.name);
            resolveEffects(match, playerIndex, card.id)
                .forEach(message => this.addLog(match, player.username, 'effect_resolved', message));
            player.discard.push(card.id);
            this.addLog(match, player.username, 'cards_to_cemetery', card.name);
            return;
        }
        const block = player.board.blocks[blockIndex];
        if (isEventActivation) {
            block.eventSlot = cardId;
            block.eventSubmitted = true;
            this.addLog(match, player.username, 'event_prepared', card.name);
        } else {
            const slot = block.slots.find(item => item.position === slotPosition);
            if (!slot) throw new Error('Slot not found');
            slot.cardId = cardId;
            slot.cardType = card.type;
            slot.placedTurn = match.turnNumber;
            this.addLog(match, player.username, 'play_card', `${card.name} @ ${slotPosition}`);
        }
    }

    private consumeQuickEventDiscards(match: MatchState, player: PlayerState, card: CardData): void {
        const count = (card.requirements || [])
            .filter(requirement => requirement.type === 'DISCARD_FROM_HAND')
            .reduce((total, requirement) => total + (requirement.value || 1), 0);
        if (count <= 0) return;
        const discarded: string[] = [];
        for (let index = 0; index < count && player.hand.length; index++) {
            const externalIndex = player.hand.findIndex(cardId => CARDS[cardId]?.tags?.includes('external-only'));
            const discardIndex = externalIndex >= 0 ? externalIndex : this.findSafeQuickEventDiscardIndex(player);
            discarded.push(player.hand.splice(discardIndex, 1)[0]);
        }
        if (discarded.length) {
            player.discard.push(...discarded);
            const names = discarded.map(id => CARDS[id]?.name || id).join(', ');
            this.addLog(match, player.username, 'cards_to_cemetery', `${names} (costo de ${card.name})`);
        }
    }

    private findSafeQuickEventDiscardIndex(player: PlayerState): number {
        const pendingRouteCards = new Set<string>();
        Object.values(CARDS)
            .filter(candidate =>
                candidate.protagonistId === player.protagonistId
                && (candidate.type === CardType.EVENT || candidate.type === CardType.CLIMAX_EVENT)
                && !player.completedEvents.includes(candidate.id)
            )
            .forEach(candidate => {
                pendingRouteCards.add(candidate.id);
                (candidate.requirements || []).forEach(requirement => {
                    (requirement.cardIds || []).forEach(cardId => pendingRouteCards.add(cardId));
                });
            });

        const inHandCounts = player.hand.reduce<Record<string, number>>((counts, cardId) => {
            counts[cardId] = (counts[cardId] || 0) + 1;
            return counts;
        }, {});
        for (let index = player.hand.length - 1; index >= 0; index--) {
            const cardId = player.hand[index];
            if (!pendingRouteCards.has(cardId) || inHandCounts[cardId] > 1) return index;
        }
        return player.hand.length - 1;
    }

    private payCost(player: PlayerState, card: CardData): void {
        if (card.cost <= 0) return;
        if ((card.costResource || 'SP') === 'FP') {
            player.fillerPoints -= card.cost;
        } else {
            player.storyPoints -= card.cost;
            player.historyPoints = player.storyPoints;
        }
    }

    private handleReturnToHand(match: MatchState, playerIndex: number, blockIndex: number, position: string): void {
        const validation = canReturnToHand(match, playerIndex, blockIndex, position);
        if (!validation.ok) throw new Error(validation.reasons?.join(' ') || 'Invalid return');
        const slot = match.players[playerIndex].board.blocks[blockIndex].slots.find(item => item.position === position);
        if (!slot?.cardId) return;
        match.players[playerIndex].hand.push(slot.cardId);
        slot.cardId = undefined;
        slot.cardType = undefined;
        slot.placedTurn = undefined;
        this.addLog(match, match.players[playerIndex].username, 'return_to_hand', 'Carta retirada durante el mismo turno.');
    }

    private handleEndTurn(match: MatchState, playerIndex: number, resolveEvent: boolean): void {
        const player = match.players[playerIndex];
        if (match.phase === 'climax_response') {
            if (resolveEvent) this.resolvePlotTwistIfPrepared(match, playerIndex);
            if (match.pendingClimax) this.finalizeClimax(match);
            return;
        }
        if (resolveEvent) this.resolvePreparedEvent(match, playerIndex);
        if (match.pendingClimax || match.winner) return;
        if (!resolveEvent) this.addLog(match, player.username, 'timer_expired', 'El tiempo termino; el turno pasa.');
        this.passTurn(match, playerIndex);
    }

    private resolvePreparedEvent(match: MatchState, playerIndex: number): void {
        const player = match.players[playerIndex];
        const block = player.board.blocks[player.board.currentBlockIndex];
        const card = block.eventSlot ? CARDS[block.eventSlot] : undefined;
        if (!card || block.eventCompleted) return;
        const validPrereq = evaluateEventPrerequisites(player, card);
        if (!validPrereq.ok) return;
        if (card.type === CardType.CLIMAX_EVENT) {
            const multiplier = this.getClimaxMultiplier(match, playerIndex, card);
            const opponentIndex = (1 - playerIndex) as 0 | 1;
            if (this.canOpenPlotTwist(match, opponentIndex)) {
                match.pendingClimax = { attackerIndex: playerIndex as 0 | 1, responderIndex: opponentIndex, cardId: card.id, multiplier, responseOpen: true };
                match.phase = 'climax_response';
                match.currentTurn = opponentIndex;
                match.activePlayerId = match.players[opponentIndex].username;
                this.offerPlotTwist(match, opponentIndex);
                this.addLog(match, player.username, 'climax_pending', `${card.name} x${multiplier}; el rival puede intentar Plot-Twist.`);
                return;
            }
            match.pendingClimax = { attackerIndex: playerIndex as 0 | 1, responderIndex: opponentIndex, cardId: card.id, multiplier, responseOpen: false };
            this.finalizeClimax(match);
            return;
        }
        this.resolveArc(match, playerIndex, card, 1, true);
    }

    private getClimaxMultiplier(match: MatchState, playerIndex: number, card: CardData): 2 | 4 | 10 {
        let achieved: 2 | 4 | 10 = 2;
        for (const tier of card.climaxTiers || []) {
            if (evaluateRequirements(match, playerIndex, tier.requirements).ok) achieved = tier.multiplier;
        }
        return achieved;
    }

    private canOpenPlotTwist(match: MatchState, responderIndex: 0 | 1): boolean {
        const responder = match.players[responderIndex];
        const attacker = match.players[1 - responderIndex];
        const total = Math.max(1, responder.protagonistTotalEvents || 1);
        return responder.storyPoints < attacker.storyPoints && responder.completedEvents.length / total >= 0.7;
    }

    private offerPlotTwist(match: MatchState, responderIndex: 0 | 1): void {
        const responder = match.players[responderIndex];
        const selectedRoute = [...responder.completedEvents, ...responder.hand, ...responder.deck]
            .map(id => cardRouteId(CARDS[id]))
            .find((route): route is string => Boolean(route));
        const plot = Object.values(CARDS).find(card =>
            card.type === CardType.PLOT_TWIST_EVENT && card.protagonistId === responder.protagonistId
            && (!selectedRoute || cardRouteId(card) === selectedRoute)
        );
        if (plot && !responder.hand.includes(plot.id)) responder.hand.push(plot.id);
        if (plot) this.addLog(match, responder.username, 'plot_twist_offered', plot.name);
    }

    private resolvePlotTwistIfPrepared(match: MatchState, responderIndex: number): void {
        const player = match.players[responderIndex];
        const block = player.board.blocks[player.board.currentBlockIndex];
        const card = block.eventSlot ? CARDS[block.eventSlot] : undefined;
        if (!card || card.type !== CardType.PLOT_TWIST_EVENT) return;
        this.resolveArc(match, responderIndex, card, 1, false);
        this.addLog(match, player.username, 'plot_twist_complete', card.name);
    }

    private finalizeClimax(match: MatchState): void {
        const pending = match.pendingClimax;
        if (!pending) return;
        const card = CARDS[pending.cardId];
        if (!card) return;
        this.resolveArc(match, pending.attackerIndex, card, pending.multiplier, false);
        this.addLog(match, match.players[pending.attackerIndex].username, 'climax_complete', `${card.name} x${pending.multiplier}`);
        match.pendingClimax = undefined;
        const [first, second] = match.players;
        const firstNet = first.storyPoints - first.fillerPoints;
        const secondNet = second.storyPoints - second.fillerPoints;
        if (firstNet === secondNet && first.fillerPoints === second.fillerPoints) {
            match.winner = 'Empate';
            match.winReason = 'draw';
        } else if (firstNet > secondNet || (firstNet === secondNet && first.fillerPoints < second.fillerPoints)) {
            match.winner = first.username;
            match.winReason = 'climax';
        } else {
            match.winner = second.username;
            match.winReason = 'climax';
        }
        match.phase = 'ended';
        this.addLog(match, 'system', 'victory', `${match.winner} cierra la partida. SP - FP: ${first.username} ${firstNet}, ${second.username} ${secondNet}.`);
    }

    private resolveArc(match: MatchState, playerIndex: number, card: CardData, eventMultiplier: number, openNextArc: boolean): void {
        const player = match.players[playerIndex];
        const block = player.board.blocks[player.board.currentBlockIndex];
        const sceneCards = block.slots.map(slot => slot.cardId).filter((id): id is string => Boolean(id));
        resolveEffects(match, playerIndex, card.id, { multiplier: eventMultiplier })
            .forEach(message => this.addLog(match, player.username, 'effect_resolved', message));
        sceneCards.forEach(cardId => resolveEffects(match, playerIndex, cardId)
            .forEach(message => this.addLog(match, player.username, 'effect_resolved', message)));
        if (player.protagonistFormId) {
            const silence = player.statusEffects?.find(effect => effect.type === 'SILENCE_PROTAGONIST_NEXT_EVENT');
            const protection = player.statusEffects?.find(effect => effect.type === 'PROTECT_PROTAGONIST');
            if (silence && protection) {
                player.statusEffects = (player.statusEffects || []).filter(effect => effect.id !== silence.id && effect.id !== protection.id);
                this.addLog(match, player.username, 'effect_resolved', `${CARDS[player.protagonistFormId]?.name || 'El Protagonista'} resiste el silencio gracias a ${protection.sourceName}.`);
                resolveEffects(match, playerIndex, player.protagonistFormId)
                    .forEach(message => this.addLog(match, player.username, 'effect_resolved', message));
            } else if (silence) {
                player.statusEffects = (player.statusEffects || []).filter(effect => effect.id !== silence.id);
                this.addLog(match, player.username, 'effect_resolved', `${CARDS[player.protagonistFormId]?.name || 'El Protagonista'} queda silenciado y no activa efectos en este Evento.`);
            } else {
                resolveEffects(match, playerIndex, player.protagonistFormId)
                    .forEach(message => this.addLog(match, player.username, 'effect_resolved', message));
            }
        }
        if (!player.completedEvents.includes(card.id)) player.completedEvents.push(card.id);
        block.eventCompleted = true;
        block.eventSubmitted = false;
        this.evolveProtagonist(player);
        this.consumeReducedRequirement(player);
        this.addLog(match, player.username, card.type === CardType.CLIMAX_EVENT ? 'climax_revealed' : 'event_complete', card.name);
        if (openNextArc && card.type === CardType.EVENT) {
            const next = player.board.currentBlockIndex + 1;
            player.board.blocks.push(createBlock(next, player.protagonistFormId || player.protagonistId || ''));
            player.board.currentBlockIndex = next;
        }
    }

    private evolveProtagonist(player: PlayerState): void {
        const nextIndex = Math.min((player.protagonistTotalEvents || 1) - 1, Math.max(0, player.completedEvents.length - 1));
        const nextForm = Object.values(CARDS).find(card =>
            card.type === CardType.PROTAGONIST && card.protagonistId === player.protagonistId && card.formIndex === nextIndex
        );
        if (!nextForm) return;
        player.protagonistFormId = nextForm.id;
        player.protagonistFormIndex = nextIndex;
    }

    private passTurn(match: MatchState, playerIndex: number): void {
        const next = (1 - playerIndex) as 0 | 1;
        match.currentTurn = next;
        match.activePlayerId = match.players[next].username;
        match.turnNumber++;
        match.turnStartedAt = Date.now();
        grantTurnStoryIncome(match);
        const extra = this.consumeExtraDraw(match.players[next]);
        drawTurnCards(match.players[next], GAME_CONSTANTS.CARDS_DRAWN_PER_TURN + extra);
        applyHandOngoingEffects(match, next);
        this.tickStatusEffects(match.players[playerIndex]);
        this.addLog(match, match.activePlayerId, 'turn_start', `Turno ${match.turnNumber}`);
    }

    private processCpuTurnIfNeeded(match: MatchState): void {
        if (!match.cpuOpponent || match.phase === 'ended' || match.activePlayerId !== match.cpuOpponent.username) return;
        const cpuIndex = match.playerOrder.indexOf(match.cpuOpponent.username);
        if (cpuIndex < 0) return;
        for (let guard = 0; guard < 20 && !match.winner && match.activePlayerId === match.cpuOpponent.username; guard++) {
            const plan = chooseCpuPlay(match, cpuIndex);
            if (!plan) break;
            this.handlePlayCard(match, cpuIndex, plan.cardId, plan.slotPosition, plan.isEventActivation);
            this.addLog(match, match.cpuOpponent.username, 'cpu_decision', CARDS[plan.cardId]?.name || plan.cardId);
        }
        if (!match.winner && match.activePlayerId === match.cpuOpponent.username) this.handleEndTurn(match, cpuIndex, true);
    }

    private handleForfeit(match: MatchState, playerIndex: number): void {
        const winner = match.players[1 - playerIndex];
        match.winner = winner.username;
        match.winReason = 'surrender';
        match.phase = 'ended';
        this.addLog(match, match.players[playerIndex].username, 'forfeit', `${winner.username} gana por abandono.`);
    }

    private applyTimerElapsed(match: MatchState): void {
        if (!match.timerEnabled || !match.playerTimers || !match.turnStartedAt) return;
        const elapsed = Math.max(0, Math.floor((Date.now() - match.turnStartedAt) / 1000));
        match.playerTimers[match.activePlayerId] = Math.max(0, (match.playerTimers[match.activePlayerId] ?? MATCH_TIMER_SECONDS) - elapsed);
        match.turnStartedAt = Date.now();
    }

    private consumeExtraDraw(player: PlayerState): number {
        let extra = 0;
        player.statusEffects = (player.statusEffects || []).filter(effect => {
            if (effect.type !== EffectType.EXTRA_DRAW_NEXT_TURN && effect.type !== 'EXTRA_DRAW_NEXT_TURN') return true;
            extra += Math.max(1, effect.value || 1);
            return false;
        });
        return extra;
    }

    private consumeReducedRequirement(player: PlayerState): void {
        let removed = false;
        player.statusEffects = (player.statusEffects || []).filter(effect => {
            if (!removed && effect.type === 'NEXT_EVENT_REDUCE_REQUIREMENT') {
                removed = true;
                return false;
            }
            return true;
        });
    }

    private tickStatusEffects(player: PlayerState): void {
        player.statusEffects = (player.statusEffects || [])
            .map(effect => ({ ...effect, turnsRemaining: effect.turnsRemaining - 1 }))
            .filter(effect => effect.turnsRemaining > 0);
    }

    private addLog(match: MatchState, player: string, action: string, details?: string): void {
        match.log.push({ turn: match.turnNumber, player, action, details, timestamp: Date.now() });
    }
}

export const matchService = new MatchService();
