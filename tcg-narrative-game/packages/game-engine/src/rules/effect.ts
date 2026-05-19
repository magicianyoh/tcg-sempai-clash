import { MatchState, EffectType, CardData } from '@tcg/shared/types';
import { CARDS } from '../content/cards';

export function resolveEffects(
    state: MatchState,
    playerIndex: number,
    cardId: string
): void {
    const card = CARDS[cardId];
    if (!card) return;

    const player = state.players[playerIndex];
    const opponent = state.players[1 - playerIndex];

    for (const effect of card.effects) {
        // Skip conditional checks for now (MVP), apply direct effects
        // TODO: Implement condition evaluation if effect.condition exists

        const target = effect.target === 'OPPONENT' ? opponent : player;
        const val = effect.value || 0;

        switch (effect.type) {
            case EffectType.STORY:
            case 'STORY': // Legacy string support
                target.storyPoints = (target.storyPoints || 0) + val;
                // Sync legacy historyPoints
                target.historyPoints = target.storyPoints;
                break;

            case EffectType.FILLER:
            case 'FILLER':
                target.fillerPoints = (target.fillerPoints || 0) + val;
                break;

            case EffectType.DRAW:
            case 'DRAW':
                // Draw logic
                for (let i = 0; i < val; i++) {
                    if (target.deck.length > 0) {
                        const c = target.deck.shift();
                        if (c) target.hand.push(c);
                    }
                }
                break;

            case EffectType.DISCARD:
                // Random discard for MVP
                for (let i = 0; i < val; i++) {
                    if (target.hand.length > 0) {
                        const idx = Math.floor(Math.random() * target.hand.length);
                        const c = target.hand.splice(idx, 1)[0];
                        target.discard.push(c);
                    }
                }
                break;
        }
    }
}
