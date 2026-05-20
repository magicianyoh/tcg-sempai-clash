import { CARDS } from '@tcg/game-engine/content/cards';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';
import { GAME_CONSTANTS } from '@tcg/shared/constants';

const cards = Object.values(CARDS);
const prebuiltDecks = getPrebuiltDecks({ enabled: true, archetypes: {} });
const cardIds = new Set(cards.map(card => card.id));
const issues: string[] = [];

for (const card of cards) {
    if (!card.effects?.length) {
        issues.push(`${card.id} has no effects`);
    }

    for (const requirement of card.requirements || []) {
        for (const id of requirement.cardIds || []) {
            if (!cardIds.has(id)) issues.push(`${card.id} requirement references missing card ${id}`);
        }
    }

    for (const id of card.likesData?.likes || []) {
        if (!cardIds.has(id)) issues.push(`${card.id} likes missing card ${id}`);
    }

    for (const id of card.likesData?.dislikes || []) {
        if (!cardIds.has(id)) issues.push(`${card.id} dislikes missing card ${id}`);
    }

    for (const id of card.affinity?.compatibleWith || []) {
        if (!cardIds.has(id)) issues.push(`${card.id} affinity references missing card ${id}`);
    }
}

for (const deck of prebuiltDecks) {
    if (deck.cards.length !== GAME_CONSTANTS.DECK_SIZE) {
        issues.push(`${deck.id} has ${deck.cards.length} cards, expected ${GAME_CONSTANTS.DECK_SIZE}`);
    }

    for (const id of deck.cards) {
        const card = CARDS[id];
        if (!card) {
            issues.push(`${deck.id} references missing card ${id}`);
            continue;
        }
        if (card.archetype !== deck.archetypeId) {
            issues.push(`${deck.id} includes ${id} from ${card.archetype}, expected ${deck.archetypeId}`);
        }
    }
}

const summary = {
    cards: cards.length,
    prebuiltDecks: prebuiltDecks.length,
    issues: issues.length,
    sample: issues.slice(0, 20),
};

console.log(JSON.stringify(summary, null, 2));

if (issues.length > 0) {
    process.exitCode = 1;
}
