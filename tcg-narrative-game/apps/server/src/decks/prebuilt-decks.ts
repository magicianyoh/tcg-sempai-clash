import { CARDS } from '@tcg/game-engine/content/cards';
import { ARCHETYPES, ARCHETYPE_INFO, GAME_CONSTANTS } from '@tcg/shared/constants';
import { CardData, CardType } from '@tcg/shared/types';
import { PrebuiltDeckSettings } from '../store/memory.store';

export interface PrebuiltDeckData {
    id: string;
    name: string;
    archetypeId: string;
    protagonistId: string;
    protagonistName: string;
    description: string;
    cards: string[];
    backgroundId: string;
}

const BACKGROUND_BY_ARCHETYPE: Record<string, string> = {
    [ARCHETYPES.SHONEN]: 'bg_02',
    [ARCHETYPES.MECHA]: 'bg_04',
    [ARCHETYPES.HAREM_INVERSO]: 'bg_03',
    [ARCHETYPES.SLICE_OF_LIFE]: 'bg_01',
    [ARCHETYPES.SHOJO]: 'bg_03',
    [ARCHETYPES.HAREM]: 'bg_04',
    [ARCHETYPES.ISEKAI]: 'bg_01',
    [ARCHETYPES.SURVIVAL_GAME]: 'bg_02',
    [ARCHETYPES.SPOKON]: 'bg_03',
    [ARCHETYPES.KAIJU]: 'bg_02',
};

function slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function cardPriority(card: CardData, protagonist: CardData): number {
    if (card.id === protagonist.id) return 1000;
    if (isFinalForProtagonist(card, protagonist)) return 980;

    let score = 0;
    const protagonistLikes = protagonist.likesData?.likes || [];
    const protagonistDislikes = protagonist.likesData?.dislikes || [];
    const protagonistAffinity = protagonist.affinity?.compatibleWith || [];

    if (protagonistLikes.includes(card.id)) score += 140;
    if (protagonistAffinity.includes(card.id)) score += 130;
    if (card.affinity?.compatibleWith?.includes(protagonist.id)) score += 120;
    if (card.likesData?.likes?.includes(protagonist.id)) score += 50;
    if (protagonistDislikes.includes(card.id)) score -= 180;

    if (card.type === CardType.EVENT_FINAL) score += isFinalForProtagonist(card, protagonist) ? 180 : -120;
    if (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY) score += 85;
    if (card.type === CardType.PERSONAJE || card.type === CardType.CHARACTER || card.type === CardType.UNIT) score += 55;
    if (card.type === CardType.ITEM) score += 42;
    if (card.type === CardType.LOCATION) score += 36;
    if (card.type === CardType.FILLER) score -= 60;

    if (card.requirements?.some(req => req.cardIds?.includes(protagonist.id))) score += 45;
    if (card.eventPrerequisites?.length) score += 12;
    if (card.effects?.some(effect => effect.type === 'DRAW')) score += 15;
    if (card.effects?.some(effect => effect.type === 'STORY')) score += 10;
    score += strategyScore(card, protagonist);
    if (card.cost <= 2) score += 10;
    if (card.cost >= 4) score -= 5;

    return score;
}

