import { MatchState, EffectType, CardType, TimelineSlot, EffectCondition } from '@tcg/shared/types';
import { CARDS } from '../content/cards';

export function resolveEffects(
    state: MatchState,
    playerIndex: number,
    cardId: string,
    options: { multiplier?: number; entryOnly?: boolean } = {}
): string[] {
    const card = CARDS[cardId];
    if (!card) return [];

    const player = state.players[playerIndex];
    const opponent = state.players[1 - playerIndex];
    const logs: string[] = [];

    player.statusEffects ||= [];
    opponent.statusEffects ||= [];

    const effects = options.entryOnly ? (card.entryEffects || []) : card.effects;
    for (const effect of effects) {
        if (effect.condition && !isEffectConditionMet(state, playerIndex, effect.condition)) {
            logs.push(card.name + ' no activa ' + (effect.description || effect.type) + ': condicion incompleta.');
            continue;
        }

        const target = effect.target === 'OPPONENT' ? opponent : player;
        target.statusEffects ||= [];
        const numericMultiplier = options.multiplier || 1;
        const val = (effect.value || 0) * (
            (effect.type === EffectType.STORY || effect.type === EffectType.FILLER || effect.type === 'STORY' || effect.type === 'FILLER')
                ? numericMultiplier
                : 1
        );

        switch (effect.type) {
            case EffectType.STORY:
            case 'STORY': // Legacy string support
                target.storyPoints = (target.storyPoints || 0) + val;
                // Sync legacy historyPoints
                target.historyPoints = target.storyPoints;
                logs.push(`${target.username} gana ${val} SP (Story Points) por ${card.name}.`);
                break;

            case EffectType.FILLER:
            case 'FILLER':
                {
                    const before = target.fillerPoints || 0;
                    target.fillerPoints = Math.max(0, before + val);
                    const applied = target.fillerPoints - before;
                    logs.push(`${target.username} ${val >= 0 ? 'recibe' : 'limpia'} ${Math.abs(applied)} FP (Filler Points) por ${card.name}.`);
                }
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

            case EffectType.BLOCK_RANDOM_HAND_CARD_NEXT_TURN:
            case 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN': {
                const blockedCardId = target.hand[Math.floor(Math.random() * target.hand.length)];
                if (blockedCardId) {
                    const blockedName = CARDS[blockedCardId]?.name || blockedCardId;
                    target.statusEffects.push({
                        id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        type: 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN',
                        sourceCardId: card.id,
                        sourceName: card.name,
                        turnsRemaining: effect.turns || 1,
                        cardId: blockedCardId,
                        message: `No puedes jugar ${blockedName} este turno por ${card.name}.`,
                    });
                    logs.push(`${card.name} bloquea ${blockedName} en la mano de ${target.username} por 1 turno.`);
                }
                break;
            }

            case EffectType.NEXT_EVENT_REDUCE_REQUIREMENT:
            case 'NEXT_EVENT_REDUCE_REQUIREMENT':
                target.statusEffects.push({
                    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: 'NEXT_EVENT_REDUCE_REQUIREMENT',
                    sourceCardId: card.id,
                    sourceName: card.name,
                    turnsRemaining: effect.turns || 2,
                    value: Math.max(1, val || 1),
                    message: `Tu proximo evento ignora 1 requisito por ${card.name}.`,
                });
                logs.push(`${target.username} prepara su proximo evento con 1 requisito menos por ${card.name}.`);
                break;

            case EffectType.INVOKE_CARD_TO_OPPONENT_HAND:
            case 'INVOKE_CARD_TO_OPPONENT_HAND': {
                const cardToInvoke = effect.cardId || 'isekai-external-demon-lord-gouki';
                const uniqueCurse = CARDS[cardToInvoke]?.effects.some(item =>
                    item.type === EffectType.HAND_RANDOM_FILLER_THEN_DISCARD || item.type === 'HAND_RANDOM_FILLER_THEN_DISCARD'
                );
                if (CARDS[cardToInvoke] && target.hand.length < 10 && (!uniqueCurse || !target.hand.includes(cardToInvoke))) {
                    target.hand.push(cardToInvoke);
                    logs.push(`${card.name} invoca ${CARDS[cardToInvoke].name} en la mano de ${target.username}.`);
                }
                break;
            }

            case EffectType.RECOVER_FROM_CEMETERY:
            case 'RECOVER_FROM_CEMETERY': {
                const recoverId = effect.cardId || target.discard[target.discard.length - 1];
                const discardIndex = recoverId ? target.discard.indexOf(recoverId) : -1;
                if (discardIndex >= 0 && recoverId && target.hand.length < 10) {
                    target.discard.splice(discardIndex, 1);
                    target.hand.push(recoverId);
                    logs.push(`${card.name} recupera ${CARDS[recoverId]?.name || recoverId} del Cementerio a la mano de ${target.username}.`);
                }
                break;
            }

            case EffectType.RECOVER_FROM_COMPLETED_ARC:
            case 'RECOVER_FROM_COMPLETED_ARC': {
                let remaining = Math.max(1, effect.value || 1);
                const recovered: string[] = [];
                const sourceIsResolvingEvent = card.type === CardType.EVENT || card.type === CardType.CLIMAX_EVENT;
                const blocks = [...target.board.blocks].reverse();
                for (const block of blocks) {
                    if (remaining <= 0 || target.hand.length >= 10) break;
                    const resolvedNow = sourceIsResolvingEvent && block.blockIndex === target.board.currentBlockIndex;
                    if (!block.eventCompleted && !resolvedNow) continue;
                    for (const slot of [...block.slots].reverse()) {
                        if (remaining <= 0 || target.hand.length >= 10) break;
                        if (!slot.cardId) continue;
                        recovered.push(slot.cardId);
                        target.hand.push(slot.cardId);
                        slot.cardId = undefined;
                        slot.cardType = undefined;
                        slot.placedTurn = undefined;
                        remaining--;
                    }
                }
                if (recovered.length) {
                    logs.push(`${card.name} trae ${recovered.map(id => CARDS[id]?.name || id).join(', ')} de un arco resuelto a la mano de ${target.username}.`);
                }
                break;
            }

            case EffectType.SEARCH_CLIMAX:
            case 'SEARCH_CLIMAX': {
                const index = target.deck.findIndex(id => CARDS[id]?.type === CardType.CLIMAX_EVENT && (!effect.cardId || id === effect.cardId));
                if (index >= 0 && target.hand.length < 10) {
                    const found = target.deck.splice(index, 1)[0];
                    target.hand.push(found);
                    logs.push(`${target.username} busca ${CARDS[found]?.name || found} en su mazo por ${card.name}.`);
                }
                break;
            }

            case EffectType.SEARCH_CARD_TYPE:
            case 'SEARCH_CARD_TYPE': {
                const wantedType = effect.cardType || CardType.ITEM;
                const index = target.deck.findIndex(id => CARDS[id]?.type === wantedType);
                if (index >= 0 && target.hand.length < 10) {
                    const found = target.deck.splice(index, 1)[0];
                    target.hand.push(found);
                    logs.push(`${target.username} busca ${CARDS[found]?.name || found} de tipo ${wantedType} por ${card.name}.`);
                }
                break;
            }

            case EffectType.MODIFY_CLIMAX_LEVEL:
            case 'MODIFY_CLIMAX_LEVEL': {
                if (state.pendingClimax) {
                    const tiers: Array<2 | 4 | 10> = [2, 4, 10];
                    const current = tiers.indexOf(state.pendingClimax.multiplier);
                    const reduced = Math.max(0, current - Math.max(1, effect.value || 1));
                    state.pendingClimax.multiplier = tiers[reduced];
                    logs.push(`${card.name} reduce el Climax rival a x${state.pendingClimax.multiplier}.`);
                }
                break;
            }

            case EffectType.PROTECT_PROTAGONIST:
            case 'PROTECT_PROTAGONIST':
                target.statusEffects.push({
                    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: 'PROTECT_PROTAGONIST',
                    sourceCardId: card.id,
                    sourceName: card.name,
                    turnsRemaining: effect.turns || 2,
                    message: `Tu Protagonista ignora el proximo efecto de silencio por ${card.name}.`,
                });
                logs.push(`${card.name} protege al Protagonista de ${target.username} del proximo silencio.`);
                break;

            case EffectType.SILENCE_PROTAGONIST_NEXT_EVENT:
            case 'SILENCE_PROTAGONIST_NEXT_EVENT':
                target.statusEffects.push({
                    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    type: 'SILENCE_PROTAGONIST_NEXT_EVENT',
                    sourceCardId: card.id,
                    sourceName: card.name,
                    turnsRemaining: effect.turns || 2,
                    message: `El Protagonista no activa sus efectos en su proximo Evento por ${card.name}.`,
                });
                logs.push(`${card.name} silencia al Protagonista de ${target.username} para su proximo Evento.`);
                break;
        }
    }

    logs.push(...resolveLikesAndDislikes(state, playerIndex, cardId));
    return logs;
}

