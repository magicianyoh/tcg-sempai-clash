import { CardData, CardEffect, CardType, MatchState, PlayerState, TimelineSlot } from '@tcg/shared/types';
import { GAME_CONSTANTS } from '@tcg/shared/constants';
import { CARDS } from '@tcg/game-engine/content/cards';
import { canPlayCard, evaluateEventPrerequisites, evaluateRequirements, getEffectiveRequirements } from '@tcg/game-engine/rules/validation';
import { getFieldCards } from '@tcg/game-engine/rules/affinity';
import type { CpuDifficulty } from './match.service';

export interface CpuPlayPlan {
    cardId: string;
    isEventActivation: boolean;
    slotPosition?: TimelineSlot['position'];
    score: number;
    reason: string;
}

interface CpuContext {
    match: MatchState;
    cpuIndex: number;
    humanIndex: number;
    cpu: PlayerState;
    opponent: PlayerState;
    difficulty: CpuDifficulty;
    blockIndex: number;
    fieldCards: string[];
    opponentFieldCards: string[];
    opponentThreat: number;
}

const ARCHETYPE_PRIORITIES: Record<string, Partial<Record<CardType, number>>> = {
    SHONEN: {
        [CardType.PROTAGONIST]: 42,
        [CardType.PERSONAJE]: 28,
        [CardType.EVENT]: 34,
        [CardType.TOKEN]: 24,
        [CardType.EVENT_FINAL]: 120,
    },
    MECHA: {
        [CardType.PROTAGONIST]: 38,
        [CardType.ITEM]: 34,
        [CardType.LOCATION]: 25,
        [CardType.EVENT]: 32,
        [CardType.EVENT_FINAL]: 120,
    },
    HAREM_INVERSO: {
        [CardType.PROTAGONIST]: 38,
        [CardType.PERSONAJE]: 34,
        [CardType.ITEM]: 22,
        [CardType.EVENT]: 30,
        [CardType.EVENT_FINAL]: 120,
    },
    SLICE_OF_LIFE: {
        [CardType.PROTAGONIST]: 36,
        [CardType.LOCATION]: 30,
        [CardType.PERSONAJE]: 28,
        [CardType.EVENT]: 28,
        [CardType.EVENT_FINAL]: 120,
    },
    SHOJO: {
        [CardType.PROTAGONIST]: 38,
        [CardType.PERSONAJE]: 32,
        [CardType.ITEM]: 24,
        [CardType.EVENT]: 30,
        [CardType.EVENT_FINAL]: 120,
    },
    HAREM: {
        [CardType.PROTAGONIST]: 38,
        [CardType.PERSONAJE]: 34,
        [CardType.EVENT]: 30,
        [CardType.EVENT_FINAL]: 120,
    },
    ISEKAI: {
        [CardType.PROTAGONIST]: 40,
        [CardType.ITEM]: 28,
        [CardType.PERSONAJE]: 26,
        [CardType.EVENT]: 34,
        [CardType.EVENT_FINAL]: 120,
    },
    SURVIVAL_GAME: {
        [CardType.PROTAGONIST]: 36,
        [CardType.ITEM]: 30,
        [CardType.PERSONAJE]: 26,
        [CardType.EVENT]: 36,
        [CardType.EVENT_FINAL]: 120,
    },
    SPOKON: {
        [CardType.PROTAGONIST]: 38,
        [CardType.PERSONAJE]: 32,
        [CardType.LOCATION]: 26,
        [CardType.EVENT]: 34,
        [CardType.EVENT_FINAL]: 120,
    },
    KAIJU: {
        [CardType.PROTAGONIST]: 36,
        [CardType.ITEM]: 32,
        [CardType.PERSONAJE]: 30,
        [CardType.EVENT]: 36,
        [CardType.EVENT_FINAL]: 120,
    },
};

export function chooseCpuPlay(match: MatchState, cpuIndex: number): CpuPlayPlan | null {
    const cpu = match.players[cpuIndex];
    const humanIndex = cpuIndex === 0 ? 1 : 0;
    const opponent = match.players[humanIndex];
    const cpuOpponent = match.cpuOpponent;
    if (!cpuOpponent) return null;

    const blockIndex = cpu.board.currentBlockIndex;
    const block = cpu.board.blocks[blockIndex];
    if (!block) return null;

    const context: CpuContext = {
        match,
        cpuIndex,
        humanIndex,
        cpu,
        opponent,
        difficulty: cpuOpponent.difficulty,
        blockIndex,
        fieldCards: getFieldCards(cpu.board),
        opponentFieldCards: getFieldCards(opponent.board),
        opponentThreat: estimateOpponentThreat(opponent, match),
    };

    const plans = [
        ...buildEventPlans(context),
        ...buildBoardPlans(context),
    ];

    if (plans.length === 0) return null;

    plans.sort((a, b) => b.score - a.score);
    const viable = plans.filter(plan => {
        if (context.difficulty === 'hard') return true;
        if (context.difficulty === 'normal') return plan.score >= 18;
        return plan.score >= 12;
    });
    if (viable.length === 0) return null;

    viable.sort((a, b) => b.score - a.score);

    if (context.difficulty === 'easy' && viable.length > 1) {
        if (Math.random() < 0.3) return null;
        return viable[Math.floor(Math.random() * Math.min(3, viable.length))];
    }

    if (context.difficulty === 'normal' && viable.length > 1 && Math.random() < 0.12) {
        return viable[1];
    }

    return viable[0];
}

