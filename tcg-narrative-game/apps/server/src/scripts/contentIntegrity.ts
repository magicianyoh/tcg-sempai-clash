import { CARDS } from '@tcg/game-engine/content/cards';
import { GAME_CONSTANTS, V2_ARCHETYPES } from '@tcg/shared/constants';
import { CardType } from '@tcg/shared/types';
import { auditCards } from '../content/card-catalog';
import { getPrebuiltDecks } from '../decks/prebuilt-decks';

const cards = Object.values(CARDS);
const decks = getPrebuiltDecks({ enabled: true, archetypes: {} });
const issues: string[] = auditCards().issues
    .filter(issue => issue.severity === 'error')
    .map(issue => `${issue.cardId} ${issue.field}: ${issue.message}`);
const allowed = new Set(V2_ARCHETYPES);

function routeId(card: { tags?: string[] }): string {
    return card.tags?.find(tag => tag.startsWith('route:'))?.slice('route:'.length) || 'default';
}

for (const card of cards) {
    if (!allowed.has(card.archetype as any)) issues.push(`${card.id} uses inactive archetype ${card.archetype}`);
    if (![CardType.PROTAGONIST, CardType.PERSONAJE].includes(card.type as any)
        && (card.likesData?.likes?.length || card.likesData?.dislikes?.length)) {
        issues.push(`${card.id} exposes affinity outside protagonist/character cards`);
    }
}

for (const archetype of V2_ARCHETYPES) {
    const archetypeCards = cards.filter(card => card.archetype === archetype);
    const protagonists = archetypeCards.filter(card => card.type === CardType.PROTAGONIST && card.formIndex === 0);
    const quickEvents = archetypeCards.filter(card => card.type === CardType.QUICK_EVENT);
    if (protagonists.length < 4) issues.push(`${archetype} has only ${protagonists.length} base protagonists`);
    if (quickEvents.length < 10) issues.push(`${archetype} has only ${quickEvents.length} Quick Events`);

    for (const hero of protagonists) {
        const lineCards = archetypeCards.filter(card => card.protagonistId === hero.id);
        const forms = lineCards.filter(card => card.type === CardType.PROTAGONIST);
        const routes = Array.from(new Set(lineCards
            .filter(card => card.type === CardType.EVENT || card.type === CardType.CLIMAX_EVENT)
            .map(routeId)));
        const routeLengths = routes.map(route => lineCards.filter(card =>
            routeId(card) === route && (card.type === CardType.EVENT || card.type === CardType.CLIMAX_EVENT)
        ).length);
        if (forms.length !== hero.totalForms) issues.push(`${hero.id} has ${forms.length}/${hero.totalForms} forms`);
        if (Math.max(...routeLengths) !== hero.totalForms) issues.push(`${hero.id} longest route/form chain is inconsistent`);
        for (const route of routes) {
            const normalEvents = lineCards
                .filter(card => card.type === CardType.EVENT && routeId(card) === route)
                .sort((left, right) => String(left.tags?.find(tag => tag.startsWith('order:')) || '').localeCompare(String(right.tags?.find(tag => tag.startsWith('order:')) || '')));
            const climax = lineCards.filter(card => card.type === CardType.CLIMAX_EVENT && routeId(card) === route);
            const plot = lineCards.filter(card => card.type === CardType.PLOT_TWIST_EVENT && routeId(card) === route);
            if (normalEvents.length + climax.length < 4 || normalEvents.length + climax.length > GAME_CONSTANTS.MAX_BLOCKS) {
                issues.push(`${hero.id}/${route} must have between 4 and 7 total Events`);
            }
            if (climax.length !== 1) issues.push(`${hero.id}/${route} must have exactly one Climax`);
            if (plot.length !== 1) issues.push(`${hero.id}/${route} must have exactly one Plot-Twist`);
            const openingEvent = normalEvents[0];
            const openingMaterials = openingEvent?.requirements
                ?.filter(requirement => requirement.type === 'CARD_ON_BOARD')
                .flatMap(requirement => requirement.cardIds || []) || [];
            if (!openingEvent || openingMaterials.length === 0) {
                issues.push(`${hero.id}/${route} needs an opening Event with at least one field material`);
            } else if (openingMaterials.some(cardId => !cards.some(card => card.id === cardId && card.archetype === hero.archetype))) {
                issues.push(`${hero.id}/${route} opening Event references a missing or foreign material`);
            }
            if (climax[0]?.climaxTiers?.map(tier => tier.multiplier).join(',') !== '2,4,10') {
                issues.push(`${hero.id}/${route} Climax tiers must be x2/x4/x10`);
            }
            let previousMaterialCount = 0;
            normalEvents.forEach((event, step) => {
                const expectedMaterials = step === 0 ? 1 : 2;
                const materialRequirement = event.requirements?.find(requirement => requirement.type === 'CARD_ON_BOARD');
                const resourceRequirement = event.requirements?.find(requirement =>
                    requirement.type === (hero.costResource === 'FP' ? 'FILLER_MIN' : 'STORY_MIN')
                );
                if (!materialRequirement || (materialRequirement.value || 0) < expectedMaterials) {
                    issues.push(`${event.id} requires fewer than ${expectedMaterials} progressive field materials`);
                }
                if ((materialRequirement?.value || 0) < previousMaterialCount || (materialRequirement?.value || 0) > 3) {
                    issues.push(`${event.id} has invalid progressive material escalation`);
                }
                previousMaterialCount = materialRequirement?.value || 0;
                if (!resourceRequirement) {
                    issues.push(`${event.id} lacks a ${hero.costResource || 'SP'} progression requirement`);
                }
            });
            const normalMaterialIds = new Set(normalEvents.flatMap(event =>
                event.requirements?.filter(requirement => requirement.type === 'CARD_ON_BOARD')
                    .flatMap(requirement => requirement.cardIds || []) || []
            ));
            const climaxOnlyReuse = normalMaterialIds.size && [...normalMaterialIds].filter(cardId =>
                CARDS[cardId]?.tags?.includes('climax-only')
            );
            if (climaxOnlyReuse && climaxOnlyReuse.length) {
                issues.push(`${hero.id}/${route} reuses climax-only material(s) in earlier Events: ${climaxOnlyReuse.join(', ')}`);
            }
            for (const finale of [...climax, ...plot]) {
                const materialRequirement = finale.requirements?.find(requirement => requirement.type === 'CARD_ON_BOARD');
                const resourceRequirement = finale.requirements?.find(requirement =>
                    requirement.type === (hero.costResource === 'FP' ? 'FILLER_MIN' : 'STORY_MIN')
                );
                if (!materialRequirement || (materialRequirement.value || 0) < 2) {
                    issues.push(`${finale.id} requires fewer than 2 finale field materials`);
                }
                if (!resourceRequirement) {
                    issues.push(`${finale.id} lacks a ${hero.costResource || 'SP'} finale requirement`);
                }
            }
        }
    }
}

