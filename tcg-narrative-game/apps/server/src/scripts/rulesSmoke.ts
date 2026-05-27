import { CARDS } from '@tcg/game-engine/content/cards';
import { resolveEffects } from '@tcg/game-engine/rules/effect';
import { canPlayCard, canReturnToHand } from '@tcg/game-engine/rules/validation';
import { CardType, DeckData, EffectType, MatchState, PlayerState, TimelineSlot } from '@tcg/shared/types';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { applyHandOngoingEffects, createPlayerState, drawTurnCards, grantTurnStoryIncome, rollHandFillerPenalty, TURN_FILLER_INCOME, TURN_STORY_INCOME } from '../ws/match.service';

const heroId = 'shonen-hero-dragon-ryu';
const itemId = `${heroId}-item-dragon-gauntlet`;
const firstEventId = `${heroId}-event-first-challenge`;
const climaxId = `${heroId}-climax-dragon-comet`;
const plotTwistId = `${heroId}-plot-rival-stands`;
const quickDrawId = 'shonen-token-commercial-break';
const quickComboId = 'shonen-token-training-montage';
const demonLordId = 'isekai-external-demon-lord-gouki';
const fillerHeroId = 'mecha-hero-unit09-shin';
const openingFillerIds = [
    quickDrawId,
    quickComboId,
    'shonen-token-misunderstanding',
    'shonen-token-recap',
    'shonen-token-rival-cut-in',
];

function slots(): TimelineSlot[] {
    return ['top', 'left', 'right', 'bottom'].map(position => ({ position } as TimelineSlot));
}

function player(username: string): PlayerState {
    return {
        id: username,
        username,
        deck: [itemId, firstEventId],
        hand: [itemId, firstEventId],
        discard: [],
        board: { blocks: [{ blockIndex: 0, protagonistCardId: heroId, slots: slots(), eventCompleted: false }], currentBlockIndex: 0, characters: [] },
        timeline: [],
        completedEvents: [],
        protagonistId: heroId,
        protagonistFormId: heroId,
        protagonistFormIndex: 0,
        protagonistTotalEvents: 4,
        storyPoints: 4,
        fillerPoints: 0,
        finalEventPlayed: false,
        canPlayEvents: true,
        eventsBlockedTurns: 0,
        statusEffects: [],
        historyPoints: 4,
        finalLockTurns: 0,
        isEventsBlocked: false,
        tags: [],
        fillerCount: 0,
    };
}

function match(): MatchState {
    return {
        matchId: 'v2_rules',
        formatId: 'standard',
        turnNumber: 1,
        currentTurn: 0,
        phase: 'main',
        players: [player('P1'), player('CPU')],
        playerOrder: ['P1', 'CPU'],
        activePlayerId: 'P1',
        actCheckpointsResolved: [],
        log: [],
    };
}

function assert(ok: unknown, message: string): void {
    if (!ok) throw new Error(message);
}

function openingDeck(): DeckData {
    return {
        id: 'opening_test',
        name: 'Opening test',
        archetypeId: 'SHONEN',
        protagonistId: heroId,
        cards: [...openingFillerIds, firstEventId, itemId],
        createdAt: 0,
        updatedAt: 0,
    };
}

const state = match();
const incomeState = match();
incomeState.players.forEach(item => {
    item.storyPoints = 0;
    item.historyPoints = 0;
});
incomeState.players[1].protagonistId = fillerHeroId;
grantTurnStoryIncome(incomeState);
assert(incomeState.players.every(item => item.storyPoints === TURN_STORY_INCOME && item.historyPoints === TURN_STORY_INCOME), 'Both players must receive turn SP income');
assert(incomeState.players[0].fillerPoints === 0 && incomeState.players[1].fillerPoints === TURN_FILLER_INCOME, 'Only FP-economy protagonists receive turn FP fuel');
assert(incomeState.log.filter(entry => entry.action === 'turn_income').length === 2, 'Turn income must be visible in match log');
assert(GAME_CONSTANTS.OPENING_ARC_CHANCE_INITIAL_HAND === 0.65, 'Opening hand setup chance must be 65%');
assert(GAME_CONSTANTS.OPENING_ARC_CHANCE_FIRST_DRAW === 0.65, 'First turn setup draw chance must be 65%');
assert(GAME_CONSTANTS.OPENING_ARC_CHANCE_SECOND_DRAW === 0.5, 'Second turn setup draw chance must be 50%');
assert(GAME_CONSTANTS.OPENING_ARC_CHANCE_LATER_DRAW === 0.4, 'Later setup draw chance must be 40%');
const guidedOpening = createPlayerState('Guided', openingDeck(), () => 0);
assert(guidedOpening.hand.includes(firstEventId) && guidedOpening.hand.includes(itemId), 'Successful opening assistance must add Event 1 and its material to the initial hand');
const unguidedOpening = createPlayerState('Unguided', openingDeck(), () => 0.99);
assert(!unguidedOpening.hand.includes(firstEventId) && !unguidedOpening.hand.includes(itemId), 'A failed opening roll must not force setup cards into hand');
const guidedDraw = createPlayerState('TurnDraw', openingDeck(), () => 0.99);
drawTurnCards(guidedDraw, 1, () => 0);
assert(guidedDraw.hand[guidedDraw.hand.length - 1] === firstEventId, 'First assisted turn draw must append a missing opening setup card');
assert(guidedDraw.openingSetupDraws === 1, 'Opening assistance must count draw opportunities per player');
assert(CARDS[firstEventId]?.type === CardType.EVENT, 'Missing V2 opening event');
const blockedEvent = canPlayCard(state, 0, firstEventId, { blockIndex: 0, isEventOrb: true });
assert(!blockedEvent.ok, 'Opening event cannot enter without its current-arc material');