function buildEventPlans(context: CpuContext): CpuPlayPlan[] {
    return context.cpu.hand.flatMap(cardId => {
        const card = CARDS[cardId];
        if (!card || !isEventCard(card)) return [];

        const validation = canPlayCard(context.match, context.cpuIndex, cardId, {
            blockIndex: context.blockIndex,
            isEventOrb: true,
        });
        if (!validation.ok) return [];

        const prereqValidation = evaluateEventPrerequisites(context.cpu, card);
        if (!prereqValidation.ok) return [];
        const requirementValidation = evaluateRequirements(
            context.match,
            context.cpuIndex,
            getEffectiveRequirements(context.match, context.cpuIndex, card.requirements || [])
        );
        if (!requirementValidation.ok) return [];

        const score = scoreEventCard(card, context);
        return [{
            cardId,
            isEventActivation: true,
            score,
            reason: `event:${card.type}:threat=${context.opponentThreat}`,
        }];
    });
}

function buildBoardPlans(context: CpuContext): CpuPlayPlan[] {
    const block = context.cpu.board.blocks[context.blockIndex];
    const emptySlots = block.slots.filter(slot => !slot.cardId);
    if (emptySlots.length === 0) return [];

    const plans: CpuPlayPlan[] = [];
    for (const cardId of context.cpu.hand) {
        const card = CARDS[cardId];
        if (!card || isEventCard(card)) continue;

        for (const slot of emptySlots) {
            const validation = canPlayCard(context.match, context.cpuIndex, cardId, {
                blockIndex: context.blockIndex,
                position: slot.position,
                isEventOrb: false,
            });
            if (!validation.ok) continue;

            const score = scoreBoardCard(card, context, slot.position);
            plans.push({
                cardId,
                isEventActivation: false,
                slotPosition: slot.position,
                score,
                reason: `board:${card.type}:${slot.position}:threat=${context.opponentThreat}`,
            });
        }
    }

    return plans;
}

function scoreEventCard(card: CardData, context: CpuContext): number {
    let score = scoreByArchetype(card, context) + scoreEffects(card.effects, context);

    if (card.type === CardType.EVENT_FINAL) {
        score += 100;
        if (context.opponentThreat >= 80) score += 25;
    }

    if (card.requirements?.some(req => req.type === 'EVENT_COMPLETED')) {
        score += 10 + context.cpu.completedEvents.length * 2;
    }

    if (context.opponent.fillerPoints >= GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD - 2) {
        score += card.effects.some(effect => effect.type === 'FILLER' && effect.target === 'OPPONENT') ? 30 : 0;
    }

    if (context.cpu.fillerPoints >= GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD - 2) {
        score += card.effects.some(effect => effect.type === 'FILLER' && effect.target !== 'OPPONENT' && (effect.value || 0) < 0) ? 35 : -15;
    }

    return applyDifficultyNoise(score, context.difficulty);
}

function scoreBoardCard(card: CardData, context: CpuContext, position: TimelineSlot['position']): number {
    let score = scoreByArchetype(card, context) + scoreEffects(card.effects, context);

    const fieldCards = context.fieldCards;
    if (card.type === CardType.PROTAGONIST && !fieldCards.some(id => CARDS[id]?.type === CardType.PROTAGONIST)) {
        score += 35;
    }

    score += scoreCurrentEventNeeds(card, context);
    score += scoreHandEventNeeds(card, context);

    score += scoreAffinity(card, context);
    score += scoreLikes(card, context);
    score += scoreSlot(position, context);

    if (context.opponentThreat >= 75) {
        score += card.effects.some(effect => effect.type === 'FILLER' && effect.target === 'OPPONENT') ? 18 : 0;
        score += card.effects.some(effect => effect.type === 'DRAW') ? 8 : 0;
    }

    return applyDifficultyNoise(score, context.difficulty);
}

function scoreCurrentEventNeeds(card: CardData, context: CpuContext): number {
    const block = context.cpu.board.blocks[context.blockIndex];
    const event = block?.eventSlot ? CARDS[block.eventSlot] : undefined;
    if (!event) return 0;
    return scoreCardAgainstRequirements(card, event.requirements || []) + 20;
}

function scoreHandEventNeeds(card: CardData, context: CpuContext): number {
    const nextEvents = context.cpu.hand
        .map(id => CARDS[id])
        .filter((event): event is CardData => Boolean(event) && isEventCard(event));
    return Math.max(0, ...nextEvents.map(event => scoreCardAgainstRequirements(card, event.requirements || [])));
}

