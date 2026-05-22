import {
    MatchState,
    PlayerState,
    CardData,
    CardType,
    CardRequirement,
    ValidationResult,
    TimelineBlock
} from '@tcg/shared/types';
import { CARDS } from '../content/cards';
import { GAME_CONSTANTS } from '@tcg/shared/constants';

export function evaluateRequirements(
    state: MatchState,
    playerIndex: number,
    requirements: CardRequirement[]
): ValidationResult {
    const reasons: string[] = [];
    const player = state.players[playerIndex];

    for (const req of requirements) {
        switch (req.type) {

            case 'STORY_MIN':
                const story = player.storyPoints ?? player.historyPoints ?? 0;
                if (story < (req.value || 0)) {
                    reasons.push(`Requiere ${req.value} SP (Story Points), tienes ${story}.`);
                }
                break;

            case 'FILLER_MAX':
                // Note: Hard cap of 10 usually blocks events entirely, this might be for specific cards
                if (player.fillerPoints > (req.value || 99)) {
                    reasons.push(`Demasiados FP (Filler Points): ${player.fillerPoints}/${req.value}.`);
                }
                break;

            case 'EVENT_COMPLETED':
                if (req.cardIds) {
                    const missing = req.cardIds.filter(id => !player.completedEvents.includes(id));
                    if (missing.length > 0) {
                        const names = missing.map(id => CARDS[id]?.name || id).join(', ');
                        reasons.push(`Requiere completar evento(s): ${names}.`);
                    }
                }
                break;

            // Checks if board has specific cards/types
            case 'CARD_ON_BOARD':
                let foundCount = 0;
                player.board.blocks.forEach(block => {
                    block.slots.forEach(slot => {
                        if (slot.cardId) {
                            const card = CARDS[slot.cardId];
                            if (!card) return;

                            let matches = true;
                            if (req.cardIds && !req.cardIds.includes(card.id)) matches = false;
                            if (req.cardType && card.type !== req.cardType) matches = false;
                            if (req.tag && !card.tags?.includes(req.tag)) matches = false;
                            if (req.archetype && card.archetype !== req.archetype) matches = false;

                            if (matches) foundCount++;
                        }
                    });
                });
                if (foundCount < (req.value || 1) && req.cardIds?.length) {
                    foundCount += req.cardIds.filter(id => wasCardUsedInCompletedArc(player, id)).length;
                }

                if (foundCount < (req.value || 1)) {
                    const criteria = [];
                    if (req.cardType) criteria.push(`Tipo ${req.cardType}`);
                    if (req.tag) criteria.push(`Tag ${req.tag}`);
                    if (req.cardIds) criteria.push(`[Específicas]`);

                    reasons.push(`Requiere ${req.value || 1} carta(s) en campo: ${criteria.join(' + ')}.`);
                }
                break;
        }
    }

    return {
        ok: reasons.length === 0,
        reasons
    };
}

function wasCardUsedInCompletedArc(player: PlayerState, cardId: string): boolean {
    return player.board.blocks.some(block =>
        block.eventCompleted &&
        block.slots.some(slot => slot.cardId === cardId)
    );
}

export function getEffectiveRequirements(
    state: MatchState,
    playerIndex: number,
    requirements: CardRequirement[]
): CardRequirement[] {
    const player = state.players[playerIndex];
    const hasReduction = player.statusEffects?.some(effect =>
        effect.type === 'NEXT_EVENT_REDUCE_REQUIREMENT' && effect.turnsRemaining > 0
    );
    if (!hasReduction || requirements.length <= 1) return requirements;

    const removeIndex = [...requirements]
        .map((req, index) => ({ req, index }))
        .reverse()
        .find(item => item.req.type === 'CARD_ON_BOARD' || item.req.type === 'EVENT_COMPLETED')?.index;

    if (removeIndex === undefined) return requirements.slice(0, -1);
    return requirements.filter((_, index) => index !== removeIndex);
}

