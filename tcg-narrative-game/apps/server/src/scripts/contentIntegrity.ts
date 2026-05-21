import { CARDS } from '@tcg/game-engine/content/cards';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { applyPersistedCardOverrides, auditCards } from '../content/card-catalog';
import { CardType } from '@tcg/shared/types';

applyPersistedCardOverrides();
const cards = Object.values(CARDS);
const prebuiltDecks = getPrebuiltDecks({ enabled: true, archetypes: {} });
const issues: string[] = [];
const audit = auditCards();
audit.issues
    .filter(issue => issue.severity === 'error')
    .forEach(issue => issues.push(`${issue.cardId} ${issue.field}: ${issue.message}`));

const events = cards.filter(card => card.type === CardType.EVENT || card.type === CardType.EVENT_KEY || card.type === CardType.EVENT_FINAL);
const characterLikeTypes = new Set<CardType>([CardType.PROTAGONIST, CardType.PERSONAJE, CardType.CHARACTER, CardType.UNIT]);
for (const card of cards) {
    if (!characterLikeTypes.has(card.type) && (card.likesData?.likes?.length || card.likesData?.dislikes?.length)) {
        issues.push(`${card.id} ${card.type} should not expose likes/dislikes`);
    }
}

for (const event of events) {
    if (!event.requirements?.length) {
        issues.push(`${event.id} event has no requirements`);
    }
    if (!event.effects?.length) {
        issues.push(`${event.id} event has no effects`);
    }
}

for (const protagonist of cards.filter(card => card.type === CardType.PROTAGONIST)) {
    const finalEvent = cards.find(card =>
        card.type === CardType.EVENT_FINAL
        && card.archetype === protagonist.archetype
        && card.requirements?.some(requirement => requirement.type === 'CARD_ON_BOARD' && requirement.cardIds?.includes(protagonist.id))
    );
    if (!finalEvent) {
        issues.push(`${protagonist.id} has no protagonist-specific final event`);
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
        if (card.type === CardType.PROTAGONIST && card.id !== deck.protagonistId) {
            issues.push(`${deck.id} includes other protagonist ${card.id}`);
        }
        if (
            card.type === CardType.EVENT_FINAL
            && !card.requirements?.some(requirement =>
                requirement.type === 'CARD_ON_BOARD'
                && requirement.cardIds?.includes(deck.protagonistId)
            )
        ) {
            issues.push(`${deck.id} includes unrelated final event ${card.id}`);
        }
        if (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY) {
            const referencedProtagonists = (card.requirements || [])
                .flatMap(requirement => requirement.cardIds || [])
                .filter(cardId => CARDS[cardId]?.type === CardType.PROTAGONIST);
            if (referencedProtagonists.length > 0 && !referencedProtagonists.includes(deck.protagonistId)) {
                issues.push(`${deck.id} includes protagonist-locked event ${card.id} for ${referencedProtagonists.join(',')}`);
            }
        }
    }

    const protagonistFinal = cards.find(card =>
        card.type === CardType.EVENT_FINAL
        && card.archetype === deck.archetypeId
        && card.requirements?.some(requirement =>
            requirement.type === 'CARD_ON_BOARD'
            && requirement.cardIds?.includes(deck.protagonistId)
        )
    );
    if (!protagonistFinal) {
        issues.push(`${deck.id} has no protagonist final for ${deck.protagonistId}`);
    } else if (!deck.cards.includes(protagonistFinal.id)) {
        issues.push(`${deck.id} does not include protagonist final ${protagonistFinal.id}`);
    } else {
        const requiredEvents = [
            ...(protagonistFinal.eventPrerequisites || []),
            ...(protagonistFinal.requirements || [])
                .filter(requirement => requirement.type === 'EVENT_COMPLETED')
                .flatMap(requirement => requirement.cardIds || []),
        ];
        for (const eventId of new Set(requiredEvents)) {
            if (!deck.cards.includes(eventId)) {
                issues.push(`${deck.id} does not include final prerequisite ${eventId}`);
            }
        }
    }

    const uniqueCards = new Set(deck.cards);
    if (deck.cards.length - uniqueCards.size < 3) {
        issues.push(`${deck.id} has too many singletons; expected at least 3 duplicate slots`);
    }
}

const summary = {
    cards: cards.length,
    prebuiltDecks: prebuiltDecks.length,
    issues: issues.length,
    warnings: audit.summary.warnings,
    sample: issues.slice(0, 20),
};

console.log(JSON.stringify(summary, null, 2));

if (issues.length > 0) {
    process.exitCode = 1;
}