state.players[0].board.blocks[0].slots[0] = { position: 'top', cardId: itemId, cardType: CardType.ITEM, placedTurn: 1 };
const playableEvent = canPlayCard(state, 0, firstEventId, { blockIndex: 0, isEventOrb: true });
assert(playableEvent.ok, 'Opening event should enter after its material is in the current arc');

assert(CARDS[quickDrawId]?.type === CardType.QUICK_EVENT, 'Shared action cards must be Quick Events');
state.players[0].hand.push(quickDrawId, quickComboId);
const immediateQuick = canPlayCard(state, 0, quickDrawId, { blockIndex: 0, position: 'left', isEventOrb: false });
assert(immediateQuick.ok, 'Basic Quick Event should be playable without an arc prerequisite');
const gatedQuick = canPlayCard(state, 0, quickComboId, { blockIndex: 0, position: 'left', isEventOrb: false });
assert(!gatedQuick.ok, 'Powerful Quick Event should require a completed event');
state.players[0].completedEvents.push(firstEventId);
assert(canPlayCard(state, 0, quickComboId, { blockIndex: 0, position: 'left', isEventOrb: false }).ok, 'Quick Event gate should open after completing an event');

const fixedCard = canReturnToHand(state, 0, 0, 'top');
assert(!fixedCard.ok, 'A played card must remain in its narrative row');

const insufficient = match();
insufficient.players[0].storyPoints = 0;
insufficient.players[0].historyPoints = 0;
const paidCard = canPlayCard(insufficient, 0, itemId, { blockIndex: 0, position: 'top', isEventOrb: false });
assert(!paidCard.ok, 'SP card cannot be played without its cost');

const climaxResponse = match();
climaxResponse.pendingClimax = {
    attackerIndex: 1,
    responderIndex: 0,
    cardId: climaxId,
    multiplier: 10,
    responseOpen: true,
};
const storyBeforePlot = climaxResponse.players[0].storyPoints;
resolveEffects(climaxResponse, 0, plotTwistId);
assert(climaxResponse.pendingClimax.multiplier === 4, 'Rush Plot-Twist should reduce Climax from x10 to x4');
assert(climaxResponse.players[0].storyPoints === storyBeforePlot + 5, 'Rush Plot-Twist should grant its response SP');
assert(CARDS[demonLordId]?.effects.some(effect => effect.type === EffectType.HAND_RANDOM_FILLER_THEN_DISCARD), 'Demon Lord Gouki must carry its hand curse');
assert(rollHandFillerPenalty(() => 0.49) === 1, 'Gouki lower 50% roll must add 1 FP');
assert(rollHandFillerPenalty(() => 0.79) === 2, 'Gouki middle 30% roll must add 2 FP');
assert(rollHandFillerPenalty(() => 0.99) === 3, 'Gouki upper 20% roll must add 3 FP');
const curseMatch = match();
curseMatch.players[0].hand = [demonLordId];
curseMatch.players[0].fillerPoints = 0;
applyHandOngoingEffects(curseMatch, 0, () => 0.1);
applyHandOngoingEffects(curseMatch, 0, () => 0.6);
applyHandOngoingEffects(curseMatch, 0, () => 0.9);
assert(curseMatch.players[0].fillerPoints === 6, 'Gouki must resolve one weighted FP penalty on each of three turns');
assert(!curseMatch.players[0].hand.includes(demonLordId), 'Gouki must leave hand after its third activation');
assert(curseMatch.players[0].discard.includes(demonLordId), 'Gouki must enter the Cementerio after its third activation');

console.log(JSON.stringify({
    ok: true,
    fixedCard: fixedCard.reasons?.[0],
    eventGate: blockedEvent.reasons?.[0],
    quickGate: gatedQuick.reasons?.[0],
    plotTwistMultiplier: climaxResponse.pendingClimax.multiplier,
    turnIncome: TURN_STORY_INCOME,
    openingArcOdds: [
        GAME_CONSTANTS.OPENING_ARC_CHANCE_INITIAL_HAND,
        GAME_CONSTANTS.OPENING_ARC_CHANCE_FIRST_DRAW,
        GAME_CONSTANTS.OPENING_ARC_CHANCE_SECOND_DRAW,
        GAME_CONSTANTS.OPENING_ARC_CHANCE_LATER_DRAW,
    ],
    demonLordPenaltySequence: [1, 2, 3],
    demonLordDiscardedAfter: 3,
}, null, 2));
