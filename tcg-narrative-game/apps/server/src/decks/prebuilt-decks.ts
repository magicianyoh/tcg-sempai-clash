import { CARDS } from '@tcg/game-engine/content/cards';
import { ARCHETYPE_INFO, GAME_CONSTANTS, V2_ARCHETYPES } from '@tcg/shared/constants';
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
    customized?: boolean;
}

export type DeckObjective = 'balanced' | 'tempo' | 'recovery';

export interface SimulationDeckData extends PrebuiltDeckData {
    objective: DeckObjective;
    objectiveLabel: string;
}

const BACKGROUND_BY_ARCHETYPE: Record<string, string> = {
    SHONEN: 'bg_02',
    MECHA: 'bg_04',
    SHOJO: 'bg_03',
    ISEKAI: 'bg_01',
};

const PREBUILT_PROTAGONIST_BY_ARCHETYPE: Record<string, string> = {
    SHONEN: 'shonen-hero-dragon-ryu',
    MECHA: 'mecha-hero-brave-gai',
    SHOJO: 'shojo-hero-mage-luna',
    ISEKAI: 'isekai-hero-cheat-kai',
};

function slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function belongsToLine(card: CardData, protagonistId: string): boolean {
    return card.protagonistId === protagonistId || card.tags?.includes(`line:${protagonistId}`) === true;
}

function cardRouteId(card: CardData): string | undefined {
    return card.tags?.find(tag => tag.startsWith('route:'))?.slice('route:'.length);
}

function cardRouteLabel(card: CardData): string | undefined {
    return card.tags?.find(tag => tag.startsWith('route-label:'))?.slice('route-label:'.length);
}

function add(deck: string[], counts: Record<string, number>, card: CardData, copies = 1): number {
    const max = card.maxCopies ?? GAME_CONSTANTS.MAX_COPIES_PER_CARD;
    let added = 0;
    for (let index = 0; index < copies && deck.length < GAME_CONSTANTS.DECK_SIZE; index++) {
        if ((counts[card.id] || 0) >= max) return added;
        deck.push(card.id);
        counts[card.id] = (counts[card.id] || 0) + 1;
        added++;
    }
    return added;
}

export function buildDeckForProtagonist(
    protagonist: CardData,
    archetypeCards: CardData[],
    objective: DeckObjective = 'balanced',
    routeId?: string
): string[] {
    const deck: string[] = [];
    const counts: Record<string, number> = {};
    const lineCards = archetypeCards.filter(card => belongsToLine(card, protagonist.id));
    const events = lineCards
        .filter(card => card.type === CardType.EVENT || card.type === CardType.CLIMAX_EVENT)
        .filter(card => !routeId || cardRouteId(card) === routeId)
        .sort((a, b) => {
            const aOrder = a.type === CardType.CLIMAX_EVENT ? 99 : Number(a.tags?.find(tag => tag.startsWith('order:'))?.slice(6) || 0);
            const bOrder = b.type === CardType.CLIMAX_EVENT ? 99 : Number(b.tags?.find(tag => tag.startsWith('order:'))?.slice(6) || 0);
            return aOrder - bOrder;
        });
    const routeMaterials = lineCards.filter(card =>
        card.type === CardType.PERSONAJE || card.type === CardType.ITEM || card.type === CardType.LOCATION
    ).filter(card => !routeId || !cardRouteId(card) || cardRouteId(card) === routeId);
    const routeQuickEvents = lineCards
        .filter(card => card.type === CardType.QUICK_EVENT)
        .filter(card => !routeId || !cardRouteId(card) || cardRouteId(card) === routeId);
    const shared = archetypeCards.filter(card => card.tags?.includes(`shared:${String(protagonist.archetype).toLowerCase()}`));
    const quickEvents = shared.filter(card => card.type === CardType.QUICK_EVENT);
    const searchEvent = quickEvents.find(card => card.id.endsWith('-token-recap'));
    const recoverCard = quickEvents.find(card => card.id.endsWith('-token-last-save'));
    const searchClimax = quickEvents.find(card => card.id.endsWith('-token-resolution-key'));
    const materialPool = [...routeMaterials, ...shared.filter(card => card.type === CardType.PERSONAJE || card.type === CardType.ITEM)];

    events.forEach(card => add(deck, counts, card));
    events.forEach(event => {
        const materialRequirement = event.requirements?.find(requirement => requirement.type === 'CARD_ON_BOARD');
        if (!materialRequirement?.cardIds?.length) return;
        let missing = materialRequirement.value || 1;
        for (const cardId of materialRequirement.cardIds) {
            const material = archetypeCards.find(card => card.id === cardId);
            if (material) missing -= add(deck, counts, material);
            if (missing <= 0) return;
        }
        for (const cardId of materialRequirement.cardIds) {
            const material = archetypeCards.find(card => card.id === cardId);
            while (material && missing > 0) {
                const added = add(deck, counts, material);
                if (!added) break;
                missing -= added;
            }
            if (missing <= 0) return;
        }
        throw new Error(`Could not supply requirements for ${event.id}`);
    });
    [searchEvent, recoverCard, searchClimax].forEach(card => {
        if (card) add(deck, counts, card);
    });
    routeQuickEvents.forEach(card => add(deck, counts, card));

    const priorityUtility = objective === 'tempo'
        ? [searchEvent, searchClimax, ...routeQuickEvents]
        : objective === 'recovery'
            ? [recoverCard, recoverCard, searchEvent, ...routeQuickEvents]
            : [];
    const utility = objective === 'balanced'
        ? [...materialPool, ...routeQuickEvents, ...quickEvents]
        : [
            ...priorityUtility.filter((card): card is CardData => Boolean(card)),
            ...(objective === 'tempo' ? quickEvents : materialPool),
            ...(objective === 'tempo' ? materialPool : quickEvents),
        ];
    let cursor = 0;
    while (deck.length < GAME_CONSTANTS.DECK_SIZE && utility.length > 0 && cursor < 200) {
        add(deck, counts, utility[cursor % utility.length]);
        cursor++;
    }
    if (deck.length !== GAME_CONSTANTS.DECK_SIZE) {
        throw new Error(`Could not compose V2 deck for ${protagonist.id}`);
    }
    return deck;
}