function isEffectConditionMet(state: MatchState, playerIndex: number, cond: EffectCondition): boolean {
    const player = state.players[playerIndex];
    const story = player.storyPoints ?? player.historyPoints ?? 0;

    if (cond.type === 'STORY_MIN') {
        return story >= (cond.value || 0);
    }

    if (cond.type === 'FILLER_MAX') {
        return player.fillerPoints <= (cond.value || 99);
    }

    if (cond.type === 'EVENT_COMPLETED') {
        return (cond.cardIds || []).every(cardId => player.completedEvents?.includes(cardId));
    }

    if (cond.type === 'BOARD_HAS') {
        const fieldCards = player.board.blocks.flatMap(block => block.slots.map(slot => slot.cardId).filter((id): id is string => Boolean(id)));
        return (cond.cardIds || []).every(cardId => fieldCards.includes(cardId));
    }

    if (cond.type === 'LOCATION_IS') {
        if (!cond.locationId) return false;
        const block = player.board.blocks[player.board.currentBlockIndex];
        return block?.slots.some(slot => slot.cardId === cond.locationId) === true;
    }

    if (cond.type === 'AFFINITY_ACTIVE') {
        const fieldCards = player.board.blocks.flatMap(block => block.slots.map(slot => slot.cardId).filter((id): id is string => Boolean(id)));
        return fieldCards.some(cardId => {
            const card = CARDS[cardId];
            return card?.affinity?.compatibleWith?.some(compatibleId => fieldCards.includes(compatibleId)) === true;
        });
    }

    return true;
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
