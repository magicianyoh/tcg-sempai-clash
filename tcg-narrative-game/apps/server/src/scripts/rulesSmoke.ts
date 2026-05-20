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
        deck: ['shonen-char-rival', 'shonen-item-training', 'shonen-loc-dojo'],
        hand: ['shonen-char-rival', 'shonen-item-training', 'shonen-loc-dojo'],
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
const eventCard = CARDS['shonen-event-call'];
assert(eventCard?.type === CardType.EVENT, 'Expected shonen-event-call to exist as an event card');

const logs = resolveEffects(match, 0, eventCard.id);
assert(logs.some(line => line.includes('Story')), 'Expected event effect to generate Story log');
assert(match.players[1].statusEffects?.some(effect => effect.type === 'BLOCK_CARD_TYPE'), 'Expected event to add a card-type block');

const blocked = canPlayCard(match, 1, 'shonen-char-rival', { blockIndex: 0, position: 'top' });
assert(!blocked.ok, 'Expected blocked card type to be rejected');
assert(blocked.reasons?.[0]?.includes('No puedes jugar cartas'), 'Expected blocked card reason to be player-facing');

const ownMatch = createMatch('Player 1');
ownMatch.players[0].board.blocks[0].slots[0] = {
    position: 'top',
    cardId: 'shonen-char-rival',
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