export function canPlayCard(
    state: MatchState,
    playerIndex: number,
    cardId: string,
    target?: { blockIndex?: number; position?: string; isEventOrb?: boolean }
): ValidationResult {
    const player = state.players[playerIndex];
    const card = CARDS[cardId];

    if (!card) return { ok: false, reasons: ['Carta inválida'] };

    // 1. Check strict turn rules
    if (state.activePlayerId !== player.username) {
        // Technically server checks this, but useful fallback
        return { ok: false, reasons: ['No es tu turno'] };
    }

    // 2. Check cost
    // Assumes energy/actions system. If we limit plays per turn (max 3), checked elsewhere usually.
    // Assuming cost check is handled by "plays remaining" logic in main loop, 
    // but if cards have specific 'cost' property:
    if (card.cost > 0) {
        // We defined cost but didn't strictly define separate "Energy" resource in types yet 
        // besides plays-per-turn. Phase 2 usually implies Action Points or just card count limit.
        // For now, ignoring numerical cost check unless resource added.
    }

    const blockedType = player.statusEffects?.find(effect =>
        effect.type === 'BLOCK_CARD_TYPE' &&
        effect.turnsRemaining > 0 &&
        effect.cardType === card.type
    );
    if (blockedType) {
        return { ok: false, reasons: [blockedType.message || `No puedes jugar cartas de ${card.type}`] };
    }

    const blockedCard = player.statusEffects?.find(effect =>
        effect.type === 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN' &&
        effect.turnsRemaining > 0 &&
        effect.cardId === cardId
    );
    if (blockedCard) {
        return { ok: false, reasons: [blockedCard.message || `No puedes jugar ${card.name} este turno.`] };
    }

    // 3. Event Specific Checks
    if (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY || card.type === CardType.EVENT_FINAL) {

        // Target must be event orb
        if (!target?.isEventOrb) {
            return { ok: false, reasons: ['Los eventos van al centro'] };
        }

        // Filler Cap Check
        if (!player.canPlayEvents || (player.fillerPoints >= GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD && player.board.currentBlockIndex >= 3)) {
            return { ok: false, reasons: [`Bloqueado por exceso de FP (Filler Points) (${GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD}+)`] };
        }

        // Requirements
        if (card.requirements) {
            const reqResult = evaluateRequirements(state, playerIndex, getEffectiveRequirements(state, playerIndex, card.requirements));
            if (!reqResult.ok) return reqResult;
        }

        // Check if slot available (if specific block targeting is used)
        if (target.blockIndex !== undefined) {
            const block = player.board.blocks[target.blockIndex];
            if (!block) return { ok: false, reasons: ['Bloque inválido'] };
            if (block.eventSubmitted) return { ok: false, reasons: ['Evento ya activo en este bloque'] }; // eventSubmitted logic might need update in types
        }

    } else {
        // Normal Cards
        if (target?.isEventOrb) {
            return { ok: false, reasons: ['Solo eventos van al centro'] };
        }

        if (target?.blockIndex !== undefined && target?.position) {
            const block = player.board.blocks[target.blockIndex];
            const slot = block.slots.find(s => s.position === target.position);

            if (!slot) return { ok: false, reasons: ['Slot no encontrado'] };
            if (slot.cardId) return { ok: false, reasons: ['Slot ocupado'] };
        }
    }

    return { ok: true, reasons: [] };
}

export function canReturnToHand(
    state: MatchState,
    playerIndex: number,
    blockIndex: number,
    position: string
): ValidationResult {
    const player = state.players[playerIndex];

    if (state.activePlayerId !== player.username) {
        return { ok: false, reasons: ['No es tu turno'] };
    }

    const block = player.board.blocks[blockIndex];
    if (!block) return { ok: false, reasons: ['Bloque no existe'] };

    const slot = block.slots.find(s => s.position === position);
    if (!slot || !slot.cardId) return { ok: false, reasons: ['Slot vacío'] };

    if (slot.placedTurn !== undefined && slot.placedTurn !== state.turnNumber) {
        return { ok: false, reasons: ['La carta ya quedo fijada al campo'] };
    }

    // Rule: Cannot return if block has active event?
    // Often returning valid cards breaks the event requirements if we re-check dynamically.
    // If event is just placed but not resolved -> preventing exploits.
    if (!block.eventCompleted && block.eventSlot) {
        // If there's an active event in progress, maybe we lock the cards?
        // Let's decide: YES, lock cards supporting an active event to prevent easy cycling.
        return { ok: false, reasons: ['Cartas bloqueadas por Evento activo'] };
    }

    // Locked status (from effects)
    // if (player.lockedSlots.includes(...)) ...

    return { ok: true, reasons: [] };
}
