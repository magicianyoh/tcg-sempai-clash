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

    let score = 0;
    const protagonistLikes = protagonist.likesData?.likes || [];
    const protagonistDislikes = protagonist.likesData?.dislikes || [];
    const protagonistAffinity = protagonist.affinity?.compatibleWith || [];

    if (protagonistLikes.includes(card.id)) score += 140;
    if (protagonistAffinity.includes(card.id)) score += 130;
    if (card.affinity?.compatibleWith?.includes(protagonist.id)) score += 120;
    if (card.likesData?.likes?.includes(protagonist.id)) score += 50;
    if (protagonistDislikes.includes(card.id)) score -= 180;

    if (card.type === CardType.EVENT_FINAL) score += 95;
    if (card.type === CardType.EVENT || card.type === CardType.EVENT_KEY) score += 85;
    if (card.type === CardType.PERSONAJE || card.type === CardType.CHARACTER || card.type === CardType.UNIT) score += 55;
    if (card.type === CardType.ITEM) score += 42;
    if (card.type === CardType.LOCATION) score += 36;
    if (card.type === CardType.FILLER) score -= 60;

    if (card.requirements?.some(req => req.cardIds?.includes(protagonist.id))) score += 45;
    if (card.eventPrerequisites?.length) score += 12;
    if (card.effects?.some(effect => effect.type === 'DRAW')) score += 15;
    if (card.effects?.some(effect => effect.type === 'STORY')) score += 10;
    if (card.cost <= 2) score += 10;
    if (card.cost >= 4) score -= 5;

    return score;
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
    const sorted = sortByStoryLine(cards, protagonist);

    pushCard(deck, counts, protagonist);

    const explicitStoryLine = sorted.filter(card =>
        card.id !== protagonist.id &&
        (
            protagonist.likesData?.likes?.includes(card.id) ||
            protagonist.affinity?.compatibleWith?.includes(card.id) ||
            card.affinity?.compatibleWith?.includes(protagonist.id) ||
            card.requirements?.some(req => req.cardIds?.includes(protagonist.id))
        )
    );
    explicitStoryLine.forEach(card => pushCard(deck, counts, card));

    sorted
        .filter(card => card.type === CardType.EVENT || card.type === CardType.EVENT_KEY)
        .forEach(card => pushCard(deck, counts, card));

    sorted
        .filter(card => card.type === CardType.EVENT_FINAL)
        .forEach(card => pushCard(deck, counts, card));

    sorted.forEach(card => pushCard(deck, counts, card));

    const copyCandidates = sorted.filter(card =>
        card.id !== protagonist.id &&
        card.type !== CardType.EVENT_FINAL &&
        card.type !== CardType.FILLER
    );

    let guard = 0;
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
            description: `Mazo pre-armado centrado en ${protagonist.name}, priorizando afinidades, likes, eventos clave y cierre de arco.`,
            cards: buildDeckForProtagonist(archetypeId, protagonist, archetypeCards),
            backgroundId: BACKGROUND_BY_ARCHETYPE[archetypeId] || 'bg_01',
        }));
    });
}