const OBJECTIVE_LABELS: Record<DeckObjective, string> = {
    balanced: 'Equilibrado: curva estable de materiales y busqueda',
    tempo: 'Tempo: prioriza busqueda de Eventos y Climax',
    recovery: 'Recuperacion: prioriza Cementerio y resiliencia',
};

export function getSimulationDecks(): SimulationDeckData[] {
    return V2_ARCHETYPES.flatMap(archetypeId => {
        const archetypeCards = Object.values(CARDS).filter(card => card.archetype === archetypeId);
        const protagonists = archetypeCards.filter(card =>
            card.type === CardType.PROTAGONIST && card.formIndex === 0
        );
        return protagonists.flatMap(protagonist => {
            const lineCards = archetypeCards.filter(card => belongsToLine(card, protagonist.id));
            const routeCards = lineCards.filter(card => card.type === CardType.CLIMAX_EVENT);
            const routes = routeCards.length
                ? Array.from(new Map(routeCards.map(card => {
                    const id = cardRouteId(card) || 'default';
                    return [id, { id, label: cardRouteLabel(card) }];
                })).values())
                : [{ id: 'default', label: undefined }];
            const showRoute = routes.length > 1;
            const uniqueDecks = new Set<string>();
            return routes.flatMap(route => (['balanced', 'tempo', 'recovery'] as DeckObjective[]).flatMap(objective => {
                    const cards = buildDeckForProtagonist(protagonist, archetypeCards, objective, route.id === 'default' ? undefined : route.id);
                    const fingerprint = cards.slice().sort().join('|');
                    if (uniqueDecks.has(fingerprint)) return [];
                    uniqueDecks.add(fingerprint);
                    const routeLabel = showRoute ? ` - ${route.label || route.id}` : '';
                    const routeSuffix = showRoute ? `-${slug(route.id)}` : '';
                    return [{
                        id: `simulation-${slug(String(archetypeId))}-${slug(protagonist.id)}${routeSuffix}-${objective}`,
                        name: `${protagonist.name}${routeLabel} / ${OBJECTIVE_LABELS[objective].split(':')[0]}`,
                        archetypeId,
                        protagonistId: protagonist.id,
                        protagonistName: `${protagonist.name}${routeLabel}`,
                        description: OBJECTIVE_LABELS[objective],
                        objective,
                        objectiveLabel: OBJECTIVE_LABELS[objective],
                        cards,
                        backgroundId: BACKGROUND_BY_ARCHETYPE[archetypeId] || 'bg_01',
                    }];
                }));
        });
    });
}

export function getPrebuiltDecks(settings: PrebuiltDeckSettings): PrebuiltDeckData[] {
    if (!settings.enabled) return [];

    return V2_ARCHETYPES.flatMap(archetypeId => {
        if (settings.archetypes[archetypeId] === false) return [];
        const archetypeCards = Object.values(CARDS).filter(card => card.archetype === archetypeId);
        const protagonists = archetypeCards.filter(card =>
            card.type === CardType.PROTAGONIST
            && card.formIndex === 0
            && card.id === PREBUILT_PROTAGONIST_BY_ARCHETYPE[archetypeId]
        );

        return protagonists.map(protagonist => {
            const id = `prebuilt-${slug(String(archetypeId))}-${slug(protagonist.id)}`;
            const override = settings.deckOverrides?.[id];
            const info = ARCHETYPE_INFO[archetypeId];
            return {
                id,
                name: `${info.name}: ${protagonist.name}`,
                archetypeId,
                protagonistId: protagonist.id,
                protagonistName: protagonist.name,
                description: `Ruta V2 de ${protagonist.name}, con su Climax y herramientas narrativas propias.`,
                cards: override?.length ? [...override] : buildDeckForProtagonist(protagonist, archetypeCards),
                backgroundId: BACKGROUND_BY_ARCHETYPE[archetypeId] || 'bg_01',
                customized: Boolean(override?.length),
            };
        });
    });
}
