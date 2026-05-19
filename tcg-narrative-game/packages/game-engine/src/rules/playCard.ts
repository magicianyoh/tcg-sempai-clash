import { CardEffect, CardRequirement, CardType, MatchState } from '@tcg/shared/types';
import { CARDS } from '../content/cards';

export function validatePlayCard(match: MatchState, playerId: string, cardId: string): { valid: boolean; reason?: string } {
    const player = match.players.find(p => p.id === playerId);
    if (!player) return { valid: false, reason: 'Player not found' };
    const card = CARDS[cardId];

    if (match.activePlayerId !== playerId) return { valid: false, reason: 'Not your turn' };
    if (!card) return { valid: false, reason: 'Card not found' };
    if (!player.hand.includes(cardId)) return { valid: false, reason: 'Card not in hand' };

    // Check requirements
    if (card.requirements) {
        const meetsReq = card.requirements.every((requirement) => meetsRequirement(match, playerId, requirement));
        if (!meetsReq) return { valid: false, reason: 'Requirements not met' };
    }

    // Check specific Event rules
    if (card.type === CardType.EVENT_KEY) {
        // Only 1 Key Event per turn? Logic here
    }

    return { valid: true };
}

function meetsRequirement(match: MatchState, playerId: string, requirement: CardRequirement): boolean {
    const player = match.players.find(p => p.id === playerId);
    if (!player) return false;

    switch (requirement.type) {
        case 'STORY_MIN':
        case 'HISTORY_MIN': {
            const storyPoints = player.storyPoints ?? player.historyPoints ?? 0;
            return storyPoints >= (requirement.value || 0);
        }

        case 'FILLER_MAX':
            return player.fillerPoints <= (requirement.value || 0);

        case 'EVENT_COMPLETED':
            return (requirement.cardIds || []).every(cardId => player.completedEvents.includes(cardId));

        case 'CARD_ON_BOARD': {
            const boardCards = player.board.blocks.flatMap(block => block.slots.map(slot => slot.cardId).filter(Boolean));
            const matchingCards = boardCards.filter(cardId => {
                const boardCard = CARDS[cardId!];
                if (!boardCard) return false;
                if (requirement.cardIds && !requirement.cardIds.includes(boardCard.id)) return false;
                if (requirement.cardType && boardCard.type !== requirement.cardType) return false;
                if (requirement.tag && !boardCard.tags?.includes(requirement.tag)) return false;
                if (requirement.archetype && boardCard.archetype !== requirement.archetype) return false;
                return true;
            });

            return matchingCards.length >= (requirement.value || 1);
        }

        case 'AFFINITY_ACTIVE': {
            const boardCards = player.board.blocks.flatMap(block => block.slots.map(slot => slot.cardId).filter(Boolean));
            return boardCards.some(cardId => {
                const compatibleIds = CARDS[cardId!]?.affinity?.compatibleWith || [];
                return compatibleIds.some(compatibleId => boardCards.includes(compatibleId));
            });
        }

        default:
            return true;
    }
}

export function playCard(match: MatchState, playerId: string, cardId: string): MatchState {
    const validation = validatePlayCard(match, playerId, cardId);
    if (!validation.valid) throw new Error(validation.reason);

    const player = match.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');
    const card = CARDS[cardId];

    // Remove from hand
    const handIndex = player.hand.indexOf(cardId);
    player.hand.splice(handIndex, 1);

    // Add to timeline
    player.timeline.push({
        cardId,
        turn: match.turnNumber,
        resolved: false // Will be resolved in resolveEffects
    });

    // Execute Effects immediately for MVP (or queue them)
    // Here we resolve immediately for simplicity unless it's a Final Event that waits?
    // User prompted: "Eventos Clave... Sólo son jugadas si se cumplen requisitos" (Handled in validate)
    // "Eventos Finales... NO dan puntos... Victoria: SOLO al resolver evento final"

    if (card.type === CardType.EVENT_FINAL) {
        match.winner = playerId;
    }

    // Draw logic, damage logic etc would go here or in a resolve function
    card.effects.forEach((effect: CardEffect) => {
        if (effect.type === 'DRAW') {
            // Basic draw mock
        }
    });

    return match;
}