function strategyScore(card: CardData, protagonist: CardData): number {
    const protagonistText = `${protagonist.id} ${protagonist.name} ${protagonist.description}`.toLowerCase();
    const cardText = `${card.id} ${card.name} ${card.description}`.toLowerCase();
    const effects = card.effects || [];

    let score = 0;
    const isAggro = /hot|dragon|ace|force|surviv|kaiju|hunter|attack|rival/.test(protagonistText);
    const isEngine = /training|disciplined|calm|quiet|manager|coach|scientist|support|plain/.test(protagonistText);
    const isTeam = /friend|team|harem|shojo|otome|bond|ally|love/.test(protagonistText);
    const isControl = /reluctant|calm|quiet|survival|villain|curse|dark/.test(protagonistText);

    if (isAggro) {
        if (effects.some(effect => effect.type === 'FILLER' && effect.target === 'OPPONENT')) score += 34;
        if (effects.some(effect => effect.type === 'STORY')) score += 18;
        if (/rival|attack|battle|weapon|sword|rifle|arena|monster|villain/.test(cardText)) score += 16;
    }

    if (isEngine) {
        if (effects.some(effect => effect.type === 'DRAW' || effect.type === 'EXTRA_DRAW_NEXT_TURN')) score += 28;
        if (card.type === CardType.ITEM || card.type === CardType.LOCATION) score += 18;
        if (/training|coach|mentor|lab|base|program|scroll|school|dojo/.test(cardText)) score += 16;
    }

    if (isTeam) {
        if (card.type === CardType.PERSONAJE || card.type === CardType.CHARACTER || card.type === CardType.UNIT) score += 24;
        if (card.affinity?.compatibleWith?.includes(protagonist.id) || protagonist.affinity?.compatibleWith?.includes(card.id)) score += 28;
        if (/friend|ally|partner|team|love|prince|rival|school|festival/.test(cardText)) score += 14;
    }

    if (isControl) {
        if (effects.some(effect => effect.type === 'BLOCK_CARD_TYPE' || effect.type === 'BLOCK_EVENTS')) score += 26;
        if (effects.some(effect => effect.type === 'FILLER' && (effect.value || 0) < 0)) score += 22;
        if (effects.some(effect => effect.type === 'DISCARD' || effect.type === 'REMOVE_OPPONENT_BOARD_CARD')) score += 22;
        if (/trap|ambush|limiter|shield|hideout|base|retreat|lab/.test(cardText)) score += 14;
    }

    return score;
}

function strategyLabel(protagonist: CardData): string {
    const protagonistText = `${protagonist.id} ${protagonist.name} ${protagonist.description}`.toLowerCase();
    if (/hot|dragon|ace|force|surviv|kaiju|hunter|attack|rival/.test(protagonistText)) {
        return 'presion temprana, eventos ofensivos y cierre por tempo';
    }
    if (/training|disciplined|calm|quiet|manager|coach|scientist|support|plain/.test(protagonistText)) {
        return 'motor estable de robo, items/locaciones y curva progresiva';
    }
    if (/friend|team|harem|shojo|otome|bond|ally|love/.test(protagonistText)) {
        return 'sinergias de personajes, afinidades y arco final consistente';
    }
    if (/reluctant|villain|curse|dark/.test(protagonistText)) {
        return 'control, bloqueo y recuperacion antes del final';
    }
    return 'plan balanceado de soporte, eventos y final propio';
}

function storyRequirement(card: CardData): number {
    return card.requirements?.find(requirement => requirement.type === 'STORY_MIN')?.value ?? 0;
}

function isEvent(card: CardData): boolean {
    return card.type === CardType.EVENT || card.type === CardType.EVENT_KEY || card.type === CardType.EVENT_FINAL;
}

function isFinalForProtagonist(card: CardData, protagonist: CardData): boolean {
    return card.type === CardType.EVENT_FINAL
        && card.archetype === protagonist.archetype
        && card.requirements?.some(requirement =>
            requirement.type === 'CARD_ON_BOARD'
            && requirement.cardIds?.includes(protagonist.id)
        ) === true;
}

function getReferencedCardIds(card: CardData): string[] {
    return Array.from(new Set([
        ...(card.eventPrerequisites || []),
        ...(card.requirements || []).flatMap(requirement => requirement.cardIds || []),
    ]));
}

function isPlayableForProtagonist(card: CardData, protagonist: CardData, protagonists: CardData[]): boolean {
    if (card.archetype !== protagonist.archetype) return false;
    if (card.type === CardType.PROTAGONIST) return card.id === protagonist.id;
    if (card.type === CardType.EVENT_FINAL) return isFinalForProtagonist(card, protagonist);

    const lineTags = (card.tags || []).filter(tag => tag.startsWith('line:'));
    if (lineTags.length > 0 && !lineTags.includes(`line:${protagonist.id}`)) return false;

    const otherProtagonistIds = new Set(protagonists.filter(item => item.id !== protagonist.id).map(item => item.id));
    const referencedProtagonists = getReferencedCardIds(card).filter(cardId =>
        cardId === protagonist.id || otherProtagonistIds.has(cardId)
    );
    if (referencedProtagonists.length === 0) return true;
    return referencedProtagonists.includes(protagonist.id);
}

