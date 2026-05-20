import { MatchState, EffectType, CardType, TimelineSlot } from '@tcg/shared/types';
import { CARDS } from '../content/cards';

export function resolveEffects(
    state: MatchState,
    playerIndex: number,
    cardId: string
): string[] {
    const card = CARDS[cardId];
    if (!card) return [];

    const player = state.players[playerIndex];
    const opponent = state.players[1 - playerIndex];
    const logs: string[] = [];

    player.statusEffects ||= [];
    opponent.statusEffects ||= [];

    for (const effect of card.effects) {
        // Skip conditional checks for now (MVP), apply direct effects
        // TODO: Implement condition evaluation if effect.condition exists

        const target = effect.target === 'OPPONENT' ? opponent : player;
        target.statusEffects ||= [];
        const val = effect.value || 0;

        switch (effect.type) {
            case EffectType.STORY:
            case 'STORY': // Legacy string support
                target.storyPoints = (target.storyPoints || 0) + val;
                // Sync legacy historyPoints
                target.historyPoints = target.storyPoints;
                logs.push(`${target.username} gana ${val} Story por ${card.name}.`);
                break;

            case EffectType.FILLER:
            case 'FILLER':
                target.fillerPoints = (target.fillerPoints || 0) + val;
                logs.push(`${target.username} ${val >= 0 ? 'recibe' : 'limpia'} ${Math.abs(val)} Filler por ${card.name}.`);
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
                logs.push(`${target.username} roba ${val} carta(s) al efecto de ${card.name}.`);
                break;

            case EffectType.DISCARD:
            case 'DISCARD':
                // Random discard for MVP
                for (let i = 0; i < val; i++) {
                    if (target.hand.length > 0) {
                        const idx = Math.floor(Math.random() * target.hand.length);
                        const c = target.hand.splice(idx, 1)[0];
                        target.discard.push(c);
                    }
                }
                logs.push(`${target.username} descarta ${val} carta(s) por ${card.name}.`);
                break;

            case EffectType.BLOCK_EVENTS:
            case 'BLOCK_EVENTS':
                target.eventsBlockedTurns = Math.max(target.eventsBlockedTurns || 0, effect.turns || val || 1);
                target.canPlayEvents = false;
                target.isEventsBlocked = true;
                logs.push(`${target.username} no puede jugar eventos por ${card.name}.`);
                break;

            case EffectType.BLOCK_CARD_TYPE:
            case 'BLOCK_CARD_TYPE': {
                const blockedType = effect.cardType || CardType.ITEM;
                const turns = effect.turns || val || 1;
                target.statusEffects.push({
                    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: 'BLOCK_CARD_TYPE',
                    sourceCardId: card.id,
                    sourceName: card.name,
                    turnsRemaining: turns,
                    cardType: blockedType,
                    message: `No puedes jugar cartas de ${blockedType} por ${card.name}.`,
                });
                logs.push(`${target.username} no puede jugar cartas de ${blockedType} por ${card.name}.`);
                break;
            }

            case EffectType.EXTRA_DRAW_NEXT_TURN:
            case 'EXTRA_DRAW_NEXT_TURN':
                target.statusEffects.push({
                    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: 'EXTRA_DRAW_NEXT_TURN',
                    sourceCardId: card.id,
                    sourceName: card.name,
                    turnsRemaining: effect.turns || 1,
                    value: Math.max(1, val || 1),
                    message: `${target.username} robara ${Math.max(1, val || 1)} carta extra por ${card.name}.`,
                });
                logs.push(`${target.username} prepara ${Math.max(1, val || 1)} robo extra por ${card.name}.`);
                break;

            case EffectType.REMOVE_OPPONENT_BOARD_CARD:
            case 'REMOVE_OPPONENT_BOARD_CARD': {
                const removed = removeBoardCard(target.board.blocks[target.board.currentBlockIndex]?.slots)
                    || removeBoardCard(target.board.blocks.flatMap(block => block.slots));
                if (removed) {
                    target.discard.push(removed);
                    logs.push(`${card.name} expulsa ${CARDS[removed]?.name || removed} del campo de ${target.username}.`);
                }
                break;
            }
        }
    }

    logs.push(...resolveLikesAndDislikes(state, playerIndex, cardId));
    return logs;
}

function removeBoardCard(slots?: TimelineSlot[]): string | null {
    const occupied = (slots || []).filter(slot => !!slot.cardId);
    const slot = occupied[occupied.length - 1];
    if (!slot?.cardId) return null;
    const removed = slot.cardId;
    slot.cardId = undefined;
    slot.cardType = undefined;
    slot.placedTurn = undefined;
    return removed;
}

function resolveLikesAndDislikes(state: MatchState, playerIndex: number, playedCardId: string): string[] {
    const player = state.players[playerIndex];
    const playedCard = CARDS[playedCardId];
    if (!playedCard) return [];

    const fieldCardIds = player.board.blocks.flatMap(block => block.slots.map(slot => slot.cardId).filter((id): id is string => !!id));
    const logs: string[] = [];
    let storyBonus = 0;
    let fillerPenalty = 0;

    for (const fieldCardId of fieldCardIds) {
        if (fieldCardId === playedCardId) continue;
        const fieldCard = CARDS[fieldCardId];
        if (!fieldCard) continue;

        if (fieldCard.likesData?.likes?.includes(playedCardId) || playedCard.likesData?.likes?.includes(fieldCardId)) {
            storyBonus += 1;
            logs.push(`${fieldCard.name} vibra con ${playedCard.name}: ${player.username} gana prosperidad narrativa.`);
        }

        if (fieldCard.likesData?.dislikes?.includes(playedCardId) || playedCard.likesData?.dislikes?.includes(fieldCardId)) {
            fillerPenalty += 1;
            logs.push(`${fieldCard.name} choca con ${playedCard.name}: la escena suma ruido.`);
        }
    }

    if (storyBonus > 0) {
        player.storyPoints += storyBonus;
        player.historyPoints = player.storyPoints;
    }
    if (fillerPenalty > 0) {
        player.fillerPoints += fillerPenalty;
    }

    return logs;
}
