import { CardData, MatchState, PlayerState, CardType, TimelineNode, CardEffect } from '@tcg/shared/types';
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
        const historyIds = player.timeline.map((node: TimelineNode) => node.cardId);
        const meetsReq = card.requirements.every((reqId: string) => historyIds.includes(reqId));
        if (!meetsReq) return { valid: false, reason: 'Requirements not met' };
    }

    // Check specific Event rules
    if (card.type === CardType.EVENT_KEY) {
        // Only 1 Key Event per turn? Logic here
    }

    return { valid: true };
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
