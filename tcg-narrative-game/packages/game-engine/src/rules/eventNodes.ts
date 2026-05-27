import { CardData, CardRequirement, CardType, PlayerState } from '@tcg/shared/types';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { CARDS } from '../content/cards';
import { getFieldCards, isBlockedByDislike } from './affinity';

// ============================================
// Event Node System
// ============================================

/**
 * Check if an Event card can be activated by a player.
 * Validates:
 * 1. Event prerequisites (other events that must be completed first)
 * 2. Filler threshold (can't play events if filler >= 10)
 * 3. Dislike blocking (if protagonist dislikes an item/location on field)
 * 4. Story point requirements (if specified)
 *
 * @param eventCard - The event card to check
 * @param player - The player's current state
 * @returns Object with canActivate boolean and reason if false
 */
export interface EventActivationResult {
    canActivate: boolean;
    reason?: string;
    missingPrerequisites?: string[];
}

export function canActivateEvent(eventCard: CardData, player: PlayerState): EventActivationResult {
    // Check if player can play events at all (filler threshold)
    const paysEventsWithFiller = Boolean(player.protagonistId && CARDS[player.protagonistId]?.costResource === 'FP');
    if (!paysEventsWithFiller && player.fillerPoints >= GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD) {
        return {
            canActivate: false,
            reason: `Filler points too high (${player.fillerPoints}/${GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD}). Cannot play events.`,
        };
    }

    // Check if events are blocked by opponent effect
    if (player.eventsBlockedTurns > 0 || player.isEventsBlocked) {
        return {
            canActivate: false,
            reason: 'Events are currently blocked.',
        };
    }

    // Check event prerequisites
    if (eventCard.eventPrerequisites && eventCard.eventPrerequisites.length > 0) {
        const missingPrereqs: string[] = [];

        for (const prereqId of eventCard.eventPrerequisites) {
            if (!player.completedEvents?.includes(prereqId)) {
                missingPrereqs.push(prereqId);
            }
        }

        if (missingPrereqs.length > 0) {
            const prereqNames = missingPrereqs.map(id => CARDS[id]?.name || id).join(', ');
            return {
                canActivate: false,
                reason: `Missing prerequisites: ${prereqNames}`,
                missingPrerequisites: missingPrereqs,
            };
        }
    }

    // Check structured card requirements.
    if (eventCard.requirements && eventCard.requirements.length > 0) {
        for (const requirement of eventCard.requirements) {
            if (!doesPlayerMeetRequirement(player, requirement)) {
                return {
                    canActivate: false,
                    reason: getRequirementFailureMessage(requirement, player),
                };
            }
        }
    }

    // Check for dislike blocking (items/locations on field that protagonist dislikes)
    const fieldCards = getFieldCards(player.board);

    // Find protagonist on field
    const protagonistId = fieldCards.find(id => CARDS[id]?.type === CardType.PROTAGONIST);
    if (protagonistId) {
        const protagonist = CARDS[protagonistId];

        if (protagonist?.likesData?.dislikes) {
            for (const dislikedId of protagonist.likesData.dislikes) {
                if (fieldCards.includes(dislikedId)) {
                    const dislikedCard = CARDS[dislikedId];
                    return {
                        canActivate: false,
                        reason: `${protagonist.name} dislikes "${dislikedCard?.name || dislikedId}" on field.`,
                    };
                }
            }
        }
    }

    // For Final Events, check additional requirements
    if (eventCard.type === CardType.EVENT_FINAL) {
        const result = canActivateFinalEvent(eventCard, player);
        if (!result.canActivate) {
            return result;
        }
    }

    return { canActivate: true };
}

function doesPlayerMeetRequirement(player: PlayerState, requirement: CardRequirement): boolean {
    switch (requirement.type) {
        case 'STORY_MIN':
        case 'HISTORY_MIN': {
            const storyPoints = player.storyPoints ?? player.historyPoints ?? 0;
            return storyPoints >= (requirement.value || 0);
        }

        case 'FILLER_MAX':
            return player.fillerPoints <= (requirement.value || 0);

        case 'EVENT_COMPLETED':
            return (requirement.cardIds || []).every(id => player.completedEvents?.includes(id));

        case 'CARD_ON_BOARD': {
            const fieldCards = getFieldCards(player.board);
            const matchingCards = fieldCards.filter(cardId => {
                const card = CARDS[cardId];
                if (!card) return false;
                if (requirement.cardIds && !requirement.cardIds.includes(card.id)) return false;
                if (requirement.cardType && card.type !== requirement.cardType) return false;
                if (requirement.tag && !card.tags?.includes(requirement.tag)) return false;
                if (requirement.archetype && card.archetype !== requirement.archetype) return false;
                return true;
            });

            return matchingCards.length >= (requirement.value || 1);
        }

        case 'AFFINITY_ACTIVE': {
            const fieldCards = getFieldCards(player.board);
            return fieldCards.some(cardId => {
                const compatibleIds = CARDS[cardId]?.affinity?.compatibleWith || [];
                return compatibleIds.some(compatibleId => fieldCards.includes(compatibleId));
            });
        }

        default:
            return true;
    }
}