if (decks.length !== V2_ARCHETYPES.length) issues.push(`Expected ${V2_ARCHETYPES.length} sample prebuilt decks, got ${decks.length}`);
for (const deck of decks) {
    if (deck.cards.length !== GAME_CONSTANTS.DECK_SIZE) issues.push(`${deck.id} has ${deck.cards.length} cards`);
    const lineCards = deck.cards.map(id => CARDS[id]).filter(Boolean);
    if (lineCards.some(card => card.type === CardType.PROTAGONIST || card.type === CardType.PLOT_TWIST_EVENT)) {
        issues.push(`${deck.id} includes avatar/Plot-Twist in its ${GAME_CONSTANTS.DECK_SIZE} cards`);
    }
    if (!lineCards.some(card => card.type === CardType.QUICK_EVENT)) {
        issues.push(`${deck.id} has no Quick Event actions`);
    }
    if (!lineCards.some(card => card.type === CardType.QUICK_EVENT && card.effects.some(effect => effect.type === 'SEARCH_CARD_TYPE' && effect.cardType === CardType.EVENT))) {
        issues.push(`${deck.id} has no Quick Event that searches normal Events`);
    }
    if (!lineCards.some(card => card.type === CardType.QUICK_EVENT && card.effects.some(effect => effect.type === 'RECOVER_FROM_CEMETERY'))) {
        issues.push(`${deck.id} has no Quick Event that recovers from Cementerio`);
    }
    if (lineCards.some(card => card.archetype !== deck.archetypeId || (card.protagonistId && card.protagonistId !== deck.protagonistId))) {
        issues.push(`${deck.id} mixes an incompatible route`);
    }
    if (!lineCards.some(card => card.type === CardType.CLIMAX_EVENT && card.protagonistId === deck.protagonistId)) {
        issues.push(`${deck.id} has no selected protagonist Climax`);
    }
}

console.log(JSON.stringify({ cards: cards.length, decks: decks.length, issues }, null, 2));
if (issues.length) process.exitCode = 1;