function getProtagonistFinal(cards: CardData[], protagonist: CardData): CardData | undefined {
    return cards.find(card => isFinalForProtagonist(card, protagonist));
}

function getRequiredCardIds(card: CardData): string[] {
    return getReferencedCardIds(card);
}

function getNarrativeChain(card: CardData | undefined, cardsById: Map<string, CardData>, protagonist: CardData): CardData[] {
    if (!card) return [];

    const chain: CardData[] = [];
    const visited = new Set<string>();
    const visit = (current: CardData) => {
        for (const requiredId of getRequiredCardIds(current)) {
            if (requiredId === protagonist.id || visited.has(requiredId)) continue;
            const requiredCard = cardsById.get(requiredId);
            if (!requiredCard || requiredCard.archetype !== protagonist.archetype) continue;
            visited.add(requiredId);
            visit(requiredCard);
            chain.push(requiredCard);
        }
    };

    visit(card);
    return chain.sort((a, b) => storyRequirement(a) - storyRequirement(b) || a.cost - b.cost || a.name.localeCompare(b.name));
}

function maxCopies(card: CardData): number {
    if (card.type === CardType.PROTAGONIST) return 1;
    if (card.type === CardType.EVENT_FINAL) return 1;
    return card.maxCopies ?? GAME_CONSTANTS.MAX_COPIES_PER_CARD;
}

function pushCard(deck: string[], counts: Record<string, number>, card: CardData): boolean {
    const limit = maxCopies(card);
    const current = counts[card.id] || 0;
    if (deck.length >= GAME_CONSTANTS.DECK_SIZE || current >= limit) return false;
    deck.push(card.id);
    counts[card.id] = current + 1;
    return true;
}

function sortByStoryLine(cards: CardData[], protagonist: CardData): CardData[] {
    return [...cards].sort((a, b) => {
        const score = cardPriority(b, protagonist) - cardPriority(a, protagonist);
        if (score !== 0) return score;
        const typeScore = String(a.type).localeCompare(String(b.type));
        if (typeScore !== 0) return typeScore;
        return a.cost - b.cost || a.name.localeCompare(b.name);
    });
}