function getRequirementFailureMessage(requirement: CardRequirement, player: PlayerState): string {
    switch (requirement.type) {
        case 'STORY_MIN':
        case 'HISTORY_MIN': {
            const storyPoints = player.storyPoints ?? player.historyPoints ?? 0;
            return `Need ${requirement.value} Story Points (have ${storyPoints})`;
        }

        case 'FILLER_MAX':
            return `Filler must be <= ${requirement.value} (have ${player.fillerPoints})`;

        case 'EVENT_COMPLETED': {
            const eventNames = requirement.cardIds?.map(id => CARDS[id]?.name || id).join(', ');
            return `Must complete: ${eventNames}`;
        }

        case 'CARD_ON_BOARD':
            return 'Required card is not on the board';

        case 'AFFINITY_ACTIVE':
            return 'Need cards with active affinity on field';

        default:
            return 'Requirement not met';
    }
}

/**
 * Check if a Final Event can be activated.
 * Final Events may have specific story point requirements and board conditions.
 *
 * @param finalEvent - The final event card
 * @param player - The player's current state
 * @returns EventActivationResult
 */
export function canActivateFinalEvent(finalEvent: CardData, player: PlayerState): EventActivationResult {
    // Check effect conditions (for story point requirements etc.)
    for (const effect of finalEvent.effects || []) {
        if (effect.condition) {
            const conditionMet = checkEffectCondition(effect.condition, player);
            if (!conditionMet) {
                return {
                    canActivate: false,
                    reason: getConditionFailureMessage(effect.condition, player),
                };
            }
        }
    }

    return { canActivate: true };
}

/**
 * Check if an effect condition is met.
 *
 * @param condition - The condition to check
 * @param player - The player's state
 * @returns true if condition is met
 */
function checkEffectCondition(condition: any, player: PlayerState): boolean {
    switch (condition.type) {
        case 'STORY_MIN':
        case 'HISTORY_MIN':
            const storyPoints = player.storyPoints ?? player.historyPoints ?? 0;
            return storyPoints >= (condition.value || 0);

        case 'FILLER_MAX':
            return player.fillerPoints <= (condition.value || 0);

        case 'BOARD_HAS':
            if (condition.cardIds) {
                const fieldCards = getFieldCards(player.board);
                return condition.cardIds.every((id: string) => fieldCards.includes(id));
            }
            return true;

        case 'LOCATION_IS':
            return player.board.location === condition.locationId;

        case 'EVENT_COMPLETED':
            if (condition.cardIds) {
                return condition.cardIds.every((id: string) =>
                    player.completedEvents?.includes(id)
                );
            }
            return true;

        case 'AFFINITY_ACTIVE':
            // Check if at least 2 cards with affinity are on field
            const fieldCards = getFieldCards(player.board);
            for (const cardId of fieldCards) {
                const card = CARDS[cardId];
                if (card?.affinity?.compatibleWith) {
                    for (const compatId of card.affinity.compatibleWith) {
                        if (fieldCards.includes(compatId)) {
                            return true;
                        }
                    }
                }
            }
            return false;

        default:
            return true;
    }
}

/**
 * Get a human-readable message for why a condition failed.
 */
function getConditionFailureMessage(condition: any, player: PlayerState): string {
    switch (condition.type) {
        case 'STORY_MIN':
        case 'HISTORY_MIN':
            const storyPoints = player.storyPoints ?? player.historyPoints ?? 0;
            return `Need ${condition.value} Story Points (have ${storyPoints})`;

        case 'FILLER_MAX':
            return `Filler must be ≤${condition.value} (have ${player.fillerPoints})`;

        case 'BOARD_HAS':
            const cardNames = condition.cardIds?.map((id: string) =>
                CARDS[id]?.name || id
            ).join(', ');
            return `Need on field: ${cardNames}`;

        case 'LOCATION_IS':
            const locName = CARDS[condition.locationId]?.name || condition.locationId;
            return `Location must be "${locName}"`;

        case 'EVENT_COMPLETED':
            const eventNames = condition.cardIds?.map((id: string) =>
                CARDS[id]?.name || id
            ).join(', ');
            return `Must complete: ${eventNames}`;

        case 'AFFINITY_ACTIVE':
            return 'Need cards with active affinity on field';

        default:
            return 'Condition not met';
    }
}

/**
 * Get all events that a player can currently activate.
 *
 * @param hand - Cards in player's hand
 * @param player - The player's state
 * @returns Array of activatable event card IDs
 */
export function getActivatableEvents(hand: string[], player: PlayerState): string[] {
    const activatable: string[] = [];

    for (const cardId of hand) {
        const card = CARDS[cardId];
        if (!card) continue;

        // Only check event-type cards
        if (card.type !== CardType.EVENT &&
            card.type !== CardType.EVENT_KEY &&
            card.type !== CardType.EVENT_FINAL) {
            continue;
        }

        const result = canActivateEvent(card, player);
        if (result.canActivate) {
            activatable.push(cardId);
        }
    }

    return activatable;
}

/**
 * Get the event tree for an archetype, showing dependencies.
 * Useful for UI to show which events unlock which.
 *
 * @param archetypeId - The archetype to get events for
 * @returns Map of eventId -> prerequisite eventIds
 */
export function getEventTree(archetypeId: string): Map<string, string[]> {
    const tree = new Map<string, string[]>();

    for (const [cardId, card] of Object.entries(CARDS)) {
        if (card.archetype !== archetypeId) continue;

        if (card.type === CardType.EVENT ||
            card.type === CardType.EVENT_KEY ||
            card.type === CardType.EVENT_FINAL) {
            tree.set(cardId, card.eventPrerequisites || []);
        }
    }

    return tree;
}
