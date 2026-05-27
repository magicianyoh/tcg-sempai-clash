import {
    MatchState,
    PlayerState,
    CardData,
    CardType,
    CardRequirement,
    ValidationResult
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

            case 'FILLER_MIN':
                if (player.fillerPoints < (req.value || 0)) {
                    reasons.push(`Requiere ${req.value} FP (Filler Points), tienes ${player.fillerPoints}.`);
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

            case 'EVENT_COUNT_MIN':
                if (player.completedEvents.length < (req.value || 1)) {
                    reasons.push(`Requiere completar ${req.value || 1} Evento(s); completaste ${player.completedEvents.length}.`);
                }
                break;

            case 'DISCARD_FROM_HAND':
                if (player.hand.length - 1 < (req.value || 1)) {
                    reasons.push(`Requiere descartar ${req.value || 1} carta(s) adicional(es) de la mano.`);
                }
                break;

            // Checks if board has specific cards/types
            case 'CARD_ON_BOARD':
                let foundCount = 0;
                const currentBlock = player.board.blocks[player.board.currentBlockIndex];
                currentBlock?.slots.forEach(slot => {
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
                if (foundCount < (req.value || 1) && req.cardIds?.length) {
                    foundCount += req.cardIds.filter(id => isImplicitCompletedProtagonistRequirement(player, id)).length;
                }

                if (foundCount < (req.value || 1)) {
                    const criteria = [];
                    if (req.cardType) criteria.push(`Tipo ${req.cardType}`);
                    if (req.tag) criteria.push(`Tag ${req.tag}`);
                    if (req.cardIds) criteria.push(`[Específicas]`);

                    reasons.push(`Requiere ${req.value || 1} carta(s) en campo: ${criteria.join(' + ')}.`);
                }
                break;

            case 'CARD_IN_COMPLETED_ARC': {
                let historicalCount = 0;
                player.board.blocks.filter(block => block.eventCompleted).forEach(block => {
                    block.slots.forEach(slot => {
                        if (!slot.cardId) return;
                        const card = CARDS[slot.cardId];
                        if (!card) return;
                        if (req.cardIds && !req.cardIds.includes(card.id)) return;
                        if (req.cardType && card.type !== req.cardType) return;
                        if (req.tag && !card.tags?.includes(req.tag)) return;
                        if (req.archetype && card.archetype !== req.archetype) return;
                        historicalCount++;
                    });
                });
                if (historicalCount < (req.value || 1)) {
                    reasons.push(`Requiere ${req.value || 1} carta(s) compatible(s) revelada(s) en un arco previo.`);
                }
                break;
            }
        }
    }

    return {
        ok: reasons.length === 0,
        reasons
    };
}

function protagonistUsesFillerEconomy(player: PlayerState): boolean {
    return Boolean(player.protagonistId && CARDS[player.protagonistId]?.costResource === 'FP');
}

function isImplicitCompletedProtagonistRequirement(player: PlayerState, cardId: string): boolean {
    const card = CARDS[cardId];
    if (card?.type !== CardType.PROTAGONIST) return false;
    return Object.values(CARDS).some(event =>
        event.type === CardType.EVENT &&
        event.tags?.includes(`line:${cardId}`) &&
        event.tags?.includes('order:01') &&
        player.completedEvents.includes(event.id)
    );
}

export function evaluateEventPrerequisites(player: PlayerState, card: CardData): ValidationResult {
    const missing = (card.eventPrerequisites || []).filter(id => !player.completedEvents.includes(id));
    if (missing.length === 0) {
        return { ok: true, reasons: [] };
    }

    const names = missing.map(id => CARDS[id]?.name || id).join(', ');
    return { ok: false, reasons: [`Requiere completar evento(s): ${names}.`] };
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

    // 2. V2 card costs consume either SP or FP.
    const resource = card.costResource || 'SP';
    const balance = resource === 'FP' ? player.fillerPoints : (player.storyPoints ?? player.historyPoints ?? 0);
    if (card.cost > balance) {
        return { ok: false, reasons: [`Necesitas ${card.cost} ${resource} para jugar ${card.name}; tienes ${balance}.`] };
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
    if (card.type === CardType.PROTAGONIST) {
        return { ok: false, reasons: ['El protagonista entra automaticamente como avatar del deck.'] };
    }
    if (card.tags?.includes('external-only')) {
        return { ok: false, reasons: ['Esta carta solo puede permanecer en la mano o ser descartada por un efecto.'] };
    }

    if (card.type === CardType.PLOT_TWIST_EVENT && state.phase !== 'climax_response') {
        return { ok: false, reasons: ['El Plot-Twist solo aparece como respuesta a un Climax.'] };
    }

    if (card.type === CardType.QUICK_EVENT || card.type === CardType.TOKEN) {
        const requirementResult = evaluateRequirements(state, playerIndex, card.requirements || []);
        if (!requirementResult.ok) return requirementResult;
    }

    if (state.phase === 'climax_response' && (
        card.type === CardType.EVENT || card.type === CardType.CLIMAX_EVENT || card.type === CardType.EVENT_FINAL
    )) {
        return { ok: false, reasons: ['Durante la respuesta solo puedes activar el Plot-Twist.'] };
    }

    if (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY || card.type === CardType.EVENT_FINAL || card.type === CardType.CLIMAX_EVENT || card.type === CardType.PLOT_TWIST_EVENT) {

        // Target must be event orb
        if (!target?.isEventOrb) {
            return { ok: false, reasons: ['Los eventos van al centro'] };
        }

        // Filler Cap Check
        if (!player.canPlayEvents || (
            !protagonistUsesFillerEconomy(player)
            && player.fillerPoints >= GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD
            && player.board.currentBlockIndex >= 3
        )) {
            return { ok: false, reasons: [`Bloqueado por exceso de FP (Filler Points) (${GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD}+)`] };
        }

        const prereqResult = evaluateEventPrerequisites(player, card);
        if (!prereqResult.ok) return prereqResult;

        const requirementResult = evaluateRequirements(
            state,
            playerIndex,
            getEffectiveRequirements(state, playerIndex, card.requirements || [])
        );
        if (!requirementResult.ok) return requirementResult;

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
    void state;
    void playerIndex;
    void blockIndex;
    void position;
    return { ok: false, reasons: ['Las cartas colocadas permanecen en su arco'] };
}