function scoreCardAgainstRequirements(card: CardData, requirements: NonNullable<CardData['requirements']>): number {
    let score = 0;
    for (const requirement of requirements) {
        if (requirement.type !== 'CARD_ON_BOARD') continue;
        if (requirement.cardIds?.includes(card.id)) score += 36;
        if (requirement.cardType && requirement.cardType === card.type) score += 30;
        if (requirement.tag && card.tags?.includes(requirement.tag)) score += 24;
        if (requirement.archetype && card.archetype === requirement.archetype) score += 12;
    }
    return score;
}

function scoreByArchetype(card: CardData, context: CpuContext): number {
    const archetypeId = matchCpuArchetype(context);
    const archetypeWeights = ARCHETYPE_PRIORITIES[archetypeId] || {};
    return archetypeWeights[card.type] || 20;
}

function scoreEffects(effects: CardEffect[], context: CpuContext): number {
    return effects.reduce((total, effect) => {
        const value = effect.value || 0;
        switch (effect.type) {
            case 'STORY':
                return total + value * 9;
            case 'FILLER':
                if (effect.target === 'OPPONENT') {
                    const fillerValue = context.cpu.board.currentBlockIndex >= 3 ? 10 : 4;
                    return total + value * fillerValue;
                }
                return total + (value < 0 ? Math.abs(value) * (context.cpu.fillerPoints >= 6 ? 12 : 6) : -value * 5);
            case 'DRAW':
                return total + value * 8;
            case 'DISCARD':
                return total + (effect.target === 'OPPONENT' ? value * 9 : -value * 8);
            case 'BLOCK_CARD_TYPE':
                return total + (effect.target === 'OPPONENT' ? 28 : 4);
            case 'EXTRA_DRAW_NEXT_TURN':
                return total + Math.max(1, value) * 10;
            case 'REMOVE_OPPONENT_BOARD_CARD':
                return total + (effect.target === 'OPPONENT' ? 34 : 0);
            case 'BLOCK_RANDOM_HAND_CARD_NEXT_TURN':
                return total + (effect.target === 'OPPONENT' ? 26 : 0);
            case 'NEXT_EVENT_REDUCE_REQUIREMENT':
                return total + 18;
            case 'VICTORY':
                return total + 120;
            default:
                return total;
        }
    }, 0);
}

function scoreAffinity(card: CardData, context: CpuContext): number {
    const compatible = card.affinity?.compatibleWith || [];
    const compatibleOnBoard = compatible.filter(id => context.fieldCards.includes(id)).length;
    const boardCardsThatLikeThis = context.fieldCards.filter(id => CARDS[id]?.affinity?.compatibleWith?.includes(card.id)).length;
    return (compatibleOnBoard + boardCardsThatLikeThis) * 18;
}

function scoreLikes(card: CardData, context: CpuContext): number {
    let score = 0;
    for (const fieldCardId of context.fieldCards) {
        const fieldCard = CARDS[fieldCardId];
        if (!fieldCard) continue;
        if (fieldCard.likesData?.likes?.includes(card.id)) score += 10;
        if (fieldCard.likesData?.dislikes?.includes(card.id)) score -= 35;
    }

    if (card.likesData?.likes) {
        score += card.likesData.likes.filter(id => context.fieldCards.includes(id)).length * 10;
    }

    return score;
}

function scoreSlot(position: TimelineSlot['position'], context: CpuContext): number {
    const archetypeId = matchCpuArchetype(context);
    const slotPreference: Record<string, Partial<Record<TimelineSlot['position'], number>>> = {
        MECHA: { top: 4, bottom: 3 },
        SHONEN: { top: 3, left: 2 },
        HAREM_INVERSO: { left: 4, right: 4 },
        HAREM: { left: 4, right: 4 },
        SLICE_OF_LIFE: { bottom: 4, right: 2 },
        SHOJO: { left: 3, right: 3 },
        ISEKAI: { top: 4, right: 2 },
        SURVIVAL_GAME: { bottom: 4, left: 2 },
        SPOKON: { top: 3, right: 3 },
        KAIJU: { top: 4, bottom: 2 },
    };

    return slotPreference[archetypeId]?.[position] || 0;
}

function estimateOpponentThreat(opponent: PlayerState, match: MatchState): number {
    const fieldCards = getFieldCards(opponent.board);
    const recentOpponentEvents = match.log
        .slice(-8)
        .filter(entry => entry.player === opponent.username && entry.action === 'event_complete')
        .length;

    return opponent.storyPoints * 3
        + (GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD - Math.min(opponent.fillerPoints, GAME_CONSTANTS.FILLER_BLOCK_THRESHOLD)) * 2
        + opponent.completedEvents.length * 8
        + fieldCards.length * 3
        + recentOpponentEvents * 12;
}

function matchCpuArchetype(context: CpuContext): string {
    return String(context.match.cpuOpponent?.archetypeId || CARDS[context.cpu.hand[0]]?.archetype || '');
}

function applyDifficultyNoise(score: number, difficulty: CpuDifficulty): number {
    if (difficulty === 'easy') return score + Math.random() * 30 - 15;
    if (difficulty === 'normal') return score + Math.random() * 10 - 5;
    return score;
}

function isEventCard(card: CardData): boolean {
    return card.type === CardType.EVENT || card.type === CardType.EVENT_FINAL || card.type === CardType.EVENT_KEY;
}
