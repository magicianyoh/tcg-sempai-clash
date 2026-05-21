import { CARDS } from '@tcg/game-engine/content/cards';
import { resolveEffects } from '@tcg/game-engine/rules/effect';
import { canPlayCard, canReturnToHand } from '@tcg/game-engine/rules/validation';
import { CardType, MatchState, PlayerState, TimelineSlot } from '@tcg/shared/types';

function createSlots(): TimelineSlot[] {
    return [
        { position: 'top' },
        { position: 'left' },
        { position: 'right' },
        { position: 'bottom' },
    ];
}

function createPlayer(username: string): PlayerState {
    return {
        id: username,
        username,
        deck: ['otome-char-crown-prince', 'otome-item-sealed-letter', 'otome-loc-academy-hall'],
        hand: ['otome-char-crown-prince', 'otome-item-sealed-letter', 'otome-loc-academy-hall'],
        discard: [],
        board: {
            blocks: [{
                blockIndex: 0,
                slots: createSlots(),
                eventCompleted: false,
            }],
            currentBlockIndex: 0,
            characters: [],
        },
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

function createMatch(activePlayerId = 'Player 1'): MatchState {
    return {
        matchId: 'rules_smoke',
        formatId: 'standard',
        turnNumber: 1,
        currentTurn: activePlayerId === 'Player 1' ? 0 : 1,
        phase: 'main',
        players: [createPlayer('Player 1'), createPlayer('CPU')] as [PlayerState, PlayerState],
        playerOrder: ['Player 1', 'CPU'],
        activePlayerId,
        actCheckpointsResolved: [],
        log: [],
    };
}

function assert(condition: unknown, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

const match = createMatch('CPU');
const eventCard = CARDS['otome-event-doom-villainess-bad-end-memory'];
assert(eventCard?.type === CardType.EVENT, 'Expected otome-event-doom-villainess-bad-end-memory to exist as an event card');

const logs = resolveEffects(match, 0, eventCard.id);
assert(logs.length > 0, 'Expected event effect to generate logs');
const blockingEffect = match.players[1].statusEffects?.find(effect =>
    effect.type === 'BLOCK_CARD_TYPE' || effect.type === 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN'
);
assert(blockingEffect, 'Expected event to add a blocking status effect');

const blockedCardId = blockingEffect?.cardId || 'otome-item-sealed-letter';
const blocked = canPlayCard(match, 1, blockedCardId, { blockIndex: 0, position: 'top' });
assert(!blocked.ok, 'Expected blocked card type to be rejected');
assert(Boolean(blocked.reasons?.[0]), 'Expected blocked card reason to be player-facing');

const ownMatch = createMatch('Player 1');
ownMatch.players[0].board.blocks[0].slots[0] = {
    position: 'top',
    cardId: 'otome-char-crown-prince',
    cardType: CardType.PERSONAJE,
    placedTurn: 1,
};

const canReturnSameTurn = canReturnToHand(ownMatch, 0, 0, 'top');
assert(canReturnSameTurn.ok, 'Expected same-turn return to hand to be valid');

ownMatch.turnNumber = 2;
const cannotReturnNextTurn = canReturnToHand(ownMatch, 0, 0, 'top');
assert(!cannotReturnNextTurn.ok, 'Expected next-turn return to hand to be blocked');

console.log(JSON.stringify({
    ok: true,
    effectLogs: logs.length,
    blockedReason: blocked.reasons?.[0],
    returnRule: cannotReturnNextTurn.reasons?.[0],
}, null, 2));