function buildDeckForProtagonist(archetypeId: string, protagonist: CardData, cards: CardData[]): string[] {
    const deck: string[] = [];
    const counts: Record<string, number> = {};
    const protagonists = cards.filter(card => card.type === CardType.PROTAGONIST);
    const playableCards = cards.filter(card => isPlayableForProtagonist(card, protagonist, protagonists));
    const sorted = sortByStoryLine(playableCards, protagonist);
    const cardsById = new Map(cards.map(card => [card.id, card]));
    const protagonistFinal = getProtagonistFinal(cards, protagonist);
    const narrativeChain = getNarrativeChain(protagonistFinal, cardsById, protagonist);
    const isAlreadyIncluded = (card: CardData) => deck.includes(card.id);

    pushCard(deck, counts, protagonist);

    narrativeChain
        .filter(card => isPlayableForProtagonist(card, protagonist, protagonists))
        .forEach(card => pushCard(deck, counts, card));
    if (protagonistFinal) {
        pushCard(deck, counts, protagonistFinal);
    }

    const supportCore = sorted.filter(card =>
        card.id !== protagonist.id &&
        card.id !== protagonistFinal?.id &&
        !narrativeChain.some(chainCard => chainCard.id === card.id) &&
        card.type !== CardType.EVENT_FINAL &&
        !isEvent(card) &&
        card.type !== CardType.FILLER &&
        (
            protagonist.likesData?.likes?.includes(card.id) ||
            protagonist.affinity?.compatibleWith?.includes(card.id) ||
            card.affinity?.compatibleWith?.includes(protagonist.id) ||
            card.requirements?.some(req => req.cardIds?.includes(protagonist.id)) ||
            card.likesData?.likes?.includes(protagonist.id)
        )
    );

    supportCore.slice(0, 7).forEach(card => pushCard(deck, counts, card));
    supportCore.slice(0, 5).forEach(card => pushCard(deck, counts, card));

    const eventPlan = sorted
        .filter(card => (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY) && !isAlreadyIncluded(card))
        .sort((a, b) => storyRequirement(a) - storyRequirement(b) || cardPriority(b, protagonist) - cardPriority(a, protagonist));

    eventPlan
        .slice(0, Math.max(4, 8 - narrativeChain.filter(isEvent).length))
        .forEach(card => pushCard(deck, counts, card));

    const tacticalSingles = sorted
        .filter(card =>
            !isAlreadyIncluded(card) &&
            card.id !== protagonist.id &&
            card.type !== CardType.PROTAGONIST &&
            card.type !== CardType.EVENT_FINAL &&
            card.type !== CardType.FILLER
        );

    tacticalSingles.slice(0, 4).forEach(card => pushCard(deck, counts, card));

    const copyCandidates = [
        ...supportCore,
        ...sorted.filter(card =>
            !isEvent(card) &&
            card.type !== CardType.PROTAGONIST &&
            card.type !== CardType.EVENT_FINAL &&
            card.type !== CardType.FILLER
        ),
        ...eventPlan.filter(card => storyRequirement(card) <= 18),
    ];

    let guard = 0;
    while (deck.length < GAME_CONSTANTS.DECK_SIZE && guard < 200) {
        for (const card of copyCandidates) {
            pushCard(deck, counts, card);
            if (deck.length >= GAME_CONSTANTS.DECK_SIZE) break;
        }
        guard++;
    }

    sorted
        .filter(card =>
            !isAlreadyIncluded(card) &&
            card.id !== protagonist.id &&
            card.type !== CardType.PROTAGONIST &&
            card.type !== CardType.EVENT_FINAL &&
            card.type !== CardType.FILLER
        )
        .forEach(card => pushCard(deck, counts, card));

    guard = 0;
    while (deck.length < GAME_CONSTANTS.DECK_SIZE && guard < 200) {
        for (const card of copyCandidates) {
            pushCard(deck, counts, card);
            if (deck.length >= GAME_CONSTANTS.DECK_SIZE) break;
        }
        guard++;
    }

    if (deck.length !== GAME_CONSTANTS.DECK_SIZE) {
        throw new Error(`Could not build prebuilt deck for ${archetypeId}/${protagonist.id}`);
    }

    if (protagonistFinal && !deck.includes(protagonistFinal.id)) {
        throw new Error(`Prebuilt deck for ${archetypeId}/${protagonist.id} is missing ${protagonistFinal.id}`);
    }

    return deck;
}

export function getPrebuiltDecks(settings: PrebuiltDeckSettings): PrebuiltDeckData[] {
    if (!settings.enabled) return [];

    return Object.values(ARCHETYPES).flatMap(archetypeId => {
        if (settings.archetypes[archetypeId] === false) return [];

        const archetypeCards = Object.values(CARDS).filter(card => card.archetype === archetypeId);
        const protagonists = archetypeCards.filter(card => card.type === CardType.PROTAGONIST);
        const archetypeInfo = ARCHETYPE_INFO[archetypeId as keyof typeof ARCHETYPE_INFO];

        return protagonists.map(protagonist => ({
            id: `prebuilt-${slug(archetypeId)}-${slug(protagonist.id)}`,
            name: `${archetypeInfo?.name || archetypeId}: ${protagonist.name}`,
            archetypeId,
            protagonistId: protagonist.id,
            protagonistName: protagonist.name,
            description: `Mazo pre-armado centrado en ${protagonist.name}: ${strategyLabel(protagonist)}. Incluye su evento final propio y evita protagonistas/finales ajenos.`,
            cards: buildDeckForProtagonist(archetypeId, protagonist, archetypeCards),
            backgroundId: BACKGROUND_BY_ARCHETYPE[archetypeId] || 'bg_01',
        }));
    });
}
