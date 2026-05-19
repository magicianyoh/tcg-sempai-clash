import { CardData, CardType, PlayerState, BoardState, TimelineBlock } from '@tcg/shared/types';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { CARDS } from '../content/cards';

// ============================================
// Affinity System
// ============================================

/**
 * Check affinity between cards on the field.
 * Returns the number of affinity bonuses (each gives +1 Story Point on event completion).
 *
 * @param cardIds - All card IDs currently on the player's field
 * @returns Number of affinity connections
 */
export function calculateAffinityBonus(cardIds: string[]): number {
    let bonus = 0;
    const checkedPairs = new Set<string>();

    for (const cardIdA of cardIds) {
        const cardA = CARDS[cardIdA];
        if (!cardA?.affinity?.compatibleWith) continue;

        for (const cardIdB of cardA.affinity.compatibleWith) {
            // Check if cardIdB is also on the field
            if (cardIds.includes(cardIdB)) {
                // Create a unique pair key (sorted to avoid duplicates)
                const pairKey = [cardIdA, cardIdB].sort().join(':');

                if (!checkedPairs.has(pairKey)) {
                    checkedPairs.add(pairKey);
                    bonus += GAME_CONSTANTS.AFFINITY_BONUS_PER_CARD;
                }
            }
        }
    }

    return bonus;
}

/**
 * Get all cards on a player's field (from timeline blocks).
 *
 * @param board - The player's board state
 * @returns Array of card IDs on the field
 */
export function getFieldCards(board: BoardState): string[] {
    const cards: string[] = [];

    // From timeline blocks (Phase 2)
    if (board.blocks) {
        for (const block of board.blocks) {
            for (const slot of block.slots) {
                if (slot.cardId) {
                    cards.push(slot.cardId);
                }
            }
            if (block.eventSlot) {
                cards.push(block.eventSlot);
            }
        }
    }

    // Legacy: from characters array
    if (board.characters) {
        cards.push(...board.characters);
    }

    // Legacy: location
    if (board.location) {
        cards.push(board.location);
    }

    return cards;
}

// ============================================
// Likes/Dislikes System
// ============================================

export type LikeResult = 'like' | 'dislike' | 'neutral';

/**
 * Check if a Protagonist/Character likes or dislikes a specific Item or Location.
 *
 * @param protagonistOrCharacter - The card with likes/dislikes data
 * @param targetCard - The Item or Location to check
 * @returns 'like', 'dislike', or 'neutral'
 */
export function checkLikeStatus(protagonistOrCharacter: CardData, targetCard: CardData): LikeResult {
    if (!protagonistOrCharacter.likesData) {
        return 'neutral';
    }

    const targetId = targetCard.id;

    if (protagonistOrCharacter.likesData.likes?.includes(targetId)) {
        return 'like';
    }

    if (protagonistOrCharacter.likesData.dislikes?.includes(targetId)) {
        return 'dislike';
    }

    return 'neutral';
}

/**
 * Check if any Protagonist on the field dislikes a specific card.
 * If so, events cannot be activated with that protagonist.
 *
 * @param fieldCards - Cards on the player's field
 * @param targetCardId - The Item/Location to check
 * @returns true if blocked by a dislike
 */
export function isBlockedByDislike(fieldCards: string[], targetCardId: string): boolean {
    for (const cardId of fieldCards) {
        const card = CARDS[cardId];
        if (!card) continue;

        // Only check Protagonists and Characters (Personaje)
        if (card.type !== CardType.PROTAGONIST && card.type !== CardType.PERSONAJE) {
            continue;
        }

        if (card.likesData?.dislikes?.includes(targetCardId)) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate likes bonus for event completion.
 * For each Protagonist/Character that "likes" an Item/Location on the field, +1 Story.
 *
 * @param fieldCards - Cards on the player's field
 * @returns Number of likes bonuses
 */
export function calculateLikesBonus(fieldCards: string[]): number {
    let bonus = 0;

    // Get all Items and Locations on field
    const itemsAndLocations: string[] = [];
    for (const cardId of fieldCards) {
        const card = CARDS[cardId];
        if (card?.type === CardType.ITEM || card?.type === CardType.LOCATION) {
            itemsAndLocations.push(cardId);
        }
    }

    // Check each Protagonist/Character for likes
    for (const cardId of fieldCards) {
        const card = CARDS[cardId];
        if (!card) continue;

        if (card.type !== CardType.PROTAGONIST && card.type !== CardType.PERSONAJE) {
            continue;
        }

        if (!card.likesData?.likes) continue;

        for (const likedId of card.likesData.likes) {
            if (itemsAndLocations.includes(likedId)) {
                bonus += 1;
            }
        }
    }

    return bonus;
}

// ============================================
// Combined Bonus Calculation
// ============================================

/**
 * Calculate total bonus Story Points for completing an event.
 * Includes affinity bonuses and likes bonuses.
 *
 * @param player - The player's state
 * @returns Total bonus points
 */
export function calculateEventCompletionBonus(player: PlayerState): number {
    const fieldCards = getFieldCards(player.board);

    const affinityBonus = calculateAffinityBonus(fieldCards);
    const likesBonus = calculateLikesBonus(fieldCards);

    return affinityBonus + likesBonus;
}
